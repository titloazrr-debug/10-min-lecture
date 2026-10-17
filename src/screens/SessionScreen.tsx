import { useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"
import {
  closingCopy,
  displayAuthor,
  formatClock,
  formatCountdown,
  MIN_SAVE_SECONDS,
  orderedBooks,
  parsePage,
} from "../logic.ts"
import { track } from "../lib/track.ts"
import { useStore } from "../store.tsx"
import {
  clearActive,
  elapsedMs,
  pauseActive,
  playEndChime,
  readActive,
  resumeActive,
  TEN_MINUTES_MS,
  vibrateEnd,
  writeActive,
  type ActiveSession,
} from "../timer.ts"
import type { NoteKind, ReadingMode } from "../types.ts"
import { ResumePanel } from "./ResumePanel.tsx"
import { Field } from "../ui.tsx"

type Phase = "prep" | "ask" | "advice" | "active" | "timeup" | "recap" | "short"
type DurationMode = "ten" | "open"

export function SessionScreen({
  bookId,
  onClose,
  onSwitchBook,
  onOpenNotes,
  initialMode,
}: {
  bookId: string
  onClose: () => void
  onSwitchBook: (bookId: string) => void
  onOpenNotes: () => void
  initialMode?: DurationMode
}) {
  const { data, addSession, updateBook, setShowRecap, setSessionMode } = useStore()
  const book = data.books.find((item) => item.id === bookId)
  const restored = useRef(readActive())
  const initial = restored.current?.bookId === bookId ? restored.current : null
  const [session, setSession] = useState<ActiveSession | null>(initial)
  const [now, setNow] = useState(() => Date.now())
  const [phase, setPhase] = useState<Phase>(() => openingPhase(initial, initialMode))
  const [duration, setDuration] = useState<DurationMode>(initialDuration(initial, initialMode))
  const [note, setNote] = useState("")
  const [kind, setKind] = useState<NoteKind>("note")
  const [pageAfter, setPageAfter] = useState(book ? String(book.currentPage) : "1")
  const [pageError, setPageError] = useState("")
  const [finalSeconds, setFinalSeconds] = useState(0)
  const pageBefore = useRef(book?.currentPage ?? 1)
  const saved = useRef(false)
  const pendingChime = useRef(false)
  const settings = data.settings

  useEffect(() => {
    if (phase !== "active" || !session || session.pausedAt != null) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [phase, session])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      setNow(Date.now())
      if (!pendingChime.current) return
      pendingChime.current = false
      if (settings.endSound) playEndChime()
      if (settings.endVibrate) vibrateEnd()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [settings.endSound, settings.endVibrate])

  useEffect(() => {
    if (phase !== "timeup" || !session) return
    if (session.pausedAt == null || !session.signaled) {
      const paused = pauseActive({ ...session, signaled: true })
      writeActive(paused)
      setSession(paused)
    }
    if (!session.signaled) cueEnd(session.mode)
    // Reprise d’une session déjà arrivée au bout : une seule fois, au chargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== "active" || !session || session.continued || session.targetMin !== 10) return
    if (session.pausedAt != null) return
    if (elapsedMs(session, now) < TEN_MINUTES_MS) return
    const paused = pauseActive({ ...session, signaled: true })
    writeActive(paused)
    setSession(paused)
    setPhase("timeup")
    cueEnd(paused.mode)
  }, [now, phase, session])

  useEffect(() => {
    if (phase === "prep" || phase === "ask" || phase === "advice") return
    const onBefore = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", onBefore)
    return () => window.removeEventListener("beforeunload", onBefore)
  }, [phase])

  function notice() {
    if (!settings.endSound && !settings.endVibrate) return
    if (settings.endSound) playEndChime()
    if (settings.endVibrate) vibrateEnd()
  }

  function cueEnd(mode: ReadingMode) {
    if (mode !== "papier") return
    if (document.visibilityState !== "visible") {
      pendingChime.current = true
      return
    }
    notice()
  }

  function commit(next: ActiveSession) {
    writeActive(next)
    setSession(next)
    setNow(Date.now())
  }

  if (!book) {
    return (
      <main className="screen">
        <p>Ce livre n’est plus là.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={onClose}>Retour</button>
      </main>
    )
  }

  const current = book
  const reading = session?.mode ?? settings.sessionMode
  const seconds = session ? elapsedMs(session, now) / 1000 : 0
  const countingDown = session ? session.targetMin === 10 && !session.continued : duration === "ten"
  const clock = countingDown ? formatCountdown(seconds) : formatClock(seconds)

  function chooseDuration(next: DurationMode) {
    setDuration(next)
    setPhase("ask")
  }

  function chooseReading(mode: ReadingMode) {
    setSessionMode(mode)
    if (mode === "papier") setPhase("advice")
    else launch(mode)
  }

  function launch(mode: ReadingMode) {
    pageBefore.current = current.currentPage
    track("session_started", { first: data.sessions.length === 0, mode })
    commit({
      bookId: current.id,
      mode,
      startedAt: Date.now(),
      pausedAt: null,
      pausedTotalMs: 0,
      targetMin: duration === "ten" ? 10 : null,
      continued: false,
      signaled: false,
    })
    setPhase("active")
  }

  function goRecap() {
    const frozen = session ? pauseActive(session) : null
    if (frozen) commit(frozen)
    const elapsed = frozen ? Math.max(0, Math.round(elapsedMs(frozen) / 1000)) : 0
    setFinalSeconds(elapsed)
    setPhase(elapsed < MIN_SAVE_SECONDS ? "short" : "recap")
  }

  function keepGoing() {
    if (!session) return
    commit(resumeActive({ ...session, continued: true }))
    setPhase("active")
  }

  function pauseNow() {
    if (!session) return
    commit(pauseActive(session))
  }

  function resumeNow() {
    if (!session) return
    commit(resumeActive(session))
  }

  function leaveQuietly() {
    clearActive()
    onClose()
  }

  function saveSession(event: FormEvent) {
    event.preventDefault()
    if (saved.current || !session) return
    const nextPage = parsePage(pageAfter)
    if (nextPage == null) {
      setPageError("Indique un numéro de page.")
      return
    }
    saved.current = true
    clearActive()
    addSession({
      bookId: current.id,
      startedAt: new Date(session.startedAt).toISOString(),
      durationSec: finalSeconds,
      pageBefore: pageBefore.current,
      pageAfter: nextPage,
      noteText: note,
      noteKind: kind,
      mode: session.mode,
    })
    onClose()
  }

  function back() {
    if (phase === "advice") setPhase("ask")
    else if (phase === "ask" && !initialMode) setPhase("prep")
    else onClose()
  }

  if ((phase === "active" || phase === "timeup") && reading === "papier" && session) {
    return (
      <PaperStage
        clock={clock}
        paused={session.pausedAt != null && phase === "active"}
        timeup={phase === "timeup"}
        onPause={pauseNow}
        onResume={resumeNow}
        onContinue={keepGoing}
        onFinish={goRecap}
        onDiscard={leaveQuietly}
      />
    )
  }

  if ((phase === "active" || phase === "timeup") && session) {
    return (
      <ScreenStage
        clock={clock}
        paused={session.pausedAt != null && phase === "active"}
        timeup={phase === "timeup"}
        onPause={pauseNow}
        onResume={resumeNow}
        onContinue={keepGoing}
        onFinish={goRecap}
        onDiscard={leaveQuietly}
      />
    )
  }

  return (
    <>
      <header className="topbar topbar-row">
        {phase === "recap" ? (
          <span className="icon-spacer" />
        ) : (
          <button type="button" className="icon-btn" onClick={back} aria-label="Retour">←</button>
        )}
        <div>
          <p className="kicker">{book.title}</p>
          <p className="author">{displayAuthor(book.author)}</p>
        </div>
      </header>
      <main className="screen session-stage">
        {phase === "prep" ? (
          <>
            {data.settings.showRecap ? (
              <ResumePanel
                book={current}
                notes={data.notes}
                onToggle={() => updateBook(current.id, { recapCollapsed: !current.recapCollapsed })}
                onHide={() => setShowRecap(false)}
                onStart={chooseDuration}
                onNotes={onOpenNotes}
              />
            ) : (
              <div>
                <h1>Lire maintenant</h1>
                <p className="page-line">
                  {book.totalPages == null
                    ? `Tu en es à la page ${book.currentPage}.`
                    : `Tu en es à la page ${book.currentPage} sur ${book.totalPages}.`}
                </p>
              </div>
            )}
            {data.books.length > 1 ? (
              <Field label="Livre">
                <select value={book.id} onChange={(event) => onSwitchBook(event.target.value)}>
                  {orderedBooks(data.books, data.sessions, data.currentBookId).map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
              </Field>
            ) : null}
            {data.settings.showRecap ? null : (
              <>
                <button type="button" className="choice choice-main" onClick={() => chooseDuration("ten")}>
                  <span className="choice-title">10 minutes</span>
                  <span className="choice-help">Un cadre court, puis tu t’arrêtes.</span>
                </button>
                <button type="button" className="choice choice-quiet" onClick={() => chooseDuration("open")}>
                  <span className="choice-title">Temps libre</span>
                  <span className="choice-help">Sans limite. Tu termines quand tu veux.</span>
                </button>
              </>
            )}
          </>
        ) : null}

        {phase === "ask" ? (
          <div className="stack">
            <h1>Tu lis comment aujourd’hui ?</h1>
            <button
              type="button"
              className="choice choice-main"
              aria-pressed={settings.sessionMode === "papier"}
              onClick={() => chooseReading("papier")}
            >
              <span className="choice-title">📖 Je lis sur papier</span>
            </button>
            <button
              type="button"
              className="choice"
              aria-pressed={settings.sessionMode === "ecran"}
              onClick={() => chooseReading("ecran")}
            >
              <span className="choice-title">📱 Je lis à l’écran</span>
            </button>
          </div>
        ) : null}

        {phase === "advice" ? (
          <section className="card stack">
            <p>Petit conseil : retourne ton téléphone ou active Ne pas déranger. On te prévient à la fin.</p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => launch("papier")}>C’est parti</button>
          </section>
        ) : null}

        {phase === "recap" ? (
          <form className="stack" onSubmit={saveSession}>
            <ClosingLine seconds={finalSeconds} pageText={pageAfter} title={book.title} totalPages={book.totalPages} />
            <Field label="Tu en es à quelle page ?" error={pageError}>
              <input inputMode="numeric" value={pageAfter} onChange={(event) => setPageAfter(event.target.value)} />
            </Field>
            <NoteFields note={note} kind={kind} onNote={setNote} onKind={setKind} />
            <button type="submit" className="btn btn-primary btn-block">Enregistrer</button>
            <button type="button" className="text-btn danger" onClick={leaveQuietly}>Ne pas enregistrer</button>
          </form>
        ) : null}

        {phase === "short" ? (
          <div className="stack">
            <h1>Quelques instants</h1>
            <p>Quelques instants avec ton livre, c’est déjà un pas.</p>
            <p>Tu veux l’enregistrer ?</p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => setPhase("recap")}>Enregistrer</button>
            <button type="button" className="text-btn" onClick={leaveQuietly}>Ne pas enregistrer</button>
          </div>
        ) : null}
      </main>
    </>
  )
}

