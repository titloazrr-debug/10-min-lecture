import { displayAuthor, keptHighlights, notesForBook, resumePageLine } from "../logic.ts"
import type { Book, Note } from "../types.ts"

export function ResumePanel({
  book,
  notes,
  onToggle,
  onHide,
  onStart,
  onNotes,
}: {
  book: Book
  notes: Note[]
  onToggle: () => void
  onHide: () => void
  onStart: (mode: "ten" | "open") => void
  onNotes: () => void
}) {
  const bookNotes = notesForBook(notes, book.id)
  const last = bookNotes[0] ?? null
  const kept = keptHighlights(notes, book.id)
  const open = !book.recapCollapsed

  return (
    <section className="card stack resume">
      <button type="button" className="resume-head" aria-expanded={open} onClick={onToggle}>
        <span>Avant de reprendre…</span>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <>
          <p className="quiet">{book.title} — {displayAuthor(book.author)}</p>
          <p>{resumePageLine(book.currentPage, book.totalPages)}</p>
          {last ? (
            <p className="clamp-2">
              {last.page == null
                ? `Ta dernière note : ${last.text}`
                : `Ta dernière note (p. ${last.page}) : ${last.text}`}
            </p>
          ) : null}
          {kept.shown.length > 0 ? (
            <div className="stack">
              <p className="section-label">📌 À retenir</p>
              <ul className="retenir-list">
                {kept.shown.map((note) => (
                  <li key={note.id} className="clamp-2">
                    {note.page == null ? note.text : `p. ${note.page} — ${note.text}`}
                  </li>
                ))}
              </ul>
              {kept.extra > 0 ? <p className="hint">+{kept.extra} autres</p> : null}
            </div>
          ) : null}
          {last ? (
            <button type="button" className="text-btn" onClick={onNotes}>Voir mes notes →</button>
          ) : null}
          <button type="button" className="text-btn" onClick={onHide}>Ne plus afficher ce panneau</button>
        </>
      ) : null}
      <button type="button" className="btn btn-primary btn-block" onClick={() => onStart("ten")}>10 minutes</button>
      <button type="button" className="btn btn-ghost btn-block" onClick={() => onStart("open")}>Temps libre</button>
    </section>
  )
}
