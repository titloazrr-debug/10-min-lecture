import type { Book, Challenge, ChallengeAnswer, Data, Note, Session } from "./types.ts"

/** En dessous, on demande avant d’enregistrer, sans féliciter. */
export const MIN_SAVE_SECONDS = 60

export function uid(): string {
  return crypto.randomUUID()
}

export function parsePage(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const page = Number(trimmed)
  if (page < 1 || page > 200_000) return null
  return page
}

/** Page actuelle : entier à partir de 0. */
export function parseCurrentPage(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const page = Number(trimmed)
  if (page > 200_000) return null
  return page
}

export type NewBookFields = { title: string; author: string; page: string; total: string }

export type NewBookErrors = { title?: string; author?: string; page?: string; total?: string }

export function validateNewBook(input: NewBookFields):
  | { ok: true; title: string; author: string; currentPage: number; totalPages: number | null }
  | { ok: false; errors: NewBookErrors } {
  const errors: NewBookErrors = {}
  const title = input.title.trim()
  const author = input.author.trim()
  if (title === "") errors.title = "Il manque le titre du livre."
  if (author === "") errors.author = "Il manque l’auteur."
  const currentPage = parseCurrentPage(input.page)
  if (currentPage == null) errors.page = "La page actuelle doit être un entier, à partir de 0."
  let totalPages: number | null = null
  if (input.total.trim() !== "") {
    const total = parsePage(input.total)
    if (total == null) {
      errors.total = "Indique le nombre de pages, ou laisse ce champ vide."
    } else if (currentPage != null && total < currentPage) {
      errors.total = "Le nombre de pages doit être au moins égal à la page actuelle."
    } else {
      totalPages = total
    }
  }
  if (errors.title || errors.author || errors.page || errors.total) return { ok: false, errors }
  return { ok: true, title, author, currentPage: currentPage as number, totalPages }
}

export function parseOptionalPage(value: string): { ok: true; page: number | null } | { ok: false } {
  if (value.trim() === "") return { ok: true, page: null }
  const page = parsePage(value)
  if (page == null) return { ok: false }
  return { ok: true, page }
}

export function pageLabel(current: number, total: number | null): string {
  if (total == null) return `Page ${current}`
  return `Page ${current} sur ${total}`
}

export function pageFraction(current: number, total: number | null): number | null {
  if (total == null || total < 1) return null
  return Math.min(1, current / total)
}

export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = start.getDay()
  const mondayOffset = day === 0 ? 6 : day - 1
  start.setDate(start.getDate() - mondayOffset)
  return start
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function inRange(sessions: Session[], from: Date): Session[] {
  const fromTime = from.getTime()
  return sessions.filter((session) => new Date(session.endedAt).getTime() >= fromTime)
}

export function totals(sessions: Session[]): { count: number; seconds: number } {
  let seconds = 0
  for (const session of sessions) seconds += session.durationSec
  return { count: sessions.length, seconds }
}

export function sessionsForBook(sessions: Session[], bookId: string): Session[] {
  return sessions.filter((session) => session.bookId === bookId)
}

export function latestSession(sessions: Session[]): Session | null {
  let best: Session | null = null
  let bestTime = -Infinity
  for (const session of sessions) {
    const time = new Date(session.endedAt).getTime()
    if (time > bestTime) {
      best = session
      bestTime = time
    }
  }
  return best
}

export function orderedBooks(
  books: Book[],
  sessions: Session[],
  currentBookId: string | null,
): Book[] {
  const lastRead = new Map<string, number>()
  for (const session of sessions) {
    const time = new Date(session.endedAt).getTime()
    const previous = lastRead.get(session.bookId) ?? 0
    if (time > previous) lastRead.set(session.bookId, time)
  }
  return books.toSorted((a, b) => {
    if (a.id === currentBookId) return -1
    if (b.id === currentBookId) return 1
    const byRecent = (lastRead.get(b.id) ?? 0) - (lastRead.get(a.id) ?? 0)
    if (byRecent !== 0) return byRecent
    return a.title.localeCompare(b.title, "fr")
  })
}

export function notesForBook(
  notes: Note[],
  bookId: string | null,
  order: "recent" | "chrono" = "recent",
): Note[] {
  const filtered = bookId ? notes.filter((note) => note.bookId === bookId) : notes
  const sorted = filtered.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))
  return order === "chrono" ? sorted : sorted.toReversed()
}

