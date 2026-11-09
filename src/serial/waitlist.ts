export const WAITLIST_KEY = "10ml:waitlist"

export type WaitlistEntry = {
  email: string
  slug: string
  at: string
}

export function isValidEmail(value: string): boolean {
  const email = value.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function parseWaitlist(raw: string | null): WaitlistEntry[] {
  if (raw == null || raw.trim() === "") return []
  try {
    const value = JSON.parse(raw) as unknown
    if (!Array.isArray(value)) return []
    return value.flatMap((item) => {
      if (item == null || typeof item !== "object") return []
      const record = item as Record<string, unknown>
      if (typeof record.email !== "string" || typeof record.slug !== "string" || typeof record.at !== "string") return []
      return [{ email: record.email, slug: record.slug, at: record.at }]
    })
  } catch {
    return []
  }
}

export function addWaitlist(
  entries: WaitlistEntry[],
  email: string,
  slug: string,
  now = new Date(),
): WaitlistEntry[] {
  const clean = email.trim().toLowerCase()
  if (entries.some((entry) => entry.email === clean && entry.slug === slug)) return entries
  return [...entries, { email: clean, slug, at: now.toISOString() }]
}
