import { useEffect, useState } from "react"
import { AddBookScreen, BooksScreen } from "./screens/BooksScreen.tsx"
import { BookScreen } from "./screens/BookScreen.tsx"
import { HomeScreen } from "./screens/HomeScreen.tsx"
import { NotesScreen } from "./screens/NotesScreen.tsx"
import { SessionScreen } from "./screens/SessionScreen.tsx"
import { SettingsScreen } from "./screens/SettingsScreen.tsx"
import { StatsScreen } from "./screens/StatsScreen.tsx"
import { track, visitSource } from "./lib/track.ts"
import { weekReading } from "./logic.ts"
import { StoreProvider, useStore } from "./store.tsx"
import { clearActive, readActive } from "./timer.ts"
import type { Data, Route } from "./types.ts"
import { Nav } from "./ui.tsx"

const titles: Record<Route["name"], string> = {
  home: "10 Min Lecture",
  books: "Livres · 10 Min Lecture",
  book: "Livre · 10 Min Lecture",
  add: "Nouveau livre · 10 Min Lecture",
  session: "Lecture · 10 Min Lecture",
  notes: "Notes · 10 Min Lecture",
  stats: "Statistiques · 10 Min Lecture",
  settings: "Réglages · 10 Min Lecture",
}

function Shell() {
  const { data, problem } = useStore()
  const [route, setRoute] = useState<Route>(() => (problem ? { name: "home" } : routeForActive(data)))
  const hideNav = route.name === "session" || route.name === "add"

  useEffect(() => {
    document.title = titles[route.name]
  }, [route])

  useEffect(() => {
    const source = visitSource(window.location.search)
    track("visit", source ? { page: "/app", source } : { page: "/app" })
  }, [])

  if (problem) return <Recovery />

  return (
    <div className={hideNav ? "app-shell no-nav" : "app-shell"}>
      {route.name === "home" ? <HomeScreen go={setRoute} /> : null}
      {route.name === "books" ? <BooksScreen go={setRoute} /> : null}
      {route.name === "book" ? <BookScreen key={route.bookId} bookId={route.bookId} go={setRoute} /> : null}
      {route.name === "add" ? <AddBookScreen go={setRoute} /> : null}
      {route.name === "session" ? (
        <SessionScreen
          key={route.bookId}
          bookId={route.bookId}
          initialMode={route.mode}
          onClose={() => setRoute({ name: "home" })}
          onSwitchBook={(bookId) => setRoute({ name: "session", bookId })}
          onOpenNotes={() => setRoute({ name: "notes", bookId: route.bookId, order: "chrono" })}
        />
      ) : null}
      {route.name === "notes" ? (
        <NotesScreen
          key={`${route.bookId ?? "all"}-${route.order ?? "recent"}`}
          initialBookId={route.bookId}
          chronological={route.order === "chrono"}
        />
      ) : null}
      {route.name === "stats" ? <StatsScreen go={setRoute} /> : null}
      {route.name === "settings" ? <SettingsScreen go={setRoute} /> : null}
      {hideNav ? null : <Nav route={route} go={setRoute} />}
      <OpenPageReminder />
    </div>
  )
}

function routeForActive(data: Data): Route {
  const active = readActive()
  if (!active) return { name: "home" }
  if (!data.books.some((book) => book.id === active.bookId)) {
    clearActive()
    return { name: "home" }
  }
  return {
    name: "session",
    bookId: active.bookId,
    mode: active.targetMin === 10 ? "ten" : "open",
  }
}

function OpenPageReminder() {
  const { data } = useStore()
  const { enabled, time, days } = data.settings.reminder
  const daysKey = days.join(",")
  const minMinutes = data.settings.minMinutesPerDay
  const bookId = data.currentBookId
  useEffect(() => {
    if (!enabled || typeof Notification === "undefined" || Notification.permission !== "granted") return
    function tick() {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, "0")
      const minutes = String(now.getMinutes()).padStart(2, "0")
      if (`${hours}:${minutes}` !== time) return
      const weekday = now.getDay() === 0 ? 7 : now.getDay()
      if (!days.includes(weekday)) return
      if (weekReading(data.sessions, minMinutes, now).readToday) return
      const key = `dix-min-rappel-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
      const book = data.books.find((item) => item.id === bookId)
      const text = book
        ? `Ton livre t’attend 📖 — page ${book.currentPage} de ${book.title}`
        : "Ton livre t’attend 📖"
      void showReadingNotice(text)
    }
    tick()
    const id = window.setInterval(tick, 20_000)
    return () => window.clearInterval(id)
  }, [enabled, time, days, daysKey, minMinutes, bookId, data.sessions, data.books])
  return null
}

async function showReadingNotice(text: string) {
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.showNotification(text, { icon: "/icon-192.png", tag: "10ml-rappel" })
        return
      }
    }
  } catch {
    // Le constructeur Notification reste le repli si le service worker n’est pas prêt.
  }
  new Notification(text)
}

function Recovery() {
  const { problem } = useStore()
  if (!problem) return null
  const raw = problem.raw
  const message = problem.status === "quota"
    ? "On n’a pas assez de place pour une copie avant la mise à jour. Rien n’a été modifié. Télécharge ta copie de secours."
    : "On n’a pas pu mettre à jour tes données. Rien n’est perdu. Télécharge ta copie de secours."

  function download() {
    const blob = new Blob([raw], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "10-min-lecture-copie.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app-shell no-nav">
      <main className="screen">
        <section className="card stack">
          <h1>Tes données sont toujours là</h1>
          <p>{message}</p>
          <button type="button" className="btn btn-primary btn-block" onClick={download}>Télécharger une copie de secours</button>
        </section>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
