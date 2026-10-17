import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import {
  displayAuthor,
  formatDuration,
  latestSession,
  lastSessionLine,
  parseOptionalPage,
  parsePage,
  sessionsForBook,
  totals,
} from "../logic.ts"
import { useStore } from "../store.tsx"
import type { Route } from "../types.ts"
import { ResumePanel } from "./ResumePanel.tsx"
import { Field, PageMark } from "../ui.tsx"

export function BookScreen({ bookId, go }: { bookId: string; go: (route: Route) => void }) {
  const { data, updateBook, deleteBook, setCurrent, setShowRecap } = useStore()
  const book = data.books.find((item) => item.id === bookId)
  const [page, setPage] = useState(book ? String(book.currentPage) : "1")
  const [total, setTotal] = useState(book?.totalPages ? String(book.totalPages) : "")
  const [totalError, setTotalError] = useState("")
  const [title, setTitle] = useState(book?.title ?? "")
  const [author, setAuthor] = useState(book?.author ?? "")
  const [pageError, setPageError] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const id = window.setTimeout(() => setSaved(false), 1800)
    return () => window.clearTimeout(id)
  }, [saved])

  if (!book) {
    return (
      <main className="screen">
        <p>Ce livre n’est plus là.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={() => go({ name: "books" })}>Retour aux livres</button>
      </main>
    )
  }

  const current = book
  const bookSessions = sessionsForBook(data.sessions, current.id)
  const stats = totals(bookSessions)
  const last = latestSession(bookSessions)
  const parsed = parsePage(page)
  const parsedTotal = parseOptionalPage(total)
  const pageDirty = parsed !== null && parsed !== book.currentPage
  const totalDirty = !parsedTotal.ok || parsedTotal.page !== book.totalPages
  const isCurrent = data.currentBookId === book.id

  function savePage(event: FormEvent) {
    event.preventDefault()
    if (parsed == null) {
      setPageError("Indique un numéro de page.")
      return
    }
    setPageError("")
    updateBook(current.id, { currentPage: parsed })
    setSaved(true)
  }

  function saveTotal(event: FormEvent) {
    event.preventDefault()
    if (!parsedTotal.ok) {
      setTotalError("Indique le nombre de pages, ou laisse ce champ vide.")
      return
    }
    setTotalError("")
    updateBook(current.id, { totalPages: parsedTotal.page })
    setSaved(true)
  }

  function saveIdentity(event: FormEvent) {
    event.preventDefault()
    if (title.trim() === "") return
    updateBook(current.id, { title: title.trim(), author: author.trim() })
    setSaved(true)
  }

  function remove() {
    const confirmed = window.confirm("Retirer ce livre ? Ses sessions et ses notes seront aussi effacées.")
    if (!confirmed) return
    deleteBook(current.id)
    go({ name: "books" })
  }

  return (
    <>
      <header className="topbar">
        <button type="button" className="text-btn back" onClick={() => go({ name: "books" })}>← Livres</button>
        <p className="kicker">{isCurrent ? "Livre en cours" : "Livre"}</p>
        <h1 className="book-title">{book.title}</h1>
        <p className="author">{displayAuthor(book.author)}</p>
        <PageMark current={book.currentPage} total={book.totalPages} />
      </header>
      <main className="screen">
        {data.settings.showRecap ? (
          <ResumePanel
            book={current}
            notes={data.notes}
            onToggle={() => updateBook(current.id, { recapCollapsed: !current.recapCollapsed })}
            onHide={() => setShowRecap(false)}
            onStart={(mode) => go({ name: "session", bookId: current.id, mode })}
            onNotes={() => go({ name: "notes", bookId: current.id, order: "chrono" })}
          />
        ) : (
          <button type="button" className="btn btn-primary btn-block" onClick={() => go({ name: "session", bookId: book.id })}>
            Lire maintenant
          </button>
        )}

        <form className="card stack" onSubmit={savePage}>
          <Field label="Page actuelle" error={pageError}>
            <div className="stepper">
              <button
                type="button"
                className="icon-btn"
                aria-label="Page précédente"
                onClick={() => setPage(String(Math.max(1, (parsed ?? book.currentPage) - 1)))}
              >
                −
              </button>
              <input inputMode="numeric" value={page} onChange={(event) => setPage(event.target.value)} aria-label="Page actuelle" />
              <button
                type="button"
                className="icon-btn"
                aria-label="Page suivante"
                onClick={() => setPage(String((parsed ?? book.currentPage) + 1))}
              >
                +
              </button>
            </div>
          </Field>
          {pageDirty ? <button type="submit" className="btn btn-sage btn-block">Enregistrer la page</button> : null}
        </form>

        <form className="card stack" onSubmit={saveTotal}>
          <Field label="Nombre de pages" hint="Optionnel. Pour voir où tu en es dans le livre." error={totalError}>
            <input inputMode="numeric" value={total} onChange={(event) => setTotal(event.target.value)} />
          </Field>
          {totalDirty ? <button type="submit" className="btn btn-sage btn-block">Enregistrer le nombre de pages</button> : null}
        </form>
        {saved ? <p className="saved">Enregistré.</p> : null}

        <section className="card">
          <h2 className="section-label">Ce livre</h2>
          <div className="stat-row">
            <div className="stat">
              <strong>{formatDuration(stats.seconds)}</strong>
              <span>temps lu</span>
            </div>
            <div className="stat">
              <strong>{stats.count}</strong>
              <span>{stats.count === 1 ? "session" : "sessions"}</span>
            </div>
          </div>
          {last ? <p className="quiet">Dernière fois : {lastSessionLine(last)}</p> : <p className="quiet">Pas encore de session.</p>}
        </section>

        {isCurrent ? (
          <p className="pill static">Livre en cours</p>
        ) : (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setCurrent(book.id)}>
            Définir comme livre en cours
          </button>
        )}

        <button type="button" className="text-btn" onClick={() => go({ name: "notes", bookId: book.id })}>
          Voir les notes
        </button>

        <details className="fold">
          <summary>Modifier le titre ou l’auteur</summary>
          <form className="stack" onSubmit={saveIdentity}>
            <Field label="Titre">
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} />
            </Field>
            <Field label="Auteur">
              <input value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={120} />
            </Field>
            <button type="submit" className="btn btn-ghost btn-block" disabled={title.trim() === ""}>Enregistrer</button>
          </form>
        </details>

        <button type="button" className="text-btn danger" onClick={remove}>Retirer ce livre</button>
      </main>
    </>
  )
}