function initialDuration(session: ActiveSession | null, mode?: DurationMode): DurationMode {
  if (session) return session.targetMin === 10 ? "ten" : "open"
  return mode ?? "ten"
}

function openingPhase(session: ActiveSession | null, initialMode?: DurationMode): Phase {
  if (!session) return initialMode ? "ask" : "prep"
  if (session.targetMin === 10 && !session.continued && elapsedMs(session) >= TEN_MINUTES_MS) return "timeup"
  return "active"
}

function ClosingLine({
  seconds,
  pageText,
  title,
  totalPages,
}: {
  seconds: number
  pageText: string
  title: string
  totalPages: number | null
}) {
  const page = parsePage(pageText)
  const closing = closingCopy(seconds, page, title, totalPages)
  if (closing.kind === "finished") {
    return <p className="closing">Tu as fini <strong>{closing.title}</strong>. Bravo, vraiment.</p>
  }
  if (closing.kind === "short") {
    return <p className="closing">Quelques instants avec ton livre, c’est déjà un pas.</p>
  }
  const unit = closing.minutes === 1 ? "minute" : "minutes"
  return (
    <p className="closing">
      Tu as pris <strong>{closing.minutes} {unit}</strong> pour ton livre.
      {closing.page != null ? <> Tu en es <strong>page {closing.page}</strong>.</> : null}
    </p>
  )
}

