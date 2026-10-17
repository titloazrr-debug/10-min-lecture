import { parseReminderTime } from "./logic.ts"
import type { Book, Challenge, Data, Meta, Note, Reminder, Session, Settings } from "./types.ts"

export const SCHEMA = 6
export const DATA_KEY = "10ml:data"
export const LEGACY_KEY = "dix-min-lecture-v1"
const BACKUP_PREFIX = "10ml:backup:"
const CORRUPT_PREFIX = "10ml:corrupt:"
const BACKUP_KEEP = 3

export type KeyValueStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  key(index: number): string | null
  readonly length: number
}

export type StorageProblem = {
  status: "migration" | "corrupt" | "quota"
  raw: string
}

export type LoadResult = { status: "ok"; data: Data } | StorageProblem

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>

export const migrations: Record<number, Migration> = {
  1: (raw) => {
    const settings = isRecord(raw.settings) ? { ...raw.settings } : {}
    if (settings.reminderTime == null && typeof raw.reminderTime === "string") {
      settings.reminderTime = raw.reminderTime
    }
    const meta = isRecord(raw.meta) ? { ...raw.meta } : {}
    if (typeof meta.lastBackupAt !== "string") meta.lastBackupAt = null
    const rest = { ...raw }
    delete rest.version
    delete rest.reminderTime
    delete rest.settings
    delete rest.meta
    return { ...rest, schemaVersion: 2, settings, meta }
  },
  2: (raw) => {
    const settings = isRecord(raw.settings) ? { ...raw.settings } : {}
    if (typeof settings.showRecap !== "boolean") settings.showRecap = true
    const pageBySession = new Map<string, number>()
    if (Array.isArray(raw.sessions)) {
      for (const item of raw.sessions) {
        if (!isRecord(item) || typeof item.id !== "string") continue
        if (typeof item.pageAfter !== "number" || item.pageAfter < 0) continue
        pageBySession.set(item.id, Math.floor(item.pageAfter))
      }
    }
    const notes = Array.isArray(raw.notes)
      ? raw.notes.map((item) => noteWithPage(item, pageBySession))
      : raw.notes
    return { ...raw, schemaVersion: 3, settings, notes }
  },
  3: (raw) => {
    const settings = isRecord(raw.settings) ? { ...raw.settings } : {}
    if (typeof settings.weeklyGoalDays !== "number") settings.weeklyGoalDays = 3
    if (typeof settings.minMinutesPerDay !== "number") settings.minMinutesPerDay = 2
    if (!isRecord(settings.reminder)) {
      const legacy = typeof settings.reminderTime === "string" ? settings.reminderTime : null
      settings.reminder = {
        enabled: legacy != null,
        time: legacy ?? "20:30",
        days: [1, 2, 3, 4, 5, 6, 7],
      }
    }
    return { ...raw, schemaVersion: 4, settings }
  },
  4: (raw) => {
    const settings = isRecord(raw.settings) ? { ...raw.settings } : {}
    if (typeof settings.analytics !== "boolean") settings.analytics = true
    const meta = isRecord(raw.meta) ? { ...raw.meta } : {}
    if (typeof meta.return7dSent !== "boolean") meta.return7dSent = false
    if (typeof meta.firstSeenAt !== "string") meta.firstSeenAt = null
    return { ...raw, schemaVersion: 5, settings, meta }
  },
  5: (raw) => {
    const settings = isRecord(raw.settings) ? { ...raw.settings } : {}
    if (settings.sessionMode !== "papier" && settings.sessionMode !== "ecran") settings.sessionMode = "papier"
    if (typeof settings.endSound !== "boolean") settings.endSound = false
    if (typeof settings.endVibrate !== "boolean") settings.endVibrate = false
    return { ...raw, schemaVersion: 6, settings }
  },
}

export function emptyData(): Data {
  return {
    schemaVersion: SCHEMA,
    books: [],
    sessions: [],
    notes: [],
    currentBookId: null,
    settings: {
      reminderTime: null,
      showRecap: true,
      weeklyGoalDays: 3,
      minMinutesPerDay: 2,
      reminder: { enabled: false, time: "20:30", days: [1, 2, 3, 4, 5, 6, 7] },
      analytics: true,
      sessionMode: "papier",
      endSound: false,
      endVibrate: false,
    },
    meta: { lastBackupAt: null, firstSeenAt: null, return7dSent: false },
  }
}

export function normalize(input: unknown): Data {
  if (!isRecord(input)) return emptyData()
  return materialize(applyMigrations(input))
}

