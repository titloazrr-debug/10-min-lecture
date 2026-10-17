import type { ReadingMode } from "./types.ts"

export const ACTIVE_KEY = "10ml:active"
export const TEN_MINUTES_MS = 600_000

export type ActiveSession = {
  bookId: string
  mode: ReadingMode
  startedAt: number
  pausedAt: number | null
  pausedTotalMs: number
  targetMin: 10 | null
  continued: boolean
  signaled: boolean
}

type ActiveStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Temps de lecture réel. La pause et l’écran de décision ne comptent pas. */
export function elapsedMs(
  session: Pick<ActiveSession, "startedAt" | "pausedAt" | "pausedTotalMs">,
  now = Date.now(),
): number {
  const end = session.pausedAt ?? now
  return Math.max(0, end - session.startedAt - session.pausedTotalMs)
}

export function pauseActive(session: ActiveSession, now = Date.now()): ActiveSession {
  if (session.pausedAt != null) return session
  return { ...session, pausedAt: now }
}

export function resumeActive(session: ActiveSession, now = Date.now()): ActiveSession {
  if (session.pausedAt == null) return session
  return {
    ...session,
    pausedAt: null,
    pausedTotalMs: session.pausedTotalMs + Math.max(0, now - session.pausedAt),
  }
}

export function readActive(storage: Pick<ActiveStore, "getItem"> = browserStore()): ActiveSession | null {
  try {
    const raw = storage.getItem(ACTIVE_KEY)
    if (!raw) return null
    return parseActive(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeActive(session: ActiveSession, storage: ActiveStore = browserStore()): void {
  try {
    storage.setItem(ACTIVE_KEY, JSON.stringify(session))
  } catch {
    // Le quota ne doit pas interrompre la lecture en cours. La bibliothèque n’est pas touchée.
  }
}

export function clearActive(storage: ActiveStore = browserStore()): void {
  try {
    storage.removeItem(ACTIVE_KEY)
  } catch {
    // Rien d’autre à effacer.
  }
}

export function parseActive(value: unknown): ActiveSession | null {
  if (!isRecord(value)) return null
  if (typeof value.bookId !== "string" || value.bookId === "") return null
  if (value.mode !== "papier" && value.mode !== "ecran") return null
  if (!isTime(value.startedAt)) return null
  if (value.pausedAt != null && !isTime(value.pausedAt)) return null
  if (typeof value.pausedTotalMs !== "number" || !Number.isFinite(value.pausedTotalMs) || value.pausedTotalMs < 0) return null
  if (value.targetMin !== 10 && value.targetMin !== null) return null
  return {
    bookId: value.bookId,
    mode: value.mode,
    startedAt: value.startedAt,
    pausedAt: value.pausedAt ?? null,
    pausedTotalMs: value.pausedTotalMs,
    targetMin: value.targetMin,
    continued: value.continued === true,
    signaled: value.signaled === true,
  }
}

export function playEndChime(): void {
  const win = window as Window & { webkitAudioContext?: typeof AudioContext }
  const Ctx = window.AudioContext ?? win.webkitAudioContext
  if (!Ctx) return
  const ctx = new Ctx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "sine"
  osc.frequency.value = 528
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.05)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 1.55)
  osc.onended = () => {
    void ctx.close()
  }
}

export function vibrateEnd(): void {
  if (typeof navigator.vibrate !== "function") return
  navigator.vibrate([40, 70, 40])
}

function isTime(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value)
}

function browserStore(): ActiveStore {
  return localStorage
}
