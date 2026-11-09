import { useEffect, useRef, useState } from "react"
import { track } from "../lib/track.ts"
import { formatClock } from "../logic.ts"
import {
  episodeIsRead,
  findEpisode,
  isLocked,
  nextEpisode,
  recapNs,
  recapStartsOpen,
  scrollPercent,
  serialProgressLabel,
  storyHref,
  wantsTenMinuteSession,
  type SerialIndexItem,
  type SerialMeta,
} from "../serial/catalog.ts"
import { loadSerialIndex, loadSerialMeta, loadSerialText } from "../serial/load.ts"
import { renderMarkdown } from "../serial/markdown.ts"
import { useStore } from "../store.tsx"
import { clearActive, elapsedMs, pauseActive, readActive, resumeActive, writeActive } from "../timer.ts"
import { Paywall } from "./Paywall.tsx"

export function SerialCatalog() {
  const [items, setItems] = useState<SerialIndexItem[] | null>(null)
  useEffect(() => {
    void loadSerialIndex().then(setItems)
  }, [])
  useEffect(() => {
    document.title = "Histoires · 10 min lecture"
  }, [])
  return (
    <main className="site-main">
      <h1>Histoires</h1>
      <p className="site-lede">Des séries à lire 10 minutes à la fois. Les deux premiers chapitres sont libres.</p>
      {items == null ? <p className="hint">On ouvre le catalogue…</p> : items.length === 0 ? (
        <p>Aucune histoire pour le moment.</p>
      ) : (
        <div className="story-grid">
          {items.map((item) => (
            <a key={item.slug} className="story-card" href={storyHref(item.slug)}>
              <span className="story-cover" aria-hidden="true">{item.title.slice(0, 1)}</span>
              <span className="story-card-body">
                <strong>{item.title}</strong>
                <span className="hint">{item.author}</span>
                <span>{item.pitch}</span>
                <span className="story-meta">{item.estimatedTime} · {item.chapterCount} chapitres · {item.status === "ongoing" ? "en cours" : "terminé"}</span>
              </span>
            </a>
          ))}
        </div>
      )}
      <p className="footer-note"><a href="/decouvrir">Trouver une histoire</a> · <a href="/app">Ouvrir l’app</a></p>
    </main>
  )
}

export function SerialToc({ slug }: { slug: string }) {
  const store = useStore()
  const storeRef = useRef(store)
  storeRef.current = store
  const { data } = store
  const [meta, setMeta] = useState<SerialMeta | null | "missing">(null)

  useEffect(() => {
    let alive = true
    void loadSerialMeta(slug).then((next) => {
      if (!alive) return
      if (!next) {
        setMeta("missing")
        return
      }
      setMeta(next)
      storeRef.current.ensureSerial(next)
    })
    return () => { alive = false }
  }, [slug])

  useEffect(() => {
    if (meta && meta !== "missing") document.title = `${meta.title} · 10 min lecture`
    if (meta === "missing") document.title = "Feuilleton introuvable · 10 min lecture"
  }, [meta])

  if (meta === "missing") {
    return (
      <main className="site-main">
        <h1>Ce feuilleton n’existe pas (encore).</h1>
        <p className="site-lede"><a href="/histoires">Retour au catalogue</a></p>
      </main>
    )
  }
  if (!meta) {
    return (
      <main className="site-main">
        <p className="hint">On prépare le sommaire…</p>
      </main>
    )
  }

  const book = data.books.find((item) => item.source === "feuilleton" && item.slug === slug)
  const started = (book?.progress?.percent ?? 0) > 0 || (book?.episodesRead?.length ?? 0) > 0
  const resumeN = Math.min(book?.progress?.episode ?? 1, meta.freeUntil)
  const resumeHref = started ? storyHref(slug, resumeN) : storyHref(slug, 1)
  const resumeLabel = started ? `Reprendre le chapitre ${resumeN}` : "Commencer les 10 premières minutes"

  return (
    <main className="site-main serial-toc">
      <p className="kicker">{meta.genre} · {meta.author}</p>
      <h1>{meta.title}</h1>
      <p className="site-lede">{meta.summary || meta.pitch}</p>
      <p className="hint">{meta.estimatedTime} · {meta.chapterCount} chapitres · {meta.status === "ongoing" ? "en cours" : "terminé"}</p>
      {book ? <p className="hint">{serialProgressLabel(book)}</p> : null}
      <p>
        <a className="btn btn-primary" href={`${resumeHref}?session=10`}>{resumeLabel}</a>
      </p>
      <h2>Sommaire</h2>
      <ol className="serial-episodes">
        {meta.episodes.map((episode) => {
          const locked = isLocked(episode.n, meta.freeUntil)
          const read = book ? episodeIsRead(book.episodesRead ?? [], episode.n, book.progress?.episode === episode.n ? book.progress.percent : 0) : false
          const current = book?.progress?.episode === episode.n && !read && (book.progress?.percent ?? 0) > 0
          return (
            <li key={episode.n}>
              {locked ? (
                <span>{episode.n}. {episode.title} 🔒</span>
              ) : (
                <a href={storyHref(slug, episode.n)}>
                  {episode.n}. {episode.title}
                  {read ? " · ✓ lu" : current ? " · en cours" : ""}
                </a>
              )}
            </li>
          )
        })}
      </ol>
      <p className="footer-note"><a href="/histoires">Catalogue</a> · <a href="/decouvrir">Découvrir</a> · <a href="/app">Ouvrir l’app</a></p>
    </main>
  )
}

