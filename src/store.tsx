import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { durationBucket, returnIsDue, track } from "./lib/track.ts"
import { applyChallengeAnswer, uid } from "./logic.ts"
import {
  DATA_KEY,
  emptyData,
  load,
  mergeData,
  prepareImport,
  readSnapshot,
  save,
  snapshotRaw,
  type StorageProblem,
} from "./storage.ts"
import type { Book, ChallengeAnswer, Data, NoteKind, ReadingMode, Reminder } from "./types.ts"

type NewBook = { title: string; author: string; currentPage: number; totalPages: number | null }

type NewSession = {
  bookId: string
  startedAt: string
  durationSec: number
  pageBefore: number
  pageAfter: number
  noteText: string
  noteKind: NoteKind
  mode?: ReadingMode
}

type Store = {
  data: Data
  addBook: (input: NewBook) => string
  updateBook: (id: string, patch: Partial<Pick<Book, "title" | "author" | "currentPage" | "totalPages" | "recapCollapsed">>) => void
  setShowRecap: (show: boolean) => void
  setAnalytics: (enabled: boolean) => void
  setSessionMode: (mode: ReadingMode) => void
  setEndNotice: (patch: { endSound?: boolean; endVibrate?: boolean }) => void
  answerChallenge: (answer: ChallengeAnswer) => void
  replaceData: (next: Data) => boolean
  mergeImported: (next: Data) => boolean
  noteBackup: (iso: string) => void
  restoreSnapshot: (key: string) => boolean
  problem: StorageProblem | null
  deleteBook: (id: string) => void
  setCurrent: (id: string) => void
  addSession: (input: NewSession) => void
  addNote: (input: { bookId: string; text: string; kind: NoteKind; page?: number | null }) => void
  deleteNote: (id: string) => void
  setWeeklyGoal: (days: number) => void
  setReminder: (reminder: Reminder) => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useState(() => load())[0]
  const [problem] = useState<StorageProblem | null>(initial.status === "ok" ? null : initial)
  const [data, setData] = useState<Data>(initial.status === "ok" ? initial.data : emptyData())
  const writtenRef = useRef(initial.status === "ok" ? JSON.stringify(initial.data) : "")

  useEffect(() => {
    if (problem) return
    const text = JSON.stringify(data)
    if (text === writtenRef.current) return
    save(data)
    writtenRef.current = text
  }, [data, problem])

  useEffect(() => {
    if (problem) return
    setData((current) => {
      if (current.meta.firstSeenAt) return current
      return { ...current, meta: { ...current.meta, firstSeenAt: new Date().toISOString() } }
    })
  }, [problem])

  useEffect(() => {
    if (problem || !returnIsDue(data.meta.firstSeenAt, data.meta.return7dSent)) return
    if (!data.settings.analytics || !track("return_7d")) return
    setData((current) => ({ ...current, meta: { ...current.meta, return7dSent: true } }))
  }, [problem, data.meta.firstSeenAt, data.meta.return7dSent, data.settings.analytics])

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== DATA_KEY) return
      const next = load()
      if (next.status !== "ok") return
      writtenRef.current = JSON.stringify(next.data)
      setData(next.data)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const api = useMemo<Store>(() => {
    function commit(next: Data): boolean {
      if (problem) return false
      const raw = localStorage.getItem(DATA_KEY) ?? JSON.stringify(data)
      if (!snapshotRaw(localStorage, raw, data.schemaVersion)) return false
      const text = JSON.stringify(next)
      writtenRef.current = text
      save(next)
      setData(next)
      return true
    }
    return {
    data,
    addBook(input) {
      const id = uid()
      const book: Book = {
        id,
        title: input.title.trim(),
        author: input.author.trim(),
        currentPage: input.currentPage,
        totalPages: input.totalPages,
        createdAt: new Date().toISOString(),
        recapCollapsed: false,
      }
      setData((current) => ({
        ...current,
        books: [book, ...current.books],
        currentBookId: current.currentBookId ?? id,
      }))
      return id
    },
    updateBook(id, patch) {
      setData((current) => ({
        ...current,
        books: current.books.map((book) => (book.id === id ? { ...book, ...patch } : book)),
      }))
    },
    replaceData(next) {
      return commit(next)
    },
    mergeImported(next) {
      return commit(mergeData(data, next))
    },
    noteBackup(iso) {
      setData((current) => ({ ...current, meta: { ...current.meta, lastBackupAt: iso } }))
    },
    restoreSnapshot(key) {
      const raw = readSnapshot(localStorage, key)
      if (!raw) return false
      try {
        const prepared = prepareImport(JSON.parse(raw))
        if (!prepared.ok) return false
        return commit(prepared.data)
      } catch {
        return false
      }
    },
    problem,
    deleteBook(id) {
      setData((current) => {
        const books = current.books.filter((book) => book.id !== id)
        const currentBookId = current.currentBookId === id ? books[0]?.id ?? null : current.currentBookId
        return {
          ...current,
          books,
          sessions: current.sessions.filter((session) => session.bookId !== id),
          notes: current.notes.filter((note) => note.bookId !== id),
          currentBookId,
        }
      })
    },
    setCurrent(id) {
      setData((current) => ({ ...current, currentBookId: id }))
    },
    setShowRecap(show) {
      setData((current) => ({ ...current, settings: { ...current.settings, showRecap: show } }))
    },
    setAnalytics(enabled) {
      setData((current) => ({ ...current, settings: { ...current.settings, analytics: enabled } }))
    },
    setSessionMode(mode) {
      setData((current) => ({ ...current, settings: { ...current.settings, sessionMode: mode } }))
    },
    setEndNotice(patch) {
      setData((current) => ({ ...current, settings: { ...current.settings, ...patch } }))
    },
    answerChallenge(answer) {
      let changed = false
      setData((current) => {
        const next = applyChallengeAnswer(current, answer)
        changed = next !== current
        return next
      })
      if (changed) track("challenge_answer", { answer })
    },
    addSession(input) {
      const ended = new Date()
      const sessionId = uid()
      const text = input.noteText.trim()
      setData((current) => ({
        ...current,
        sessions: [
          {
            id: sessionId,
            bookId: input.bookId,
            startedAt: input.startedAt,
            endedAt: ended.toISOString(),
            durationSec: input.durationSec,
            pageBefore: input.pageBefore,
            pageAfter: input.pageAfter,
            ...(input.mode ? { mode: input.mode } : {}),
          },
          ...current.sessions,
        ],
        books: current.books.map((book) => (
          book.id === input.bookId ? { ...book, currentPage: input.pageAfter } : book
        )),
        notes: text
          ? [
            {
              id: uid(),
              bookId: input.bookId,
              sessionId,
              kind: input.noteKind,
              text,
              page: input.pageAfter,
              createdAt: ended.toISOString(),
            },
            ...current.notes,
          ]
          : current.notes,
      }))
      track("session_finished", {
        durationBucket: durationBucket(input.durationSec),
        ...(input.mode ? { mode: input.mode } : {}),
      })
      if (text && (input.noteKind === "note" || input.noteKind === "retenir")) {
        track("note_added", { type: input.noteKind })
      }
    },
    addNote(input) {
      const text = input.text.trim()
      if (!text) return
      if (input.kind === "note" || input.kind === "retenir") track("note_added", { type: input.kind })
      setData((current) => ({
        ...current,
        notes: [
          {
            id: uid(),
            bookId: input.bookId,
            sessionId: null,
            kind: input.kind,
            text,
            page: input.page ?? null,
            createdAt: new Date().toISOString(),
          },
          ...current.notes,
        ],
      }))
    },
    deleteNote(id) {
      setData((current) => ({
        ...current,
        notes: current.notes.filter((note) => note.id !== id),
      }))
    },
    setWeeklyGoal(days) {
      const weeklyGoalDays = Math.min(7, Math.max(1, Math.round(days)))
      setData((current) => ({ ...current, settings: { ...current.settings, weeklyGoalDays } }))
    },
    setReminder(reminder) {
      setData((current) => ({
        ...current,
        settings: {
          ...current.settings,
          reminder,
          reminderTime: reminder.enabled ? reminder.time : null,
        },
      }))
    },
  }
  }, [data, problem])

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error("Store manquant")
  return store
}
