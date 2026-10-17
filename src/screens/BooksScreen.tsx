import { useState } from "react"
import type { FormEvent } from "react"
import { orderedBooks, validateNewBook, type NewBookErrors } from "../logic.ts"
import { useStore } from "../store.tsx"
import type { Route } from "../types.ts"
import { BookListItem, Field } from "../ui.tsx"

export function BooksScreen({ go }: { go: (route: Route) => void }) {
  const { data } = useStore()
  const books = orderedBooks(data.books, data.sessions, data.currentBookId)

  return (
    <>
      <header className="topbar topbar-row">
        <div>
          <p className="eyebrow">Bibliothèque</p>
          <h1>Livres</h1>
        </div>
        <button type="button" className="btn btn-sage" onClick={() => go({ name: "add" })}>Ajouter</button>
      </header>
      <main className="screen">
        {books.length === 0 ? (
          <section className="card empty">
            <p>Aucun livre encore. Ajoute celui qui t’attend déjà.</p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => go({ name: "add" })}>
              Ajouter un livre
            </button>
          </section>
        ) : (
          <ul className="list">
            {books.map((book) => (
              <BookListItem
                key={book.id}
                book={book}
                current={book.id === data.currentBookId}
                onOpen={() => go({ name: "book", bookId: book.id })}
              />
            ))}
          </ul>
        )}
      </main>
    </>
  )
}

export function AddBookScreen({ go }: { go: (route: Route) => void }) {
  const { addBook } = useStore()
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [page, setPage] = useState("1")
  const [totalPages, setTotalPages] = useState("")
  const [errors, setErrors] = useState<NewBookErrors>({})

  function submit(event: FormEvent) {
    event.preventDefault()
    const result = validateNewBook({ title, author, page, total: totalPages })
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    const id = addBook({
      title: result.title,
      author: result.author,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
    })
    go({ name: "book", bookId: id })
  }

  return (
    <>
      <header className="topbar topbar-row">
        <button type="button" className="icon-btn" onClick={() => go({ name: "books" })} aria-label="Retour">
          ←
        </button>
        <h1>Nouveau livre</h1>
      </header>
      <main className="screen">
        <form className="card stack" onSubmit={submit} noValidate>
          <Field label="Titre" error={errors.title}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={180}
              autoFocus
              aria-invalid={errors.title ? true : undefined}
            />
          </Field>
          <Field label="Auteur" error={errors.author}>
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              maxLength={120}
              aria-invalid={errors.author ? true : undefined}
            />
          </Field>
          <Field label="Page actuelle" hint="La page où tu en es." error={errors.page}>
            <input
              inputMode="numeric"
              value={page}
              onChange={(event) => setPage(event.target.value)}
              aria-invalid={errors.page ? true : undefined}
            />
          </Field>
          <Field label="Nombre de pages" hint="Optionnel. Pour voir où tu en es dans le livre." error={errors.total}>
            <input
              inputMode="numeric"
              value={totalPages}
              onChange={(event) => setTotalPages(event.target.value)}
              aria-invalid={errors.total ? true : undefined}
            />
          </Field>
          <button type="submit" className="btn btn-primary btn-block">Ajouter le livre</button>
        </form>
      </main>
    </>
  )
}