export function SerialReader({ slug, episode: n }: { slug: string; episode: number }) {
  const store = useStore()
  const storeRef = useRef(store)
  storeRef.current = store
  const { data, setReaderPrefs, problem } = store
  const [meta, setMeta] = useState<SerialMeta | null | "missing">(null)
  const [html, setHtml] = useState<string | null>(null)
  const [recapHtml, setRecapHtml] = useState<{ n: number; title: string; html: string }[]>([])
  const [recapOpen, setRecapOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [resumeNote, setResumeNote] = useState(false)
  const [atEnd, setAtEnd] = useState(false)
  const [tick, setTick] = useState(0)
  const articleRef = useRef<HTMLElement | null>(null)
  const restored = useRef(false)
  const started = useRef(false)
  const bookIdRef = useRef<string | null>(null)

  const prefs = data.readerPrefs
  const book = data.books.find((item) => item.source === "feuilleton" && item.slug === slug)
  if (book) bookIdRef.current = book.id

  useEffect(() => {
    let alive = true
    restored.current = false
    started.current = false
    void (async () => {
      const next = await loadSerialMeta(slug)
      if (!alive) return
      if (!next) {
        setMeta("missing")
        return
      }
      setMeta(next)
      const id = storeRef.current.ensureSerial(next)
      bookIdRef.current = id
      const stored = storeRef.current.data.books.find((item) => item.id === id)
      const entry = findEpisode(next, n)
      if (!entry) {
        setHtml("")
        return
      }
      if (isLocked(n, next.freeUntil)) {
        setHtml("locked")
        return
      }
      const text = await loadSerialText(slug, entry.file)
      if (!alive) return
      if (text == null) {
        setHtml("")
        return
      }
      setHtml(renderMarkdown(text))
      const read = stored?.episodesRead ?? []
      const ns = recapNs(read, n)
      const recaps: { n: number; title: string; html: string }[] = []
      for (const recapN of ns) {
        const episode = findEpisode(next, recapN)
        if (!episode?.recap) continue
        const recapText = await loadSerialText(slug, episode.recap)
        if (recapText) recaps.push({ n: recapN, title: episode.title, html: renderMarkdown(recapText) })
      }
      if (!alive) return
      setRecapHtml(recaps)
      setRecapOpen(recaps.length > 0 && recapStartsOpen(stored?.progress?.updatedAt))
      if (stored?.progress?.episode === n && stored.progress.percent >= 5 && stored.progress.percent < 90) {
        setResumeNote(true)
      }
    })()
    return () => { alive = false }
  }, [slug, n])

  useEffect(() => {
    if (meta && meta !== "missing") {
      const title = findEpisode(meta, n)?.title
      document.title = title ? `${title} · ${meta.title}` : meta.title
    }
  }, [meta, n])

  useEffect(() => {
    if (!html || html === "locked" || !book || started.current) return
    started.current = true
    track("serial_ep_start", { slug, n })
    if (wantsTenMinuteSession(window.location.search) && !problem) {
      const active = readActive()
      if (!active || active.bookId === book.id) {
        writeActive({
          bookId: book.id,
          mode: "ecran",
          startedAt: active?.bookId === book.id ? active.startedAt : Date.now(),
          pausedAt: null,
          pausedTotalMs: active?.bookId === book.id ? active.pausedTotalMs : 0,
          targetMin: 10,
          continued: active?.bookId === book.id ? active.continued : false,
          signaled: active?.bookId === book.id ? active.signaled : false,
        })
        track("session_started", { first: false, mode: "ecran" })
      }
    }
  }, [html, book, slug, n, problem])

  useEffect(() => {
    if (!html || html === "locked" || restored.current || !articleRef.current || !book) return
    if (book.progress?.episode !== n) {
      restored.current = true
      setReady(true)
      return
    }
    const range = articleRef.current.scrollHeight - articleRef.current.clientHeight
    articleRef.current.scrollTop = (book.progress.percent / 100) * Math.max(0, range)
    restored.current = true
    setReady(true)
  }, [html, book, n])

  useEffect(() => {
    const node = articleRef.current
    if (!node || !html || html === "locked") return
    function persist(markRead: boolean) {
      const id = bookIdRef.current
      if (!articleRef.current || !id) return
      const range = articleRef.current.scrollHeight - articleRef.current.clientHeight
      const percent = scrollPercent(articleRef.current.scrollTop, range)
      storeRef.current.saveSerialProgress(id, n, percent, markRead || percent >= 90)
      if (percent >= 90) setAtEnd(true)
    }
    function onScroll() {
      persist(false)
    }
    function onHide() {
      if (document.visibilityState === "hidden") persist(false)
    }
    const id = window.setInterval(() => persist(false), 2000)
    node.addEventListener("scroll", onScroll, { passive: true })
    document.addEventListener("visibilitychange", onHide)
    return () => {
      window.clearInterval(id)
      node.removeEventListener("scroll", onScroll)
      document.removeEventListener("visibilitychange", onHide)
      persist(false)
    }
  }, [html, n])

  useEffect(() => {
    if (!book) return
    const id = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [book])

  if (meta === "missing") {
    return (
      <main className="site-main">
        <h1>Ce feuilleton n’existe pas (encore).</h1>
        <p><a href="/histoires">Retour aux histoires</a></p>
      </main>
    )
  }
  if (meta && findEpisode(meta, n) == null) {
    return (
      <main className="site-main">
        <h1>Cet épisode n’est pas encore disponible.</h1>
        <p><a href={storyHref(slug)}>Retour au sommaire</a></p>
      </main>
    )
  }
  if (html === "locked" && meta) {
    return (
      <main className="site-main">
        <p className="kicker">{meta.title}</p>
        <h1>Chapitre {n} verrouillé</h1>
        <p className="site-lede">Les deux premiers chapitres sont libres. La suite s’ouvre ici.</p>
        <Paywall slug={slug} buyUrl={meta.buyUrl} />
        <p className="footer-note"><a href={storyHref(slug)}>Retour à la fiche</a></p>
      </main>
    )
  }
  if (html === "") {
    return (
      <main className="site-main">
        <h1>Cet épisode n’est pas encore disponible.</h1>
        <p><a href={storyHref(slug)}>Retour au sommaire</a></p>
      </main>
    )
  }
  if (!meta || html == null) {
    return (
      <main className="site-main">
        <p className="hint">On ouvre l’épisode…</p>
      </main>
    )
  }

  const entry = findEpisode(meta, n)
  const following = nextEpisode(meta, n)
  const active = book ? readActive() : null
  const serialTimer = active && book && active.bookId === book.id ? active : null
  const elapsed = serialTimer ? elapsedMs(serialTimer) : 0
  const tenUp = serialTimer?.targetMin === 10 && elapsed >= 600_000 && !serialTimer.continued
  void tick

  function markFinished() {
    const id = bookIdRef.current
    if (!id) return
    storeRef.current.saveSerialProgress(id, n, 100, true)
    track("serial_ep_finish", { slug, n })
    setAtEnd(true)
  }

  return (
    <div className="serial-shell" data-theme={prefs.theme}>
      <header className="serial-bar">
        <a href={storyHref(slug)}>← {meta.title}</a>
        {serialTimer ? (
          <SerialPill
            elapsedMs={elapsed}
            paused={serialTimer.pausedAt != null}
            onPause={() => writeActive(pauseActive(serialTimer))}
            onResume={() => writeActive(resumeActive(serialTimer))}
          />
        ) : null}
        <details className="serial-prefs">
          <summary>Réglages</summary>
          <div className="stack">
            <p>Taille</p>
            <div className="serial-picks">
              {([1, 2, 3, 4, 5] as const).map((size) => (
                <button key={size} type="button" aria-pressed={prefs.fontSize === size} onClick={() => setReaderPrefs({ fontSize: size })}>
                  {size}
                </button>
              ))}
            </div>
            <p>Thème</p>
            <div className="serial-picks">
              {([["clair", "Clair"], ["sepia", "Sépia"], ["sombre", "Nuit"]] as const).map(([value, label]) => (
                <button key={value} type="button" aria-pressed={prefs.theme === value} onClick={() => setReaderPrefs({ theme: value })}>
                  {label}
                </button>
              ))}
            </div>
            <p>Interligne</p>
            <div className="serial-picks">
              {([["serre", "Serré"], ["normal", "Normal"], ["aere", "Aéré"]] as const).map(([value, label]) => (
                <button key={value} type="button" aria-pressed={prefs.lineHeight === value} onClick={() => setReaderPrefs({ lineHeight: value })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </details>
      </header>

      {tenUp ? (
        <div className="card stack serial-banner">
          <p>10 minutes, bravo. Tu peux t’arrêter là, ou finir l’épisode.</p>
          <button type="button" className="btn btn-ghost" onClick={() => { markFinished(); clearActive(); window.location.href = storyHref(slug) }}>
            Je m’arrête là
          </button>
          <button type="button" className="btn btn-primary" onClick={() => writeActive({ ...serialTimer!, continued: true, signaled: true })}>
            Finir l’épisode
          </button>
        </div>
      ) : null}

      {recapHtml.length > 0 ? (
        <section className="card stack resume">
          <button type="button" className="resume-head" aria-expanded={recapOpen} onClick={() => setRecapOpen((open) => !open)}>
            <span>Précédemment dans {meta.title}…</span>
            <span aria-hidden="true">{recapOpen ? "▾" : "▸"}</span>
          </button>
          {recapOpen ? (
            <>
              {recapHtml.map((item) => (
                <div key={item.n}>
                  <p className="kicker">Épisode {item.n} · {item.title}</p>
                  <div className="serial-recap" dangerouslySetInnerHTML={{ __html: item.html }} />
                </div>
              ))}
              <button type="button" className="btn btn-primary" onClick={() => setRecapOpen(false)}>C’est bon, je lis</button>
              <button type="button" className="btn btn-ghost" onClick={() => setRecapOpen(false)}>Passer</button>
            </>
          ) : null}
        </section>
      ) : null}

      {resumeNote ? <p className="hint serial-banner">On reprend où tu t’étais arrêté.</p> : null}

      <div className="serial-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(book?.progress?.episode === n ? book.progress.percent : 0)}>
        <span style={{ width: `${book?.progress?.episode === n ? book.progress.percent : 0}%` }} />
      </div>

      <article
        ref={articleRef}
        className="serial-prose"
        data-size={prefs.fontSize}
        data-leading={prefs.lineHeight}
        data-ready={ready ? "1" : "0"}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <footer className="serial-end stack">
        <button type="button" className="btn btn-ghost" onClick={markFinished}>J’ai fini cet épisode</button>
        {atEnd || (book && episodeIsRead(book.episodesRead ?? [], n, book.progress?.episode === n ? book.progress.percent : 0)) ? (
          n >= meta.freeUntil ? (
            <Paywall slug={slug} buyUrl={meta.buyUrl} />
          ) : following && !isLocked(following.n, meta.freeUntil) ? (
            <div className="stack">
              <p>Fin du chapitre {n}. Tu veux savoir ce qui se passe ensuite ?</p>
              <a className="btn btn-primary" href={storyHref(slug, following.n)} onClick={() => { markFinished() }}>
                Chapitre suivant →
              </a>
            </div>
          ) : (
            <Paywall slug={slug} buyUrl={meta.buyUrl} />
          )
        ) : null}
        <p className="footer-note"><a href={storyHref(slug)}>Sommaire</a> · {entry?.title}</p>
      </footer>
    </div>
  )
}

function SerialPill({
  elapsedMs: ms,
  paused,
  onPause,
  onResume,
}: {
  elapsedMs: number
  paused: boolean
  onPause: () => void
  onResume: () => void
}) {
  const left = Math.max(0, 600 - Math.floor(ms / 1000))
  return (
    <span className="serial-pill">
      <span>{paused ? "Pause" : formatClock(left)}</span>
      <button type="button" className="text-btn" onClick={paused ? onResume : onPause}>{paused ? "Reprendre" : "Pause"}</button>
    </span>
  )
}