export function applyMigrations(
  raw: Record<string, unknown>,
  steps: Record<number, Migration> = migrations,
): Record<string, unknown> {
  if (typeof raw.schemaVersion === "number" && raw.schemaVersion > SCHEMA) {
    throw new Error("version future")
  }
  let version = typeof raw.schemaVersion === "number" && raw.schemaVersion >= 1 ? raw.schemaVersion : 1
  let current = raw
  while (version < SCHEMA) {
    const step = steps[version]
    if (!step) throw new Error(`migration ${version} manquante`)
    current = step(current)
    const next = current.schemaVersion
    if (typeof next !== "number" || next <= version) throw new Error("migration immobile")
    version = next
  }
  return current
}

export function prepareImport(input: unknown): { ok: true; data: Data } | { ok: false; message: string } {
  if (!isRecord(input)) return { ok: false, message: NOT_A_BACKUP }
  if (typeof input.schemaVersion === "number" && input.schemaVersion > SCHEMA) {
    return { ok: false, message: "Cette copie vient d’une version plus récente. Rien n’a été modifié." }
  }
  const familiar = input.schemaVersion != null
    || input.version != null
    || Array.isArray(input.books)
    || Array.isArray(input.sessions)
    || Array.isArray(input.notes)
  if (!familiar) return { ok: false, message: NOT_A_BACKUP }
  try {
    return { ok: true, data: normalize(input) }
  } catch {
    return { ok: false, message: NOT_A_BACKUP }
  }
}

export function mergeData(local: Data, incoming: Data): Data {
  const books = mergeById(local.books, incoming.books, (book) => book.createdAt)
  const ids = new Set(books.map((book) => book.id))
  const sessions = mergeById(local.sessions, incoming.sessions, (session) => session.endedAt)
    .filter((session) => ids.has(session.bookId))
  const notes = mergeById(local.notes, incoming.notes, (note) => note.createdAt)
    .filter((note) => ids.has(note.bookId))
  const currentBookId = [local.currentBookId, incoming.currentBookId].find((id) => id != null && ids.has(id)) ?? books[0]?.id ?? null
  return {
    ...local,
    schemaVersion: SCHEMA,
    books,
    sessions,
    notes,
    currentBookId,
    settings: {
      ...incoming.settings,
      ...local.settings,
      reminderTime: local.settings.reminderTime ?? incoming.settings.reminderTime,
    },
    meta: {
      ...incoming.meta,
      ...local.meta,
      lastBackupAt: laterIso(local.meta.lastBackupAt, incoming.meta.lastBackupAt),
    },
  }
}

export function exportDocument(data: Data, now = new Date()): Data & { exportedAt: string } {
  return { ...data, exportedAt: now.toISOString() }
}

export function countLine(data: Pick<Data, "books" | "notes" | "sessions">): string {
  return `Ce fichier contient ${plural(data.books.length, "livre", "livres")}, ${plural(data.notes.length, "note", "notes")} et ${plural(data.sessions.length, "session", "sessions")}.`
}

export function load(
  storage: KeyValueStore = browserStorage(),
  steps: Record<number, Migration> = migrations,
): LoadResult {
  const currentRaw = storage.getItem(DATA_KEY)
  if (currentRaw != null) return readExisting(storage, DATA_KEY, currentRaw, steps)
  const legacyRaw = storage.getItem(LEGACY_KEY)
  if (legacyRaw == null) return { status: "ok", data: emptyData() }
  return readExisting(storage, LEGACY_KEY, legacyRaw, steps)
}

export function save(data: Data, storage: KeyValueStore = browserStorage()): void {
  storage.setItem(DATA_KEY, JSON.stringify(data))
}

/** Enregistre le défi sans toucher à un défi déjà commencé, ni à une bibliothèque illisible. */
export function rememberChallenge(storage: KeyValueStore = browserStorage(), now = new Date()): boolean {
  const result = load(storage)
  if (result.status !== "ok") return false
  if (result.data.challenge?.joinedAt) return true
  save({
    ...result.data,
    challenge: { joinedAt: now.toISOString(), answered: false },
  }, storage)
  return true
}

export function snapshotRaw(storage: KeyValueStore, raw: string, version: number): boolean {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  try {
    storage.setItem(`${BACKUP_PREFIX}${version}:${stamp}`, raw)
  } catch {
    return false
  }
  const keys = backupKeys(storage)
  while (keys.length > BACKUP_KEEP) {
    const oldest = keys.shift()
    if (oldest) storage.removeItem(oldest)
  }
  return true
}

export function listSnapshots(storage: KeyValueStore = browserStorage()): { key: string; label: string }[] {
  return backupKeys(storage).reverse().map((key) => ({ key, label: snapshotLabel(key) }))
}

export function readSnapshot(storage: KeyValueStore, key: string): string | null {
  if (!key.startsWith(BACKUP_PREFIX)) return null
  return storage.getItem(key)
}