function PaperStage({
  clock,
  paused,
  timeup,
  onPause,
  onResume,
  onContinue,
  onFinish,
  onDiscard,
}: {
  clock: string
  paused: boolean
  timeup: boolean
  onPause: () => void
  onResume: () => void
  onContinue: () => void
  onFinish: () => void
  onDiscard: () => void
}) {
  return (
    <div className="paper-stage">
      <p className="paper-clock" role="timer">{timeup ? "00:00" : clock}</p>
      {paused ? (
        <>
          <p className="paper-note">La lecture est en pause.</p>
          <div className="paper-actions">
            <button type="button" className="quiet-btn" onClick={onResume}>Reprendre</button>
            <button type="button" className="quiet-btn" onClick={onFinish}>Terminer</button>
            <button type="button" className="quiet-btn" onClick={onDiscard}>Ne pas enregistrer</button>
          </div>
        </>
      ) : timeup ? (
        <>
          <p className="paper-note">Les 10 minutes sont passées.</p>
          <div className="paper-actions">
            <button type="button" className="quiet-btn" onClick={onContinue}>Continuer</button>
            <button type="button" className="quiet-btn" onClick={onFinish}>J’arrête là</button>
          </div>
        </>
      ) : (
        <div className="paper-actions">
          <button type="button" className="quiet-btn" onClick={onPause}>Pause</button>
          <button type="button" className="quiet-btn" onClick={onFinish}>Terminer</button>
        </div>
      )}
    </div>
  )
}