export function resumePageLine(currentPage: number, totalPages: number | null): string {
  if (totalPages != null && currentPage >= totalPages) return "Tu as fini ce livre 🎉"
  return `Tu reprends à la page ${currentPage}.`
}

export function keptHighlights(notes: Note[], bookId: string): { shown: Note[]; extra: number } {
  const kept = notesForBook(notes, bookId).filter((note) => note.kind === "retenir")
  return { shown: kept.slice(0, 5), extra: Math.max(0, kept.length - 5) }
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const mm = String(minutes).padStart(2, "0")
  const ss = String(seconds).padStart(2, "0")
  if (hours > 0) return `${hours}:${mm}:${ss}`
  return `${mm}:${ss}`
}

export function formatCountdown(elapsedSeconds: number, total = 600): string {
  const left = Math.max(0, total - elapsedSeconds)
  const shown = left <= 0 ? 0 : Math.ceil(left - 1e-9)
  return formatClock(shown)
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  if (safe === 0) return "0 min"
  if (safe < 60) return `${safe} s`
  const minutes = Math.round(safe / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remain = minutes % 60
  if (remain === 0) return `${hours} h`
  return `${hours} h ${remain} min`
}

export function sessionsWord(count: number): string {
  return count === 1 ? "session" : "sessions"
}

export function relativeDay(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diff = Math.round((startNow - startDay) / 86_400_000)
  if (diff === 0) return "Aujourd’hui"
  if (diff === 1) return "Hier"
  if (diff > 1 && diff < 7) {
    const label = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(date)
    return label.charAt(0).toLocaleUpperCase("fr-FR") + label.slice(1)
  }
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(date)
}

export function lastSessionLine(session: Session, now = new Date()): string {
  return `${relativeDay(session.endedAt, now)} – ${formatDuration(session.durationSec)} – page ${session.pageAfter}`
}

export function weekRangeLabel(now = new Date()): string {
  const label = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(startOfWeek(now))
  return `Semaine du ${label}`
}

export function monthLabel(now = new Date()): string {
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(now)
  return label.charAt(0).toLocaleUpperCase("fr-FR") + label.slice(1)
}

export function formatNoteDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export type Closing =
  | { kind: "short" }
  | { kind: "finished"; title: string }
  | { kind: "progress"; minutes: number; page: number | null }

/** Vrai à partir du jour calendaire suivant, heure locale. Le jour même ne compte pas. */
export function challengeIsDue(challenge: Challenge | null | undefined, now = new Date()): boolean {
  if (!challenge || challenge.answered) return false
  const joined = new Date(challenge.joinedAt)
  if (Number.isNaN(joined.getTime())) return false
  if (now.getFullYear() !== joined.getFullYear()) return now.getFullYear() > joined.getFullYear()
  if (now.getMonth() !== joined.getMonth()) return now.getMonth() > joined.getMonth()
  return now.getDate() > joined.getDate()
}

export function applyChallengeAnswer(data: Data, answer: ChallengeAnswer): Data {
  if (!data.challenge || data.challenge.answered) return data
  return { ...data, challenge: { ...data.challenge, answered: true, answer } }
}

export function challengeReply(answer: ChallengeAnswer): string {
  if (answer === "non") return "Merci d’avoir essayé. Peut-être un autre livre ? Tout compte."
  return "Super. On remet ça ce soir ? 📖"
}

/** Phrase de fin, centrée sur le livre. Moins d’une minute reste une phrase courte. */
export function closingCopy(
  seconds: number,
  page: number | null,
  title: string,
  totalPages: number | null,
): Closing {
  if (page != null && totalPages != null && page >= totalPages) return { kind: "finished", title }
  if (seconds < MIN_SAVE_SECONDS) return { kind: "short" }
  return { kind: "progress", minutes: Math.max(1, Math.round(seconds / 60)), page }
}

export function encouragement(seconds: number): string {
  if (seconds < 3 * 60) return "Tu as ouvert le livre. C’est déjà le plus dur."
  if (seconds < 8 * 60) return "Quelques pages au calme. Le fil est repris."
  if (seconds < 15 * 60) return "Dix minutes de vraie lecture. Ça compte."
  if (seconds < 30 * 60) return "Tu es resté avec ton livre. Belle présence."
  return "Une longue session, sans te presser. Continue à ton rythme."
}

export function displayAuthor(author: string): string {
  return author.trim() || "Auteur non précisé"
}

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

const WEEK_LETTERS = ["L", "M", "M", "J", "V", "S", "D"]
const WEEK_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]