function readExisting(
  storage: KeyValueStore,
  key: string,
  raw: string,
  steps: Record<number, Migration>,
): LoadResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    archiveCorrupt(storage, raw)
    const legacy = key === DATA_KEY ? storage.getItem(LEGACY_KEY) : null
    return { status: "corrupt", raw: legacy ?? raw }
  }
  if (!isRecord(parsed)) return { status: "corrupt", raw }
  const version = typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : 1
  if (version > SCHEMA) return { status: "migration", raw }
  if (version >= SCHEMA && key === DATA_KEY) return { status: "ok", data: materialize(parsed) }
  if (!snapshotRaw(storage, raw, version)) return { status: "quota", raw }
  try {
    const migrated = materialize(applyMigrations(parsed, steps))
    storage.setItem(DATA_KEY, JSON.stringify(migrated))
    return { status: "ok", data: migrated }
  } catch {
    return { status: "migration", raw }
  }
}

function archiveCorrupt(storage: KeyValueStore, raw: string): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  try {
    storage.setItem(`${CORRUPT_PREFIX}${stamp}`, raw)
  } catch {
    // Le quota est plein : on n’écrase pas la donnée illisible.
  }
}

function materialize(raw: Record<string, unknown>): Data {
  const books = Array.isArray(raw.books) ? raw.books.flatMap((item) => {
    const book = asBook(item)
    return book ? [book] : []
  }) : []
  const ids = new Set(books.map((book) => book.id))
  const sessions = Array.isArray(raw.sessions) ? raw.sessions.flatMap((item) => {
    const session = asSession(item)
    return session && ids.has(session.bookId) ? [session] : []
  }) : []
  const notes = Array.isArray(raw.notes) ? raw.notes.flatMap((item) => {
    const note = asNote(item)
    return note && ids.has(note.bookId) ? [note] : []
  }) : []
  const currentBookId = typeof raw.currentBookId === "string" && ids.has(raw.currentBookId)
    ? raw.currentBookId
    : books[0]?.id ?? null
  const settingsRaw = isRecord(raw.settings) ? raw.settings : {}
  const reminderSource = typeof settingsRaw.reminderTime === "string"
    ? settingsRaw.reminderTime
    : typeof raw.reminderTime === "string" ? raw.reminderTime : ""
  const settings = {
    ...settingsRaw,
    reminderTime: parseReminderTime(reminderSource),
    showRecap: settingsRaw.showRecap !== false,
    weeklyGoalDays: goalDays(settingsRaw.weeklyGoalDays),
    minMinutesPerDay: minutesPerDay(settingsRaw.minMinutesPerDay),
    reminder: asReminder(settingsRaw, raw.reminderTime),
    analytics: settingsRaw.analytics !== false,
    sessionMode: settingsRaw.sessionMode === "ecran" ? "ecran" : "papier",
    endSound: settingsRaw.endSound === true,
    endVibrate: settingsRaw.endVibrate === true,
  } as Settings
  const metaRaw = isRecord(raw.meta) ? raw.meta : {}
  const meta = {
    ...metaRaw,
    lastBackupAt: typeof metaRaw.lastBackupAt === "string" ? metaRaw.lastBackupAt : null,
    firstSeenAt: typeof metaRaw.firstSeenAt === "string" ? metaRaw.firstSeenAt : null,
    return7dSent: metaRaw.return7dSent === true,
  } as Meta
  const challenge = asChallenge(raw.challenge)
  const extra: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN.has(key)) extra[key] = value
  }
  return {
    ...extra,
    schemaVersion: SCHEMA,
    books,
    sessions,
    notes,
    currentBookId,
    settings,
    meta,
    ...(challenge ? { challenge } : {}),
  }
}

function asChallenge(value: unknown): Challenge | null {
  if (!isRecord(value) || typeof value.joinedAt !== "string") return null
  if (Number.isNaN(new Date(value.joinedAt).getTime())) return null
  const answer = value.answer === "oui" || value.answer === "un peu" || value.answer === "non" ? value.answer : undefined
  return {
    joinedAt: value.joinedAt,
    answered: value.answered === true,
    ...(answer ? { answer } : {}),
  }
}

function asBook(value: unknown): Book | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== "string" || typeof value.title !== "string") return null
  const page = typeof value.currentPage === "number" && value.currentPage >= 0
    ? Math.floor(value.currentPage)
    : 1
  const total = typeof value.totalPages === "number" && value.totalPages >= 1
    ? Math.floor(value.totalPages)
    : null
  return {
    ...value,
    id: value.id,
    title: value.title,
    author: typeof value.author === "string" ? value.author : "",
    currentPage: page,
    totalPages: total,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date(0).toISOString(),
    recapCollapsed: value.recapCollapsed === true,
  } as Book
}

