import {
  formatDuration,
  inRange,
  monthLabel,
  orderedBooks,
  pageLabel,
  sessionsForBook,
  sessionsWord,
  startOfMonth,
  recentWeeks,
  startOfWeek,
  totals,
  weekRangeLabel,
} from "../logic.ts"
import { useStore } from "../store.tsx"
import type { Route } from "../types.ts"

export function StatsScreen({ go }: { go: (route: Route) => void }) {
  const { data } = useStore()
  const now = new Date()
  const week = totals(inRange(data.sessions, startOfWeek(now)))
  const month = totals(inRange(data.sessions, startOfMonth(now)))
  const books = orderedBooks(data.books, data.sessions, data.currentBookId)
  const weeks = recentWeeks(data.sessions, data.settings.minMinutesPerDay, now)

  return (
    <>
      <header className="topbar">
        <p className="eyebrow">Au calme</p>
        <h1>Statistiques</h1>
      </header>
      <main className="screen">
        <PeriodCard title="Cette semaine" hint={weekRangeLabel(now)} count={week.count} seconds={week.seconds} />
        <PeriodCard title="Ce mois-ci" hint={monthLabel(now)} count={month.count} seconds={month.seconds} />
        <section className="card stack">
          <h2 className="section-label">Les dernières semaines</h2>
          <p className="hint">Chaque barre est une semaine. La plus récente est à droite.</p>
          <div className="week-bars">
            {weeks.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className={item.days === 0 ? "week-bar stub" : "week-bar"}
                style={item.days === 0 ? undefined : { height: `${Math.round((item.days / 7) * 72)}px` }}
                role="img"
                aria-label={`Semaine du ${item.label} : ${item.days} ${item.days === 1 ? "jour" : "jours"}`}
              />
            ))}
          </div>
        </section>
        <section className="stack">
          <h2 className="section-label">Par livre</h2>
          {books.length === 0 ? (
            <p className="quiet">Pas encore de livre.</p>
          ) : (
            <ul className="list">
              {books.map((book) => {
                const stats = totals(sessionsForBook(data.sessions, book.id))
                return (
                  <li key={book.id} className="card note">
                    <p className="book-row-title">{book.title}</p>
                    <p className="quiet">{pageLabel(book.currentPage, book.totalPages)} · {formatDuration(stats.seconds)} · {stats.count} {sessionsWord(stats.count)}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        <section className="card stack">
          <h2 className="section-label">Copie de secours</h2>
          <p className="quiet">Tes livres, tes notes et tes sessions restent sur cet appareil. La copie, l’import et les instantanés sont dans les réglages.</p>
          <button type="button" className="btn btn-sage btn-block" onClick={() => go({ name: "settings" })}>Mes données</button>
        </section>
        <p className="footer-note">Tes lectures restent sur cet appareil. Une copie te permet de les emmener ailleurs.</p>
      </main>
    </>
  )
}

function PeriodCard({
  title,
  hint,
  count,
  seconds,
}: {
  title: string
  hint: string
  count: number
  seconds: number
}) {
  return (
    <section className="card">
      <h2 className="section-label">{title}</h2>
      <p className="hint alone">{hint}</p>
      <div className="stat-row">
        <div className="stat">
          <strong>{formatDuration(seconds)}</strong>
          <span>temps de lecture</span>
        </div>
        <div className="stat">
          <strong>{count}</strong>
          <span>{sessionsWord(count)}</span>
        </div>
      </div>
    </section>
  )
}