export type WeekDot = { label: string; name: string; read: boolean }

export function qualifyingDays(
  sessions: { startedAt: string; durationSec?: number | null }[],
  minMinutes: number,
): Set<string> {
  const seconds = new Map<string, number>()
  const timeless = new Set<string>()
  const floor = Math.max(0, minMinutes) * 60
  for (const session of sessions) {
    const start = new Date(session.startedAt)
    if (Number.isNaN(start.getTime())) continue
    const key = dayKey(start)
    if (typeof session.durationSec !== "number" || !Number.isFinite(session.durationSec)) {
      timeless.add(key)
      continue
    }
    seconds.set(key, (seconds.get(key) ?? 0) + session.durationSec)
  }
  const days = new Set<string>(timeless)
  for (const [key, total] of seconds) {
    if (total >= floor) days.add(key)
  }
  return days
}

export function weekReading(
  sessions: { startedAt: string; durationSec?: number | null }[],
  minMinutes: number,
  now = new Date(),
): { days: number; readToday: boolean; dots: WeekDot[] } {
  const qualified = qualifyingDays(sessions, minMinutes)
  const monday = startOfWeek(now)
  const today = dayKey(now)
  const dots = WEEK_LETTERS.map((label, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    const key = dayKey(date)
    return { label, name: WEEK_NAMES[index] ?? label, read: qualified.has(key) }
  })
  return {
    days: dots.filter((dot) => dot.read).length,
    readToday: qualified.has(today),
    dots,
  }
}

export function recentWeeks(
  sessions: { startedAt: string; durationSec?: number | null }[],
  minMinutes: number,
  now = new Date(),
  count = 8,
): { days: number; label: string }[] {
  const qualified = qualifyingDays(sessions, minMinutes)
  const current = startOfWeek(now)
  const weeks: { days: number; label: string }[] = []
  for (let index = count - 1; index >= 0; index -= 1) {
    const monday = new Date(current)
    monday.setDate(current.getDate() - index * 7)
    let days = 0
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + offset)
      if (qualified.has(dayKey(date))) days += 1
    }
    const label = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(monday)
    weeks.push({ days, label })
  }
  return weeks
}

export function backupAgeLabel(iso: string | null, now = new Date()): string {
  if (!iso) return "Dernière copie : aucune pour l’instant."
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return "Dernière copie : aucune pour l’instant."
  const days = Math.floor((startOfLocalDay(now) - startOfLocalDay(then)) / 86_400_000)
  if (days <= 0) return "Dernière copie : aujourd’hui."
  if (days === 1) return "Dernière copie : hier."
  return `Dernière copie : il y a ${days} jours.`
}

export function backupIsStale(iso: string | null, now = new Date()): boolean {
  if (!iso) return true
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return true
  return now.getTime() - then.getTime() > 30 * 86_400_000
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function parseReminderTime(value: string): string | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value.trim())
  if (!match) return null
  return `${match[1]}:${match[2]}`
}

const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]

export function reminderCalendar(time: string, days: number[], now = new Date()): string {
  const parsed = parseReminderTime(time)
  const chosen = [...new Set(days.filter((day) => day >= 1 && day <= 7))].sort((a, b) => a - b)
  if (!parsed || chosen.length === 0) throw new Error("Rappel incomplet")
  const [hours, minutes] = parsed.split(":").map(Number)
  const start = nextReminder(hours ?? 0, minutes ?? 0, chosen, now)
  const end = new Date(start.getTime() + 10 * 60 * 1000)
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
  const rule = chosen.map((day) => BYDAY[day - 1]).join(",")
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//10 Min Lecture//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:rappel@10-min-lecture",
    `DTSTAMP:${stamp}`,
    `DTSTART:${localStamp(start)}`,
    `DTEND:${localStamp(end)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${rule}`,
    "SUMMARY:10 min lecture",
    "DESCRIPTION:Ton livre t’attend.",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Ton livre t’attend.",
    "TRIGGER:PT0S",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  return `${lines.join("\r\n")}\r\n`
}

function nextReminder(hours: number, minutes: number, days: number[], now: Date): Date {
  for (let offset = 0; offset < 8; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hours, minutes, 0, 0)
    const weekday = date.getDay() === 0 ? 7 : date.getDay()
    if (!days.includes(weekday)) continue
    if (date.getTime() <= now.getTime()) continue
    return date
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, hours, minutes, 0, 0)
}

function localStamp(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${date.getFullYear()}${month}${day}T${hours}${minutes}00`
}
