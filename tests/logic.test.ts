import assert from "node:assert/strict"
import { test } from "node:test"
import {
  backupAgeLabel,
  backupIsStale,
  encouragement,
  formatClock,
  formatCountdown,
  formatDuration,
  inRange,
  keptHighlights,
  lastSessionLine,
  notesForBook,
  orderedBooks,
  pageFraction,
  MIN_SAVE_SECONDS,
  pageLabel,
  parseOptionalPage,
  parsePage,
  parseReminderTime,
  resumePageLine,
  validateNewBook,
  qualifyingDays,
  recentWeeks,
  relativeDay,
  reminderCalendar,
  weekReading,
  startOfMonth,
  startOfWeek,
  totals,
} from "../src/logic.ts"
import { normalize } from "../src/storage.ts"
import type { Session } from "../src/types.ts"

test("parsePage accepte un entier positif", () => {
  assert.equal(parsePage("42"), 42)
  assert.equal(parsePage("01"), 1)
  assert.equal(parsePage("0"), null)
  assert.equal(parsePage("1.5"), null)
  assert.equal(parsePage(""), null)
  assert.deepEqual(parseOptionalPage(""), { ok: true, page: null })
  assert.deepEqual(parseOptionalPage("96"), { ok: true, page: 96 })
  assert.deepEqual(parseOptionalPage("0"), { ok: false })
  assert.equal(pageLabel(48, null), "Page 48")
  assert.equal(pageLabel(48, 96), "Page 48 sur 96")
  assert.equal(pageFraction(48, 96), 0.5)
  assert.equal(pageFraction(120, 96), 1)
  assert.equal(pageFraction(12, null), null)
})

test("la semaine commence le lundi", () => {
  const friday = new Date(2026, 9, 16, 15, 30, 0)
  assert.equal(friday.getDay(), 5)
  const start = startOfWeek(friday)
  assert.equal(start.getFullYear(), 2026)
  assert.equal(start.getMonth(), 9)
  assert.equal(start.getDate(), 12)
  assert.equal(start.getHours(), 0)
  const sunday = new Date(2026, 9, 18, 23, 0, 0)
  assert.equal(startOfWeek(sunday).getDate(), 12)
  assert.equal(startOfMonth(friday).getDate(), 1)
})

test("les sessions sont filtrées et additionnées", () => {
  const now = new Date(2026, 9, 16, 15, 0, 0)
  const start = startOfWeek(now)
  const sessions: Session[] = [
    session("avant", new Date(start.getTime() - 1000), 120),
    session("dedans", new Date(start.getTime() + 1000), 600),
  ]
  const week = inRange(sessions, start)
  assert.deepEqual(week.map((item) => item.id), ["dedans"])
  assert.deepEqual(totals(week), { count: 1, seconds: 600 })
})

test("le livre en cours reste en tête", () => {
  const books = [
    { id: "a", title: "Zèbre", author: "", currentPage: 1, totalPages: null, createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "b", title: "Abeille", author: "", currentPage: 3, totalPages: 200, createdAt: "2026-01-02T00:00:00.000Z" },
  ]
  const ordered = orderedBooks(books, [], "b")
  assert.deepEqual(ordered.map((book) => book.id), ["b", "a"])
})

test("les durées et le compte à rebours", () => {
  assert.equal(formatClock(0), "00:00")
  assert.equal(formatClock(75), "01:15")
  assert.equal(formatClock(3661), "1:01:01")
  assert.equal(formatCountdown(0), "10:00")
  assert.equal(formatCountdown(599.1), "00:01")
  assert.equal(formatCountdown(600), "00:00")
  assert.equal(formatDuration(0), "0 min")
  assert.equal(formatDuration(45), "45 s")
  assert.equal(formatDuration(12 * 60), "12 min")
  assert.equal(formatDuration(2 * 3600 + 5 * 60), "2 h 5 min")
})

test("la dernière session se lit en français", () => {
  const now = new Date(2026, 9, 16, 18, 0, 0)
  const yesterday = session("hier", new Date(2026, 9, 15, 21, 0, 0), 12 * 60)
  yesterday.pageAfter = 87
  assert.equal(lastSessionLine(yesterday, now), "Hier – 12 min – page 87")
  assert.equal(relativeDay(now.toISOString(), now), "Aujourd’hui")
})

test("le message suit la durée", () => {
  assert.match(encouragement(60), /ouvert le livre/)
  assert.match(encouragement(10 * 60), /Dix minutes/)
  assert.match(encouragement(40 * 60), /longue session/)
})

