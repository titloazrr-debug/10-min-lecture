export type Book = {
  id: string
  title: string
  author: string
  currentPage: number
  totalPages: number | null
  createdAt: string
  recapCollapsed: boolean
}

export type ReadingMode = "papier" | "ecran"

export type Session = {
  id: string
  bookId: string
  startedAt: string
  endedAt: string
  durationSec: number
  pageBefore: number
  pageAfter: number
  mode?: ReadingMode
}

export type NoteKind = "note" | "retenir"

export type Note = {
  id: string
  bookId: string
  sessionId: string | null
  kind: NoteKind
  text: string
  createdAt: string
  page: number | null
}

export type Reminder = {
  enabled: boolean
  /** Heure locale HH:MM. */
  time: string
  /** 1 = lundi … 7 = dimanche. */
  days: number[]
}

export type Settings = {
  /** Ancienne heure de rappel. Null si le rappel est éteint. */
  reminderTime: string | null
  showRecap: boolean
  weeklyGoalDays: number
  minMinutesPerDay: number
  reminder: Reminder
  analytics: boolean
  sessionMode: ReadingMode
  endSound: boolean
  endVibrate: boolean
}

export type Meta = {
  lastBackupAt: string | null
  firstSeenAt: string | null
  return7dSent: boolean
}

export type ChallengeAnswer = "oui" | "un peu" | "non"

export type Challenge = {
  joinedAt: string
  answered: boolean
  answer?: ChallengeAnswer
}

export type Data = {
  schemaVersion: 6
  books: Book[]
  sessions: Session[]
  notes: Note[]
  currentBookId: string | null
  settings: Settings
  meta: Meta
  challenge?: Challenge
}

export type Route =
  | { name: "home" }
  | { name: "books" }
  | { name: "book"; bookId: string }
  | { name: "add" }
  | { name: "session"; bookId: string; mode?: "ten" | "open" }
  | { name: "notes"; bookId?: string; order?: "chrono" }
  | { name: "stats" }
  | { name: "settings" }
