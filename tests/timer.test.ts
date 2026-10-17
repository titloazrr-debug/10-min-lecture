import assert from "node:assert/strict"
import { test } from "node:test"
import { closingCopy } from "../src/logic.ts"
import { DATA_KEY, load, type KeyValueStore } from "../src/storage.ts"
import {
  elapsedMs,
  parseActive,
  pauseActive,
  readActive,
  resumeActive,
  writeActive,
  type ActiveSession,
} from "../src/timer.ts"

test("cinq minutes verrouillées comptent, la pause non", () => {
  const start = 1_700_000_000_000
  let session: ActiveSession = {
    bookId: "b1",
    mode: "papier",
    startedAt: start,
    pausedAt: null,
    pausedTotalMs: 0,
    targetMin: 10,
    continued: false,
    signaled: false,
  }
  assert.equal(elapsedMs(session, start + 5 * 60_000), 5 * 60_000)
  assert.ok(Math.abs(elapsedMs(session, start + 5 * 60_000 + 400) - (5 * 60_000 + 400)) <= 1000)
  session = pauseActive(session, start + 5 * 60_000)
  assert.equal(elapsedMs(session, start + 8 * 60_000), 5 * 60_000)
  session = resumeActive(session, start + 8 * 60_000)
  assert.equal(elapsedMs(session, start + 8 * 60_000 + 1000), 5 * 60_000 + 1000)
  session = pauseActive(session, start + 8 * 60_000 + 1000)
  assert.equal(elapsedMs(session, start + 9 * 60_000), 5 * 60_000 + 1000)
})

test("une session active illisible est ignorée", () => {
  const storage = memory()
  storage.setItem("10ml:active", "{")
  assert.equal(readActive(storage), null)
  assert.equal(storage.getItem("10ml:active"), "{")
  assert.equal(parseActive({ bookId: "b1", mode: "telephone", startedAt: 10, pausedAt: null, pausedTotalMs: 0, targetMin: 10 }), null)
  const valid = {
    bookId: "b1",
    mode: "ecran",
    startedAt: 10,
    pausedAt: null,
    pausedTotalMs: 0,
    targetMin: null,
  }
  writeActive({ ...parseActive(valid)!, continued: false, signaled: false }, storage)
  assert.equal(readActive(storage)?.mode, "ecran")
  assert.equal(readActive(storage)?.targetMin, null)
})

test("le schéma 5 garde le livre et le mode de session", () => {
  const storage = memory()
  storage.setItem(DATA_KEY, JSON.stringify({
    schemaVersion: 5,
    books: [{ id: "b1", title: "Dune", author: "Herbert", currentPage: 86, totalPages: 412, createdAt: "2026-01-01T00:00:00.000Z" }],
    sessions: [
      { id: "s1", bookId: "b1", startedAt: "2026-01-01T00:00:00.000Z", endedAt: "2026-01-01T00:12:00.000Z", durationSec: 720, pageBefore: 80, pageAfter: 86, mode: "papier" },
      { id: "s2", bookId: "b1", startedAt: "2026-01-02T00:00:00.000Z", endedAt: "2026-01-02T00:02:00.000Z", durationSec: 120, pageBefore: 86, pageAfter: 88, mode: "autre" },
    ],
    notes: [],
    currentBookId: "b1",
    settings: {
      analytics: false,
      showRecap: true,
      reminderTime: null,
      weeklyGoalDays: 4,
      minMinutesPerDay: 2,
      reminder: { enabled: false, time: "20:30", days: [1, 2, 3, 4, 5, 6, 7] },
    },
    meta: { lastBackupAt: null, firstSeenAt: "2026-01-01T00:00:00.000Z", return7dSent: true },
  }))
  const result = load(storage)
  assert.equal(result.status, "ok")
  if (result.status !== "ok") return
  assert.equal(result.data.schemaVersion, 6)
  assert.equal(result.data.books[0]?.title, "Dune")
  assert.equal(result.data.books[0]?.currentPage, 86)
  assert.equal(result.data.settings.analytics, false)
  assert.equal(result.data.settings.weeklyGoalDays, 4)
  assert.equal(result.data.settings.sessionMode, "papier")
  assert.equal(result.data.settings.endSound, false)
  assert.equal(result.data.settings.endVibrate, false)
  assert.equal(result.data.sessions[0]?.mode, "papier")
  assert.equal(result.data.sessions[1]?.mode, undefined)
  assert.equal(result.data.meta.return7dSent, true)
})

test("la fin parle du livre", () => {
  assert.deepEqual(closingCopy(30, 4, "Dune", 400), { kind: "short" })
  assert.deepEqual(closingCopy(12 * 60 + 20, 86, "Dune", 400), { kind: "progress", minutes: 12, page: 86 })
  assert.deepEqual(closingCopy(60, 1, "Dune", 400), { kind: "progress", minutes: 1, page: 1 })
  assert.deepEqual(closingCopy(20, 400, "Dune", 400), { kind: "finished", title: "Dune" })
  assert.equal(closingCopy(90, null, "Dune", null).kind, "progress")
})

function memory(): KeyValueStore {
  const items = new Map<string, string>()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, value) },
    removeItem: (key) => { items.delete(key) },
    key: (index) => [...items.keys()][index] ?? null,
    get length() { return items.size },
  }
}