test("les données invalides sont ignorées", () => {
  const data = normalize({
    version: 1,
    books: [
      { id: "b1", title: "Dune", author: "Herbert", currentPage: 12, totalPages: 600, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "b2", title: "Sans total", author: "", currentPage: 3, createdAt: "2026-01-01T00:00:00.000Z" },
    ],
    sessions: [
      { id: "s1", bookId: "b1", startedAt: "2026-01-01T00:00:00.000Z", endedAt: "2026-01-01T00:10:00.000Z", durationSec: 600, pageBefore: 12, pageAfter: 18 },
      { id: "s2", bookId: "absent", startedAt: "2026-01-01T00:00:00.000Z", endedAt: "2026-01-01T00:10:00.000Z", durationSec: 600, pageBefore: 1, pageAfter: 2 },
    ],
    notes: [{ id: "n1", bookId: "b1", kind: "retenir", text: "Le désert", createdAt: "2026-01-01T00:00:00.000Z" }],
    currentBookId: "missing",
  })
  assert.equal(data.books.length, 2)
  assert.equal(data.books[0]?.totalPages, 600)
  assert.equal(data.books[1]?.totalPages, null)
  assert.equal(data.sessions.length, 1)
  assert.equal(data.notes.length, 1)
  assert.equal(data.currentBookId, "b1")
  assert.equal(data.schemaVersion, 6)
  assert.equal(data.settings.sessionMode, "papier")
  assert.equal(data.settings.endSound, false)
  assert.equal(data.settings.reminderTime, null)
  assert.equal(data.settings.weeklyGoalDays, 3)
  assert.equal(data.settings.reminder.enabled, false)
  const withReminder = normalize({ ...data, reminderTime: "21:15" })
  assert.equal(withReminder.settings.reminderTime, "21:15")
  assert.equal(withReminder.settings.reminder.enabled, false)
  assert.equal(withReminder.settings.reminder.time, "20:30")
  assert.equal(normalize({ reminderTime: "25:99" }).settings.reminderTime, null)
})

test("une session de moins d’une minute n’est pas une lecture gardée", () => {
  assert.equal(MIN_SAVE_SECONDS, 60)
  assert.equal(20 < MIN_SAVE_SECONDS, true)
})

test("un jour de lecture additionne les sessions du jour de début", () => {
  const now = new Date(2026, 9, 16, 18, 0, 0)
  const morning = at(new Date(2026, 9, 16, 8, 0, 0), 90)
  const evening = at(new Date(2026, 9, 16, 21, 0, 0), 90)
  const short = at(new Date(2026, 9, 15, 10, 0, 0), 60)
  const timeless = { startedAt: new Date(2026, 9, 14, 10, 0, 0).toISOString() }
  const late = at(new Date(2026, 9, 13, 23, 50, 0), 180)
  const days = qualifyingDays([morning, evening, short, timeless, late], 2)
  assert.equal(days.size, 3)
  const friday = weekReading([morning, evening, short], 2, now)
  assert.equal(friday.days, 1)
  assert.equal(friday.readToday, true)
  const todayIndex = weekdayIndex(now)
  assert.equal(friday.dots[todayIndex]?.read, true)
  assert.equal(friday.dots[todayIndex]?.label, ["L", "M", "M", "J", "V", "S", "D"][todayIndex])
  assert.equal(weekReading([short], 2, new Date(2026, 9, 15, 18, 0, 0)).days, 0)
  assert.equal(weekReading([timeless], 2, new Date(2026, 9, 14, 18, 0, 0)).days, 1)
  const startNight = new Date(2026, 9, 13, 23, 55, 0)
  const crossing = weekReading([late], 2, startNight)
  assert.equal(crossing.dots[weekdayIndex(startNight)]?.read, true)
  const nextMorning = new Date(2026, 9, 14, 0, 10, 0)
  assert.equal(weekReading([late], 2, nextMorning).dots[weekdayIndex(nextMorning)]?.read, false)
  const history = recentWeeks([morning, evening], 2, now, 8)
  assert.equal(history.length, 8)
  assert.equal(history[7]?.days, 1)
  assert.equal(history[0]?.days, 0)
})

