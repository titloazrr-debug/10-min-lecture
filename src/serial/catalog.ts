import type { Book } from "../types.ts"

export const FREE_UNTIL = 2

export type SerialStatus = "ongoing" | "completed"

export type SerialIndexItem = {
  slug: string
  title: string
  author: string
  pitch: string
  estimatedTime: string
  chapterCount: number
  status: SerialStatus
  genre: string
  cover: string
}

export type SerialEpisodeMeta = {
  n: number
  title: string
  file: string
  recap?: string
}

export type SerialMeta = SerialIndexItem & {
  summary: string
  buyUrl: string
  freeUntil: number
  episodes: SerialEpisodeMeta[]
}

export type SerialProgress = {
  episode: number
  percent: number
  updatedAt: string
}

export function parseLirePath(path: string): { slug: string; episode: number | null } | null {
  return parseStoryPath(path)
}

export function parseStoryPath(path: string): { slug: string; episode: number | null } | null {
  const match = /^\/(?:histoires|lire)\/([a-z0-9-]+)(?:\/(\d+))?$/.exec(path)
  if (!match || !match[1]) return null
  if (match[2] == null) return { slug: match[1], episode: null }
  const episode = Number(match[2])
  if (!Number.isInteger(episode) || episode < 1) return { slug: match[1], episode: null }
  return { slug: match[1], episode }
}

export function storyHref(slug: string, chapter?: number): string {
  if (chapter == null) return `/histoires/${slug}`
  return `/histoires/${slug}/${chapter}`
}

export function isLocked(n: number, freeUntil = FREE_UNTIL): boolean {
  return n > freeUntil
}

export function wantsTenMinuteSession(search: string): boolean {
  return new URLSearchParams(search).get("session") === "10"
}

export function serialBookId(slug: string): string {
  return `feuilleton:${slug}`
}

export function asSerialMeta(value: unknown): SerialMeta | null {
  if (!isRecord(value)) return null
  if (typeof value.slug !== "string" || value.slug === "") return null
  if (typeof value.title !== "string" || value.title === "") return null
  const episodes = Array.isArray(value.episodes)
    ? value.episodes.flatMap((item) => {
      const episode = asEpisode(item)
      return episode ? [episode] : []
    })
    : []
  if (episodes.length === 0) return null
  const status = value.status === "ongoing" ? "ongoing" : "completed"
  const freeUntil = typeof value.freeUntil === "number" && value.freeUntil >= 0 ? value.freeUntil : FREE_UNTIL
  return {
    slug: value.slug,
    title: value.title,
    author: typeof value.author === "string" ? value.author : "",
    pitch: typeof value.pitch === "string" ? value.pitch : "",
    estimatedTime: typeof value.estimatedTime === "string" ? value.estimatedTime : "",
    chapterCount: typeof value.chapterCount === "number" ? value.chapterCount : episodes.length,
    status,
    genre: typeof value.genre === "string" ? value.genre : "",
    cover: typeof value.cover === "string" ? value.cover : "",
    summary: typeof value.summary === "string" ? value.summary : typeof value.pitch === "string" ? value.pitch : "",
    buyUrl: typeof value.buyUrl === "string" ? value.buyUrl : "",
    freeUntil,
    episodes,
  }
}

function asEpisode(value: unknown): SerialEpisodeMeta | null {
  if (!isRecord(value)) return null
  if (typeof value.n !== "number" || !Number.isInteger(value.n) || value.n < 1) return null
  if (typeof value.title !== "string" || typeof value.file !== "string") return null
  if (value.file.includes("..") || value.file.includes("/") || !value.file.endsWith(".md")) return null
  const recap = typeof value.recap === "string" && !value.recap.includes("..") && !value.recap.includes("/")
    ? value.recap
    : undefined
  return { n: value.n, title: value.title, file: value.file, ...(recap ? { recap } : {}) }
}

