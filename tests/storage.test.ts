import assert from "node:assert/strict"
import { test } from "node:test"
import {
  DATA_KEY,
  LEGACY_KEY,
  countLine,
  listSnapshots,
  load,
  mergeData,
  prepareImport,
  snapshotRaw,
  type KeyValueStore,
} from "../src/storage.ts"
import type { Data } from "../src/types.ts"

test("une copie v1 migre vers v2 sans rien perdre", () => {
  const original = JSON.stringify({
    version: 1,
    books: [{ id: "b1", title: "Dune", author: "Herbert", currentPage: 12, totalPages: 600, createdAt: "2026-01-01T00:00:00.000Z", color: "sable" }],
    sessions: [{ id: "s1", bookId: "b1", startedAt: "2026-01-01T00:00:00.000Z", endedAt: "2026-01-01T00:10:00.000Z", durationSec: 600, pageBefore: 12, pageAfter: 18 }],
    notes: [{ id: "n1", bookId: "b1", sessionId: "s1", kind: "retenir", text: "Le désert", createdAt: "2026-01-02T00:00:00.000Z" }],
    currentBookId: "b1",
    reminderTime: "20:30",
    kept: true,
  })
  const storage = memory()
  storage.setItem(LEGACY_KEY, original)
  const result = load(storage)
  assert.equal(result.status, "ok")
  if (result.status !== "ok") return
  assert.equal(result.data.schemaVersion, 6)
  assert.equal(result.data.settings.showRecap, true)
  assert.equal(result.data.notes[0]?.page, 18)
  assert.equal(result.data.books[0]?.recapCollapsed, false)
  assert.equal(result.data.books[0]?.title, "Dune")
  assert.equal(result.data.books[0]?.currentPage, 12)
  assert.equal((result.data.books[0] as { color?: string }).color, "sable")
  assert.equal(result.data.sessions.length, 1)
  assert.equal(result.data.notes.length, 1)
  assert.equal(result.data.currentBookId, "b1")
  assert.equal(result.data.settings.reminderTime, "20:30")
  assert.equal(result.data.settings.reminder.enabled, true)
  assert.equal(result.data.settings.reminder.time, "20:30")
  assert.deepEqual(result.data.settings.reminder.days, [1, 2, 3, 4, 5, 6, 7])
  assert.equal(result.data.settings.weeklyGoalDays, 3)
  assert.equal(result.data.settings.minMinutesPerDay, 2)
  assert.equal((result.data as Data & { kept?: boolean }).kept, true)
  assert.equal(storage.getItem(LEGACY_KEY), original)
  assert.match(storage.getItem(DATA_KEY) ?? "", /"schemaVersion":6/)
  assert.equal(result.data.settings.analytics, true)
  assert.equal(result.data.settings.sessionMode, "papier")
  assert.equal(result.data.settings.endSound, false)
  assert.equal(result.data.settings.endVibrate, false)
  assert.equal(result.data.meta.return7dSent, false)
  assert.equal(listSnapshots(storage).length, 1)
  const again = load(storage)
  assert.equal(again.status, "ok")
  if (again.status === "ok") assert.equal(again.data.books.length, 1)
  assert.equal(listSnapshots(storage).length, 1)
})

test("une migration cassée laisse les données intactes", () => {
  const original = JSON.stringify({ version: 1, books: [{ id: "b1", title: "Dune", author: "Herbert", currentPage: 1, createdAt: "2026-01-01T00:00:00.000Z" }], sessions: [], notes: [], currentBookId: "b1" })
  const storage = memory()
  storage.setItem(LEGACY_KEY, original)
  const result = load(storage, { 1: () => { throw new Error("casse") } })
  assert.equal(result.status, "migration")
  assert.equal(storage.getItem(LEGACY_KEY), original)
  assert.equal(storage.getItem(DATA_KEY), null)
})

test("un JSON illisible n’est pas écrasé", () => {
  const storage = memory()
  storage.setItem(LEGACY_KEY, "{")
  const result = load(storage)
  assert.equal(result.status, "corrupt")
  assert.equal(storage.getItem(LEGACY_KEY), "{")
  assert.equal(storage.getItem(DATA_KEY), null)
  assert.equal([...keys(storage)].some((key) => key.startsWith("10ml:corrupt:")), true)
})

test("sans place pour l’instantané, on ne migre pas", () => {
  const original = JSON.stringify({ version: 1, books: [], sessions: [], notes: [] })
  const storage = memory((key) => {
    if (key.startsWith("10ml:backup:")) throw new DOMException("quota", "QuotaExceededError")
  })
  storage.setItem(LEGACY_KEY, original)
  const result = load(storage)
  assert.equal(result.status, "quota")
  assert.equal(storage.getItem(LEGACY_KEY), original)
  assert.equal(storage.getItem(DATA_KEY), null)
})

test("l’import v1 passe par la migration, et la fusion garde le plus récent", () => {
  const file = prepareImport({
    version: 1,
    books: [{ id: "b1", title: "Dune", author: "Herbert", currentPage: 4, createdAt: "2026-02-01T00:00:00.000Z" }],
    sessions: [],
    notes: [{ id: "n1", bookId: "b1", kind: "note", text: "Note ancienne", createdAt: "2026-02-01T00:00:00.000Z" }],
    currentBookId: "b1",
    reminderTime: "21:00",
  })
  assert.equal(file.ok, true)
  if (!file.ok) return
  assert.equal(countLine(file.data), "Ce fichier contient 1 livre, 1 note et 0 sessions.")
  const local = file.data
  const incoming = prepareImport({
    schemaVersion: 2,
    books: [
      { id: "b1", title: "Dune revue", author: "Herbert", currentPage: 9, createdAt: "2026-03-01T00:00:00.000Z" },
      { id: "b2", title: "Sapiens", author: "Harari", currentPage: 1, createdAt: "2026-03-02T00:00:00.000Z" },
    ],
    sessions: [],
    notes: [{ id: "n1", bookId: "b1", kind: "note", text: "Note récente", createdAt: "2026-03-01T00:00:00.000Z" }],
    currentBookId: "b2",
    settings: { reminderTime: null },
    meta: { lastBackupAt: null },
  })
  assert.equal(incoming.ok, true)
  if (!incoming.ok) return
  const merged = mergeData(local, incoming.data)
  assert.equal(merged.books.length, 2)
  assert.equal(merged.books.find((book) => book.id === "b1")?.title, "Dune revue")
  assert.equal(merged.notes[0]?.text, "Note récente")
  assert.equal(merged.settings.reminderTime, "21:00")
  assert.equal(prepareImport({ hello: "world" }).ok, false)
})

test("on ne garde que trois instantanés", () => {
  const storage = memory()
  for (let index = 0; index < 4; index += 1) {
    const date = new Date(2026, 0, index + 1).toISOString().replace(/[:.]/g, "-")
    const key = `10ml:backup:1:${date}`
    storage.setItem(key, String(index))
  }
  assert.equal(snapshotRaw(storage, "dernier", 1), true)
  const kept = [...keys(storage)].filter((key) => key.startsWith("10ml:backup:"))
  assert.equal(kept.length, 3)
  assert.equal(kept.some((key) => storage.getItem(key) === "0"), false)
})

function keys(storage: KeyValueStore): string[] {
  const names: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key) names.push(key)
  }
  return names
}

function memory(onSet?: (key: string) => void): KeyValueStore {
  const items = new Map<string, string>()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      onSet?.(key)
      items.set(key, value)
    },
    removeItem: (key) => {
      items.delete(key)
    },
    key: (index) => [...items.keys()][index] ?? null,
    get length() {
      return items.size
    },
  }
}
