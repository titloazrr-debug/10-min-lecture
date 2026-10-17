import type { ReactNode } from "react"
import type { Book, Route } from "./types.ts"
import { displayAuthor, pageFraction, pageLabel } from "./logic.ts"

export function IconHome() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1v-9.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

export function IconBooks() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5V5.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 18.5A2.5 2.5 0 0 1 7.5 16H19" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function IconNotes() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.8h7.2L19 8.6V20a1.2 1.2 0 0 1-1.2 1.2H7A1.2 1.2 0 0 1 5.8 20V5A1.2 1.2 0 0 1 7 3.8Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M14 3.8V8.6H19M8.5 12.2h7M8.5 15.6h5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconStats() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19V10M12 19V5M19 19v-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

const navItems: { route: Route; label: string; icon: ReactNode }[] = [
  { route: { name: "home" }, label: "Accueil", icon: <IconHome /> },
  { route: { name: "books" }, label: "Livres", icon: <IconBooks /> },
  { route: { name: "notes" }, label: "Notes", icon: <IconNotes /> },
  { route: { name: "stats" }, label: "Stats", icon: <IconStats /> },
]

function navName(route: Route): Route["name"] {
  if (route.name === "book" || route.name === "add") return "books"
  return route.name
}

export function Nav({ route, go }: { route: Route; go: (next: Route) => void }) {
  return (
    <nav className="nav" aria-label="Navigation">
      {navItems.map((item) => {
        const active = navName(route) === item.route.name
        return (
          <button
            key={item.label}
            type="button"
            className={active ? "nav-btn active" : "nav-btn"}
            aria-current={active ? "page" : undefined}
            onClick={() => go(item.route)}
          >
            {item.icon}
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

export function BookListItem({
  book,
  current,
  onOpen,
}: {
  book: Book
  current: boolean
  onOpen: () => void
}) {
  return (
    <li>
      <button type="button" className="book-row" onClick={onOpen}>
        <span>
          <span className="book-row-title">{book.title}</span>
          <span className="book-row-meta">{displayAuthor(book.author)} · {pageLabel(book.currentPage, book.totalPages).toLowerCase()}</span>
        </span>
        {current ? <span className="pill">En cours</span> : null}
      </button>
    </li>
  )
}

export function PageMark({ current, total }: { current: number; total: number | null }) {
  const fraction = pageFraction(current, total)
  const label = pageLabel(current, total)
  return (
    <div>
      <p className="page-line">{label}</p>
      {fraction == null || total == null ? null : (
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={Math.min(current, total)}
          aria-label={label}
        >
          <span style={{ width: `${fraction * 100}%` }} />
        </div>
      )}
    </div>
  )
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <span className="hint error" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </label>
  )
}
