import { useState } from "react"
import type { FormEvent } from "react"
import { displayAuthor, formatNoteDate, notesForBook, orderedBooks } from "../logic.ts"
import { useStore } from "../store.tsx"
import type { NoteKind } from "../types.ts"
import { Field } from "../ui.tsx"

export function NotesScreen({ initialBookId, chronological }: { initialBookId?: string; chronological?: boolean }) {
  const { data, addNote, deleteNote } = useStore()
  const books = orderedBooks(data.books, data.sessions, data.currentBookId)
  const [bookId, setBookId] = useState(initialBookId && books.some((book) => book.id === initialBookId)
    ? initialBookId
    : books[0]?.id ?? "")
  const [text, setText] = useState("")
  const [kind, setKind] = useState<NoteKind>("note")
  const [filter, setFilter] = useState(initialBookId ?? "all")
  const notes = notesForBook(data.notes, filter === "all" ? null : filter, chronological ? "chrono" : "recent")

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!bookId || text.trim() === "") return
    addNote({ bookId, text, kind })
    setText("")
  }

  function remove(id: string) {
    const confirmed = window.confirm("Supprimer cette note ?")
    if (!confirmed) return
    deleteNote(id)
  }

  return (
    <>
      <header className="topbar">
        <p className="eyebrow">À garder</p>
        <h1>Notes</h1>
      </header>
      <main className="screen">
        {books.length === 0 ? (
          <section className="card empty">
            <p>Ajoute d’abord un livre. Les notes s’y rattachent.</p>
          </section>
        ) : (
          <form className="card stack" onSubmit={submit}>
            <Field label="Livre">
              <select value={bookId} onChange={(event) => setBookId(event.target.value)}>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>{book.title}</option>
                ))}
              </select>
            </Field>
            <div className="segmented" role="group" aria-label="Type de note">
              <button type="button" aria-pressed={kind === "note"} onClick={() => setKind("note")}>Note</button>
              <button type="button" aria-pressed={kind === "retenir"} onClick={() => setKind("retenir")}>À retenir</button>
            </div>
            <Field label="Texte">
              <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder="Une phrase suffit." />
            </Field>
            <button type="submit" className="btn btn-primary btn-block" disabled={text.trim() === ""}>Ajouter</button>
          </form>
        )}

        {books.length > 0 ? (
          <Field label="Afficher">
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">Tous les livres</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>{book.title}</option>
              ))}
            </select>
          </Field>
        ) : null}

        {notes.length === 0 ? (
          <p className="quiet">Rien pour l’instant. Une phrase après la lecture suffit.</p>
        ) : (
          <ul className="list" data-order={chronological ? "chrono" : "recent"}>
            {notes.map((note) => {
              const book = data.books.find((item) => item.id === note.bookId)
              return (
                <li key={note.id} className="card note">
                  <div className="note-meta">
                    <span className={note.kind === "retenir" ? "badge badge-keep" : "badge"}>
                      {note.kind === "retenir" ? "À retenir" : "Note"}
                    </span>
                    <span>{note.page == null ? "" : `p. ${note.page} · `}{formatNoteDate(note.createdAt)}</span>
                  </div>
                  <p>{note.text}</p>
                  <p className="quiet">{book ? `${book.title} · ${displayAuthor(book.author)}` : ""}</p>
                  <button type="button" className="text-btn danger" onClick={() => remove(note.id)}>Supprimer</button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </>
  )
}
