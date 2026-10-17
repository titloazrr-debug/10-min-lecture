import {
  backupIsStale,
  displayAuthor,
  formatDuration,
  inRange,
  lastSessionLine,
  latestSession,
  orderedBooks,
  sessionsWord,
  startOfWeek,
  totals,
  weekRangeLabel,
  weekReading,
} from "../logic.ts"
import { useStore } from "../store.tsx"
import type { Route } from "../types.ts"
import { ChallengeCard } from "./ChallengeCard.tsx"
import { BookListItem, PageMark } from "../ui.tsx"

export function HomeScreen({ go }: { go: (route: Route) => void }) {
  const { data } = useStore()
  const books = orderedBooks(data.books, data.sessions, data.currentBookId)
  const current = books.find((book) => book.id === data.currentBookId) ?? null
  const others = books.filter((book) => book.id !== current?.id)
  const last = latestSession(data.sessions)
  const lastBook = last ? data.books.find((book) => book.id === last.bookId) : undefined
  const week = totals(inRange(data.sessions, startOfWeek(new Date())))

  return (
    <>
      <header className="topbar">
        <p className="eyebrow">Lire maintenant</p>
        <h1>10 Min Lecture</h1>
        <p className="lede">Quelques pages de lecture pour vous détendre.</p>
      </header>
      <main className="screen">
        <ChallengeCard />
        {current ? (
          <section className="card hero">
            <p className="kicker">En cours</p>
            <h2 className="book-title">
              <button type="button" className="linkish" onClick={() => go({ name: "book", bookId: current.id })}>
                {current.title}
              </button>
            </h2>
            <p className="author">{displayAuthor(current.author)}</p>
            <PageMark current={current.currentPage} total={current.totalPages} />
            <button type="button" className="btn btn-primary btn-block" onClick={() => go({ name: "session", bookId: current.id })}>
              Lire maintenant
            </button>
          </section>
        ) : (
          <section className="card empty">
            <h2 className="book-title">Aucun livre sur la table de chevet pour l’instant.</h2>
            <p>Ajoute un livre que tu possèdes déjà. Dix minutes suffisent pour le rouvrir.</p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => go({ name: "add" })}>
              Ajouter un livre
            </button>
          </section>
        )}

        <WeekCard />

        {last ? (
          <section className="card">
            <h2 className="section-label">Dernière session</h2>
            <p className="session-line">
              {lastSessionLine(last)}
              {lastBook && last.bookId !== current?.id ? ` · ${lastBook.title}` : ""}
            </p>
          </section>
        ) : null}

        {current ? (
          <section className="card">
            <h2 className="section-label">Temps de lecture</h2>
            <p className="hint alone">{weekRangeLabel()}</p>
            <div className="stat-row">
              <div className="stat">
                <strong>{formatDuration(week.seconds)}</strong>
                <span>temps de lecture</span>
              </div>
              <div className="stat">
                <strong>{week.count}</strong>
                <span>{sessionsWord(week.count)}</span>
              </div>
            </div>
          </section>
        ) : null}

        {current ? (
          <section className="stack">
            <h2 className="section-label">Tes autres livres</h2>
            {others.length > 0 ? (
              <ul className="list">
                {others.slice(0, 5).map((book) => (
                  <BookListItem key={book.id} book={book} current={false} onOpen={() => go({ name: "book", bookId: book.id })} />
                ))}
              </ul>
            ) : (
              <p className="quiet">Un seul livre pour l’instant.</p>
            )}
            <button type="button" className="text-btn" onClick={() => go({ name: "books" })}>Tous les livres</button>
          </section>
        ) : null}

        {books.length + data.notes.length + data.sessions.length > 0 && backupIsStale(data.meta.lastBackupAt) ? (
          <button type="button" className="text-btn" onClick={() => go({ name: "settings" })}>
            Pense à faire une copie de secours de temps en temps.
          </button>
        ) : null}
        <p className="footer-note">Tes lectures restent sur cet appareil.</p>
      </main>
    </>
  )
}

function WeekCard() {
  const { data } = useStore()
  const week = weekReading(data.sessions, data.settings.minMinutesPerDay)
  const goal = data.settings.weeklyGoalDays
  const reached = week.days >= goal
  const dayWord = week.days === 1 ? "jour" : "jours"
  const goalWord = goal === 1 ? "jour" : "jours"

  return (
    <section className="card stack">
      <h2 className="section-label">Cette semaine</h2>
      {week.days === 0 ? (
        <p className="session-line">Une nouvelle semaine commence. 10 minutes suffisent.</p>
      ) : (
        <p className="session-line">Tu as lu <strong>{week.days} {dayWord}</strong> cette semaine</p>
      )}
      <div className="week-dots">
        {week.dots.map((dot) => (
          <span key={dot.name} className={dot.read ? "week-dot read" : "week-dot"} aria-label={dot.read ? `${dot.name}, lu` : dot.name}>
            {dot.label}
          </span>
        ))}
      </div>
      <p className="hint">Objectif : {goal} {goalWord}{reached ? " ✓" : ""}</p>
      {reached ? <p className="session-line">Objectif de la semaine atteint 🌿</p> : null}
    </section>
  )
}
