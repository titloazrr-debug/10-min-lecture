import assert from "node:assert/strict"
import { test } from "node:test"
import { applyChallengeAnswer, challengeIsDue, challengeReply } from "../src/logic.ts"
import { DATA_KEY, load, rememberChallenge, type KeyValueStore } from "../src/storage.ts"
import { emptyData } from "../src/storage.ts"
import type { Data } from "../src/types.ts"

test("la question attend le jour calendaire suivant", () => {
  const joined = new Date(2026, 9, 16, 23, 30).toISOString()
  const challenge = { joinedAt: joined, answered: false }
  assert.equal(challengeIsDue(challenge, new Date(2026, 9, 16, 23, 50)), false)
  assert.equal(challengeIsDue(challenge, new Date(2026, 9, 17, 0, 10)), true)
  assert.equal(challengeIsDue({ ...challenge, answered: true }, new Date(2026, 9, 18, 8, 0)), false)
  assert.equal(challengeIsDue(undefined, new Date(2026, 9, 18, 8, 0)), false)
  assert.equal(challengeReply("oui"), "Super. On remet ça ce soir ? 📖")
  assert.equal(challengeReply("un peu"), "Super. On remet ça ce soir ? 📖")
  assert.equal(challengeReply("non"), "Merci d’avoir essayé. Peut-être un autre livre ? Tout compte.")
})

test("relever le défi garde le livre et ne recommence pas", () => {
  const storage = memory()
  const original: Data = {
    ...emptyData(),
    books: [{ id: "b1", title: "Dune", author: "Herbert", currentPage: 86, totalPages: 412, createdAt: "2026-01-01T00:00:00.000Z", recapCollapsed: false }],
    currentBookId: "b1",
  }
  storage.setItem(DATA_KEY, JSON.stringify(original))
  const when = new Date(2026, 9, 16, 21, 0)
  assert.equal(rememberChallenge(storage, when), true)
  const once = load(storage)
  assert.equal(once.status, "ok")
  if (once.status !== "ok") return
  assert.equal(once.data.books[0]?.title, "Dune")
  assert.equal(once.data.books[0]?.currentPage, 86)
  assert.equal(once.data.challenge?.answered, false)
  assert.equal(once.data.challenge?.joinedAt, when.toISOString())
  assert.equal(rememberChallenge(storage, new Date(2026, 9, 20, 9, 0)), true)
  const twice = load(storage)
  if (twice.status !== "ok") return
  assert.equal(twice.data.challenge?.joinedAt, when.toISOString())
  const answered = applyChallengeAnswer(twice.data, "un peu")
  assert.equal(answered.challenge?.answer, "un peu")
  assert.equal(answered.challenge?.answered, true)
  assert.equal(applyChallengeAnswer(answered, "oui"), answered)
  storage.setItem(DATA_KEY, JSON.stringify(answered))
  assert.equal(rememberChallenge(storage, new Date(2026, 9, 21, 9, 0)), true)
  const kept = load(storage)
  if (kept.status !== "ok") return
  assert.equal(kept.data.challenge?.answer, "un peu")
  assert.equal(kept.data.books[0]?.title, "Dune")
})

test("un défi illisible n’efface pas le livre", () => {
  const storage = memory()
  storage.setItem(DATA_KEY, JSON.stringify({
    schemaVersion: 6,
    books: [{ id: "b1", title: "Dune", author: "Herbert", currentPage: 12, createdAt: "2026-01-01T00:00:00.000Z" }],
    sessions: [],
    notes: [],
    currentBookId: "b1",
    settings: { analytics: true },
    meta: { lastBackupAt: null },
    challenge: { joinedAt: "hier", answered: false },
  }))
  const result = load(storage)
  assert.equal(result.status, "ok")
  if (result.status !== "ok") return
  assert.equal(result.data.books[0]?.title, "Dune")
  assert.equal(result.data.challenge, undefined)
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