test("le rappel calendrier est hebdomadaire, dix minutes, à l’heure locale", () => {
  assert.equal(parseReminderTime("20:30"), "20:30")
  assert.equal(parseReminderTime("20:30:00"), "20:30")
  assert.equal(parseReminderTime("24:00"), null)
  const now = new Date(2026, 9, 16, 12, 0, 0)
  const calendar = reminderCalendar("20:30", [1, 3, 5], now)
  assert.match(calendar, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR/)
  assert.match(calendar, /UID:rappel@10-min-lecture/)
  assert.match(calendar, /SUMMARY:10 min lecture/)
  assert.equal(/DTSTART:[^\r\n]*Z/.test(calendar), false)
  const start = /DTSTART:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})00/.exec(calendar)
  const end = /DTEND:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})00/.exec(calendar)
  assert.ok(start && end)
  if (!start || !end) return
  const startDate = new Date(Number(start[1]), Number(start[2]) - 1, Number(start[3]), Number(start[4]), Number(start[5]))
  const endDate = new Date(Number(end[1]), Number(end[2]) - 1, Number(end[3]), Number(end[4]), Number(end[5]))
  assert.equal(startDate.getTime(), nextSelected(now, 20, 30, [1, 3, 5]).getTime())
  assert.equal(endDate.getTime() - startDate.getTime(), 10 * 60 * 1000)
  assert.throws(() => reminderCalendar("25:99", []), /Rappel incomplet/)
})

test("l’âge d’une copie se lit sans pression", () => {
  const now = new Date(2026, 9, 16, 18, 0, 0)
  assert.equal(backupAgeLabel(null, now), "Dernière copie : aucune pour l’instant.")
  assert.equal(backupAgeLabel(new Date(2026, 9, 16, 8, 0, 0).toISOString(), now), "Dernière copie : aujourd’hui.")
  assert.equal(backupAgeLabel(new Date(2026, 9, 4, 8, 0, 0).toISOString(), now), "Dernière copie : il y a 12 jours.")
  assert.equal(backupIsStale(null, now), true)
  assert.equal(backupIsStale(new Date(2026, 8, 1).toISOString(), now), true)
  assert.equal(backupIsStale(new Date(2026, 9, 10).toISOString(), now), false)
})

test("le panneau reprend la page et les cinq derniers à retenir", () => {
  assert.equal(resumePageLine(84, 300), "Tu reprends à la page 84.")
  assert.equal(resumePageLine(300, 300), "Tu as fini ce livre 🎉")
  const notes = [1, 2, 3, 4, 5, 6].map((n) => ({
    id: `n${n}`,
    bookId: "b1",
    sessionId: null,
    kind: "retenir" as const,
    text: `repère ${n}`,
    page: n,
    createdAt: `2026-01-0${n}T00:00:00.000Z`,
  }))
  const kept = keptHighlights(notes, "b1")
  assert.deepEqual(kept.shown.map((note) => note.page), [6, 5, 4, 3, 2])
  assert.equal(kept.extra, 1)
  assert.deepEqual(notesForBook(notes, "b1", "chrono").map((note) => note.page), [1, 2, 3, 4, 5, 6])
})

test("un nouveau livre refuse un formulaire incomplet", () => {
  const empty = validateNewBook({ title: "  ", author: "", page: "", total: "" })
  assert.equal(empty.ok, false)
  if (!empty.ok) {
    assert.equal(empty.errors.title, "Il manque le titre du livre.")
    assert.equal(empty.errors.author, "Il manque l’auteur.")
    assert.ok(empty.errors.page)
  }
  const tooSmall = validateNewBook({ title: "Dune", author: "Herbert", page: "50", total: "40" })
  assert.equal(tooSmall.ok, false)
  if (!tooSmall.ok) assert.match(tooSmall.errors.total ?? "", /page actuelle/)
  const ok = validateNewBook({ title: " Dune ", author: " Herbert ", page: "0", total: "" })
  assert.deepEqual(ok, { ok: true, title: "Dune", author: "Herbert", currentPage: 0, totalPages: null })
})

function at(started: Date, durationSec: number) {
  return { startedAt: started.toISOString(), durationSec }
}

function weekdayIndex(date: Date): number {
  return date.getDay() === 0 ? 6 : date.getDay() - 1
}

function nextSelected(now: Date, hours: number, minutes: number, days: number[]): Date {
  for (let offset = 0; offset < 8; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hours, minutes, 0, 0)
    const weekday = date.getDay() === 0 ? 7 : date.getDay()
    if (!days.includes(weekday) || date.getTime() <= now.getTime()) continue
    return date
  }
  return now
}

function session(id: string, ended: Date, durationSec: number): Session {
  return {
    id,
    bookId: "livre",
    startedAt: new Date(ended.getTime() - durationSec * 1000).toISOString(),
    endedAt: ended.toISOString(),
    durationSec,
    pageBefore: 1,
    pageAfter: 2,
  }
}