function asSession(value: unknown): Session | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== "string" || typeof value.bookId !== "string") return null
  if (typeof value.startedAt !== "string" || typeof value.endedAt !== "string") return null
  if (typeof value.durationSec !== "number" || value.durationSec < 0) return null
  const session: Record<string, unknown> = {
    ...value,
    id: value.id,
    bookId: value.bookId,
    startedAt: value.startedAt,
    endedAt: value.endedAt,
    durationSec: Math.round(value.durationSec),
    pageBefore: pageNumber(value.pageBefore),
    pageAfter: pageNumber(value.pageAfter),
  }
  if (value.mode === "papier" || value.mode === "ecran") session.mode = value.mode
  else delete session.mode
  return session as Session
}

function asNote(value: unknown): Note | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== "string" || typeof value.bookId !== "string") return null
  if (typeof value.text !== "string" || value.text.trim() === "") return null
  const kind = value.kind === "note" || value.kind === "retenir"
    ? value.kind
    : value.type === "note" || value.type === "retenir" ? value.type : null
  if (!kind) return null
  return {
    ...value,
    id: value.id,
    bookId: value.bookId,
    sessionId: typeof value.sessionId === "string" ? value.sessionId : null,
    kind,
    text: value.text,
    page: pageNumberOrNull(value.page),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date(0).toISOString(),
  } as Note
}

function noteWithPage(item: unknown, pageBySession: Map<string, number>): unknown {
  if (!isRecord(item)) return item
  const kind = item.kind === "note" || item.kind === "retenir"
    ? item.kind
    : item.type === "note" || item.type === "retenir" ? item.type : item.kind
  const next: Record<string, unknown> = { ...item, kind }
  if (pageNumberOrNull(next.page) != null) return next
  const sessionId = typeof next.sessionId === "string" ? next.sessionId : null
  const page = sessionId ? pageBySession.get(sessionId) : undefined
  return page == null ? next : { ...next, page }
}

function pageNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && value >= 0 && value <= 200_000) return Math.floor(value)
  return null
}

function pageNumber(value: unknown): number {
  if (typeof value === "number" && value >= 0 && value <= 200_000) return Math.floor(value)
  return 1
}

function mergeById<T extends { id: string }>(local: T[], incoming: T[], time: (item: T) => string): T[] {
  const map = new Map(local.map((item) => [item.id, item]))
  for (const item of incoming) {
    const previous = map.get(item.id)
    if (!previous || time(item) >= time(previous)) map.set(item.id, item)
  }
  return [...map.values()]
}

function laterIso(left: string | null, right: string | null): string | null {
  if (!left) return right
  if (!right) return left
  return right > left ? right : left
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

function goalDays(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 7 ? value : 3
}

function minutesPerDay(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 180 ? value : 2
}

function asReminder(settingsRaw: Record<string, unknown>, rootTime: unknown): Reminder {
  const legacy = parseReminderTime(typeof settingsRaw.reminderTime === "string" ? settingsRaw.reminderTime : "")
    ?? parseReminderTime(typeof rootTime === "string" ? rootTime : "")
  const record = isRecord(settingsRaw.reminder) ? settingsRaw.reminder : null
  const time = (record ? parseReminderTime(typeof record.time === "string" ? record.time : "") : null)
    ?? legacy
    ?? "20:30"
  return {
    enabled: record ? record.enabled === true : legacy != null,
    time,
    days: record ? chosenDays(record.days) : ALL_DAYS,
  }
}

function chosenDays(value: unknown): number[] {
  if (!Array.isArray(value)) return ALL_DAYS
  const days = [...new Set(value.filter((day): day is number => (
    typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 7
  )))].sort((a, b) => a - b)
  return days.length > 0 ? days : ALL_DAYS
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function backupKeys(storage: KeyValueStore): string[] {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key?.startsWith(BACKUP_PREFIX)) keys.push(key)
  }
  return keys.sort()
}

function snapshotLabel(key: string): string {
  const match = /^10ml:backup:\d+:(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})/.exec(key)
  if (!match) return "Instantané"
  return `${match[3]}/${match[2]}/${match[1]} à ${match[4]}:${match[5]}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
}

function browserStorage(): KeyValueStore {
  return localStorage
}

const KNOWN = new Set([
  "schemaVersion",
  "books",
  "notes",
  "sessions",
  "settings",
  "meta",
  "currentBookId",
  "challenge",
  "version",
  "reminderTime",
  "exportedAt",
])

const NOT_A_BACKUP = "Ce fichier ne ressemble pas à une copie de secours."
