import { useRef, useState } from "react"
import type { ChangeEvent } from "react"
import { backupAgeLabel, parseReminderTime, reminderCalendar } from "../logic.ts"
import { countLine, exportDocument, listSnapshots, prepareImport } from "../storage.ts"
import { useStore } from "../store.tsx"
import type { Data, Reminder, Route } from "../types.ts"

export function SettingsScreen({ go }: { go: (route: Route) => void }) {
  const { data, replaceData, mergeImported, noteBackup, restoreSnapshot, setShowRecap, setAnalytics, setEndNotice, setWeeklyGoal, setReminder } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Data | null>(null)
  const [message, setMessage] = useState("")
  const [restoreKey, setRestoreKey] = useState<string | null>(null)
  const snapshots = listSnapshots()

  function download() {
    const stampedAt = new Date().toISOString()
    const file = exportDocument({ ...data, meta: { ...data.meta, lastBackupAt: stampedAt } }, new Date(stampedAt))
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `10-min-lecture-${stampedAt.slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    noteBackup(stampedAt)
    setPending(null)
    setMessage("Copie téléchargée.")
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const prepared = prepareImport(JSON.parse(String(reader.result)))
        if (!prepared.ok) {
          setPending(null)
          setMessage(prepared.message)
          return
        }
        setPending(prepared.data)
        setMessage("")
      } catch {
        setPending(null)
        setMessage("Ce fichier ne ressemble pas à une copie de secours.")
      }
    }
    reader.readAsText(file)
  }

  function apply(mode: "merge" | "replace") {
    if (!pending) return
    const ok = mode === "merge" ? mergeImported(pending) : replaceData(pending)
    if (!ok) {
      setMessage("On n’a pas assez de place pour une copie de sécurité. Télécharge tes données avant de continuer.")
      return
    }
    setPending(null)
    setMessage(mode === "merge" ? "Copie fusionnée." : "Copie importée.")
  }

  function restore() {
    if (!restoreKey) return
    if (!restoreSnapshot(restoreKey)) {
      setMessage("On n’a pas assez de place pour une copie de sécurité. Télécharge tes données avant de continuer.")
      return
    }
    setRestoreKey(null)
    setMessage("Version précédente restaurée.")
  }

  return (
    <>
      <header className="topbar topbar-row">
        <button type="button" className="icon-btn" onClick={() => go({ name: "stats" })} aria-label="Retour">←</button>
        <div>
          <p className="eyebrow">Réglages</p>
          <h1>Mes données</h1>
        </div>
      </header>
      <main className="screen">
        <section className="card stack">
          <h2 className="section-label">Lecture</h2>
          <label className="check-row">
            <input
              type="checkbox"
              checked={data.settings.showRecap}
              onChange={(event) => setShowRecap(event.target.checked)}
            />
            <span>Afficher « Avant de reprendre… »</span>
          </label>
          <p className="hint">Sur la fiche du livre : ta page, ta dernière note, et tes « À retenir ».</p>
          <label className="check-row">
            <input
              type="checkbox"
              checked={data.settings.analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
            />
            <span>Partager des statistiques anonymes</span>
          </label>
          <p className="hint">Des visites et des durées, jamais tes livres. <a href="/confidentialite">Confidentialité</a></p>
          <label className="check-row">
            <input
              type="checkbox"
              checked={data.settings.endSound}
              onChange={(event) => setEndNotice({ endSound: event.target.checked })}
            />
            <span>Son doux à la fin des 10 minutes</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={data.settings.endVibrate}
              onChange={(event) => setEndNotice({ endVibrate: event.target.checked })}
            />
            <span>Vibration à la fin des 10 minutes</span>
          </label>
          <p className="hint">Sur papier seulement. Si l’écran est verrouillé, le son peut ne pas jouer : la fin s’affiche au retour.</p>
        </section>
        <RhythmCard goal={data.settings.weeklyGoalDays} onGoal={setWeeklyGoal} />
        <ReminderCard reminder={data.settings.reminder} onChange={setReminder} />
        <section className="card stack">
          <p>Tes données restent sur cet appareil.</p>
          <p className="hint">{backupAgeLabel(data.meta.lastBackupAt)}</p>
          <button type="button" className="btn btn-sage btn-block" onClick={download}>Télécharger une copie de secours</button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => fileRef.current?.click()}>Importer une copie</button>
          <input ref={fileRef} className="file-input" type="file" accept="application/json,.json" onChange={onFile} />
          {pending ? (
            <>
              <p>{countLine(pending)}</p>
              <button type="button" className="btn btn-primary btn-block" onClick={() => apply("merge")}>Fusionner avec mes données</button>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => apply("replace")}>Tout remplacer</button>
              <button type="button" className="text-btn" onClick={() => setPending(null)}>Annuler</button>
            </>
          ) : null}
          {message ? <p className="saved">{message}</p> : null}
        </section>
        <section className="card stack">
          <h2 className="section-label">Revenir à la version d’avant la mise à jour</h2>
          {snapshots.length === 0 ? (
            <p className="quiet">Aucun instantané pour l’instant.</p>
          ) : (
            snapshots.map((snapshot) => (
              <button
                key={snapshot.key}
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => setRestoreKey(snapshot.key)}
              >
                {snapshot.label}
              </button>
            ))
          )}
          {restoreKey ? (
            <>
              <p>Cet instantané remplace les données actuelles. Une copie est prise juste avant.</p>
              <button type="button" className="btn btn-primary btn-block" onClick={restore}>Restaurer</button>
              <button type="button" className="text-btn" onClick={() => setRestoreKey(null)}>Annuler</button>
            </>
          ) : null}
        </section>
      </main>
    </>
  )
}

const DAY_LABELS = [
  { day: 1, short: "L", name: "lundi" },
  { day: 2, short: "M", name: "mardi" },
  { day: 3, short: "M", name: "mercredi" },
  { day: 4, short: "J", name: "jeudi" },
  { day: 5, short: "V", name: "vendredi" },
  { day: 6, short: "S", name: "samedi" },
  { day: 7, short: "D", name: "dimanche" },
]

function RhythmCard({ goal, onGoal }: { goal: number; onGoal: (days: number) => void }) {
  return (
    <section className="card stack">
      <h2 className="section-label">Mon rythme</h2>
      <p>Combien de jours par semaine veux-tu lire ?</p>
      <div className="goal-picks" role="group" aria-label="Jours par semaine">
        {DAY_LABELS.map((item, index) => {
          const days = index + 1
          return (
            <button
              key={item.name}
              type="button"
              aria-pressed={goal === days}
              aria-label={`${days} ${days === 1 ? "jour" : "jours"}`}
              onClick={() => onGoal(days)}
            >
              {days}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ReminderCard({ reminder, onChange }: { reminder: Reminder; onChange: (next: Reminder) => void }) {
  const [notice, setNotice] = useState("")
  const [calendarNote, setCalendarNote] = useState("")

  function toggleDay(day: number) {
    const next = reminder.days.includes(day)
      ? reminder.days.filter((item) => item !== day)
      : [...reminder.days, day].sort((a, b) => a - b)
    if (next.length === 0) return
    onChange({ ...reminder, days: next })
  }

  function onTime(value: string) {
    const parsed = parseReminderTime(value)
    if (!parsed) return
    onChange({ ...reminder, time: parsed })
  }

  function askNotification() {
    if (typeof Notification === "undefined") return
    void Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        setNotice("C’est noté. La notification part seulement si l’app est ouverte, et pas si tu as déjà lu aujourd’hui.")
        return
      }
      setNotice("Pas de souci, l’agenda fait aussi bien l’affaire.")
    })
  }

  function downloadCalendar() {
    const blob = new Blob([reminderCalendar(reminder.time, reminder.days)], { type: "text/calendar" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "10-min-lecture-rappel.ics"
    link.click()
    URL.revokeObjectURL(url)
    setCalendarNote("Fichier téléchargé. Ouvre-le pour l’ajouter à ton agenda.")
  }

  return (
    <section className="card stack">
      <h2 className="section-label">Rappel</h2>
      <label className="check-row">
        <input
          type="checkbox"
          checked={reminder.enabled}
          onChange={(event) => onChange({ ...reminder, enabled: event.target.checked })}
        />
        <span>Un petit rappel</span>
      </label>
      <label className="stack">
        <span className="hint">Heure</span>
        <input type="time" value={reminder.time} onChange={(event) => onTime(event.target.value)} />
      </label>
      <div className="day-picks" role="group" aria-label="Jours du rappel">
        {DAY_LABELS.map((item) => (
          <button
            key={item.name}
            type="button"
            aria-pressed={reminder.days.includes(item.day)}
            aria-label={item.name}
            onClick={() => toggleDay(item.day)}
          >
            {item.short}
          </button>
        ))}
      </div>
      {typeof Notification === "undefined" ? null : (
        <button type="button" className="btn btn-ghost btn-block" onClick={askNotification}>Activer les notifications</button>
      )}
      {notice ? <p className="hint">{notice}</p> : null}
      <button type="button" className="btn btn-sage btn-block" onClick={downloadCalendar}>Ajouter à mon agenda (.ics)</button>
      {calendarNote ? <p className="hint">{calendarNote}</p> : null}
      <p className="hint">Sur iPhone, les notifications marchent seulement si tu ajoutes l’app à l’écran d’accueil (iOS 16.4+). Sinon, l’agenda fonctionne très bien.</p>
    </section>
  )
}
