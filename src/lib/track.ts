const SOURCES = new Set(["google", "pinterest", "tiktok", "instagram"])
const FORBIDDEN = new Set(["title", "author", "text", "page", "book", "note", "bookId", "sessionId"])

export type DurationBucket = "<2" | "2-10" | "10+"

export const RETURN_AFTER_MS = 7 * 86_400_000

type AnalyticsEnv = {
  provider: string
  plausibleDomain: string
  umamiSrc: string
  umamiWebsiteId: string
}

export function durationBucket(seconds: number): DurationBucket {
  if (seconds < 120) return "<2"
  if (seconds < 600) return "2-10"
  return "10+"
}

export function visitSource(search: string): string | undefined {
  const source = new URLSearchParams(search).get("utm_source")?.trim().toLowerCase()
  if (source && SOURCES.has(source)) return source
  return undefined
}

export function returnIsDue(firstSeenAt: string | null, sent: boolean, now = Date.now()): boolean {
  if (sent || !firstSeenAt) return false
  const seen = new Date(firstSeenAt).getTime()
  if (Number.isNaN(seen)) return false
  return now - seen >= RETURN_AFTER_MS
}

export function cleanProps(props: Record<string, unknown> | undefined): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {}
  if (!props) return clean
  for (const [key, value] of Object.entries(props)) {
    if (FORBIDDEN.has(key)) continue
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") clean[key] = value
  }
  return clean
}

function readEnv(): AnalyticsEnv {
  const env = import.meta.env
  const read = (key: string) => (typeof env?.[key] === "string" ? env[key].trim() : "")
  return {
    provider: read("VITE_ANALYTICS_PROVIDER").toLowerCase(),
    plausibleDomain: read("VITE_PLAUSIBLE_DOMAIN"),
    umamiSrc: read("VITE_UMAMI_SRC"),
    umamiWebsiteId: read("VITE_UMAMI_WEBSITE_ID"),
  }
}

export function analyticsAllowed(readItem: (key: string) => string | null = defaultRead): boolean {
  try {
    const raw = readItem("10ml:data")
    if (!raw) return true
    const data = JSON.parse(raw) as { settings?: { analytics?: unknown } }
    return data.settings?.analytics !== false
  } catch {
    return true
  }
}

function defaultRead(key: string): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(key)
}

/** Envoie un événement anonyme. Retourne false si rien n’est parti. */
export function track(event: string, props?: Record<string, unknown>): boolean {
  if (!knownEvent(event)) return false
  if (!analyticsAllowed()) return false
  const env = readEnv()
  if (env.provider !== "plausible" && env.provider !== "umami" && env.provider !== "vercel") return false
  try {
    return dispatch(env, event, cleanProps(props))
  } catch {
    return false
  }
}

function knownEvent(event: string): boolean {
  return event === "visit"
    || event === "cta_click"
    || event === "session_started"
    || event === "session_finished"
    || event === "return_7d"
    || event === "note_added"
    || event === "challenge_answer"
}

function dispatch(env: AnalyticsEnv, event: string, props: Record<string, string | number | boolean>): boolean {
  if (typeof document === "undefined") return false
  if (env.provider === "plausible") return sendPlausible(env.plausibleDomain, event, props)
  if (env.provider === "umami") return sendUmami(env.umamiSrc, env.umamiWebsiteId, event, props)
  return sendVercel(event, props)
}

type PlausibleFn = ((event: string, options?: { props: Record<string, string | number | boolean> }) => void) & { q?: unknown[] }

function sendPlausible(domain: string, event: string, props: Record<string, string | number | boolean>): boolean {
  if (!domain) return false
  const win = window as Window & { plausible?: PlausibleFn }
  win.plausible = win.plausible || function plausibleQueue(...args: unknown[]) {
    const queued = win.plausible as PlausibleFn
    queued.q = queued.q || []
    queued.q.push(args)
  }
  if (!document.querySelector("script[data-analytics='plausible']")) {
    const script = document.createElement("script")
    script.defer = true
    script.dataset.domain = domain
    script.dataset.analytics = "plausible"
    script.src = "https://plausible.io/js/script.js"
    document.head.appendChild(script)
  }
  win.plausible(event, { props })
  return true
}

function sendUmami(src: string, websiteId: string, event: string, props: Record<string, string | number | boolean>): boolean {
  if (!src || !websiteId) return false
  if (!document.querySelector("script[data-analytics='umami']")) {
    const script = document.createElement("script")
    script.defer = true
    script.dataset.websiteId = websiteId
    script.dataset.analytics = "umami"
    script.src = src
    document.head.appendChild(script)
  }
  const umami = (window as Window & { umami?: { track: (name: string, data: Record<string, string | number | boolean>) => void } }).umami
  if (!umami) return false
  umami.track(event, props)
  return true
}

function sendVercel(event: string, props: Record<string, string | number | boolean>): boolean {
  const win = window as Window & { va?: (...args: unknown[]) => void; vaq?: unknown[] }
  win.va = win.va || function vaQueue(...args: unknown[]) {
    (win.vaq = win.vaq || []).push(args)
  }
  if (!document.querySelector("script[data-analytics='vercel']")) {
    const script = document.createElement("script")
    script.defer = true
    script.dataset.analytics = "vercel"
    script.src = "/_vercel/insights/script.js"
    document.head.appendChild(script)
  }
  win.va("event", { name: event, data: props })
  return true
}