export function asSerialIndex(value: unknown): SerialIndexItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    if (typeof item.slug !== "string" || typeof item.title !== "string") return []
    return [{
      slug: item.slug,
      title: item.title,
      author: typeof item.author === "string" ? item.author : "",
      pitch: typeof item.pitch === "string" ? item.pitch : "",
      estimatedTime: typeof item.estimatedTime === "string" ? item.estimatedTime : "",
      chapterCount: typeof item.chapterCount === "number" ? item.chapterCount : 0,
      status: item.status === "ongoing" ? "ongoing" : "completed",
      genre: typeof item.genre === "string" ? item.genre : "",
      cover: typeof item.cover === "string" ? item.cover : "",
    }]
  })
}

export function findEpisode(meta: SerialMeta, n: number): SerialEpisodeMeta | null {
  return meta.episodes.find((episode) => episode.n === n) ?? null
}

export function nextEpisode(meta: SerialMeta, n: number): SerialEpisodeMeta | null {
  const ordered = [...meta.episodes].sort((a, b) => a.n - b.n)
  return ordered.find((episode) => episode.n > n) ?? null
}

export function isLastPublished(meta: SerialMeta, n: number): boolean {
  return nextEpisode(meta, n) == null
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10))
}

export function scrollPercent(scrollTop: number, scrollRange: number): number {
  if (scrollRange <= 0) return 0
  return clampPercent((scrollTop / scrollRange) * 100)
}

export function episodeIsRead(episodesRead: number[], n: number, percent: number): boolean {
  return episodesRead.includes(n) || percent >= 90
}

export function withEpisodeRead(episodesRead: number[], n: number): number[] {
  if (episodesRead.includes(n)) return episodesRead
  return [...episodesRead, n].sort((a, b) => a - b)
}

export function recapNs(episodesRead: number[], current: number): number[] {
  if (current < 2) return []
  return episodesRead.filter((n) => n < current).sort((a, b) => a - b)
}

export function recapStartsOpen(updatedAt: string | undefined, now = new Date()): boolean {
  if (!updatedAt) return true
  const then = new Date(updatedAt).getTime()
  if (Number.isNaN(then)) return true
  return now.getTime() - then > 3 * 86_400_000
}

export function serialBuyHref(buyUrl: string, slug: string): string | null {
  const raw = buyUrl.trim()
  if (raw === "") return null
  try {
    const url = new URL(raw)
    url.searchParams.set("utm_source", "10minlecture")
    url.searchParams.set("utm_medium", "app")
    url.searchParams.set("utm_campaign", slug)
    return url.toString()
  } catch {
    return null
  }
}

export function serialProgressLabel(book: Book): string {
  const total = book.totalPages
  const episode = book.progress?.episode ?? 1
  const percent = Math.round(book.progress?.percent ?? 0)
  if (total != null) return `Épisode ${episode} sur ${total} · ${percent} %`
  return `Épisode ${episode} · ${percent} %`
}

export function isSerial(book: Book): boolean {
  return book.source === "feuilleton" && typeof book.slug === "string" && book.slug !== ""
}

export function resumeSerialHref(book: Book): string | null {
  if (!isSerial(book) || !book.slug) return null
  const episode = book.progress?.episode ?? 1
  return storyHref(book.slug, episode)
}

export function upsertSerialBook(
  books: Book[],
  meta: SerialMeta,
  now = new Date(),
): { books: Book[]; id: string; created: boolean } {
  const id = serialBookId(meta.slug)
  const existing = books.find((book) => book.id === id || (book.source === "feuilleton" && book.slug === meta.slug))
  if (existing) return { books, id: existing.id, created: false }
  const book: Book = {
    id,
    title: meta.title,
    author: meta.author,
    currentPage: 1,
    totalPages: meta.episodes.length,
    createdAt: now.toISOString(),
    recapCollapsed: false,
    source: "feuilleton",
    slug: meta.slug,
    progress: { episode: 1, percent: 0, updatedAt: now.toISOString() },
    episodesRead: [],
  }
  return { books: [book, ...books], id, created: true }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
}