function ScreenStage({
  clock,
  paused,
  timeup,
  onPause,
  onResume,
  onContinue,
  onFinish,
  onDiscard,
}: {
  clock: string
  paused: boolean
  timeup: boolean
  onPause: () => void
  onResume: () => void
  onContinue: () => void
  onFinish: () => void
  onDiscard: () => void
}) {
  return (
    <main className="screen screen-stage">
      <p className="time-pill" role="timer">{timeup ? "00:00" : clock}</p>
      {paused ? <p className="quiet">En pause</p> : <span />}
      {paused ? (
        <div className="screen-actions">
          <button type="button" className="quiet-btn" onClick={onResume}>Reprendre</button>
          <button type="button" className="quiet-btn" onClick={onFinish}>Terminer</button>
          <button type="button" className="quiet-btn" onClick={onDiscard}>Ne pas enregistrer</button>
        </div>
      ) : timeup ? (
        <div className="screen-actions">
          <button type="button" className="quiet-btn" onClick={onContinue}>Continuer</button>
          <button type="button" className="quiet-btn" onClick={onFinish}>J’arrête là</button>
        </div>
      ) : (
        <div className="screen-actions">
          <button type="button" className="quiet-btn" onClick={onPause}>Pause</button>
          <button type="button" className="quiet-btn" onClick={onFinish}>Terminer</button>
        </div>
      )}
    </main>
  )
}

function NoteFields({
  note,
  kind,
  onNote,
  onKind,
}: {
  note: string
  kind: NoteKind
  onNote: (value: string) => void
  onKind: (value: NoteKind) => void
}) {
  return (
    <div className="stack">
      <div className="segmented" role="group" aria-label="Type de note">
        <button type="button" aria-pressed={kind === "note"} onClick={() => onKind("note")}>Note</button>
        <button type="button" aria-pressed={kind === "retenir"} onClick={() => onKind("retenir")}>À retenir</button>
      </div>
      <Field label="Note">
        <textarea
          value={note}
          onChange={(event) => onNote(event.target.value)}
          maxLength={2000}
          placeholder="Une phrase suffit."
        />
      </Field>
    </div>
  )
}
