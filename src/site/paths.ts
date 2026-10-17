export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1)
  return pathname || "/"
}

/** Ancien lien profond de l’app : query ou hash restés sur « / ». */
export function homeRedirectTarget(pathname: string, search: string, hash: string): string | null {
  if (normalizePath(pathname) !== "/") return null
  if (!search && !hash) return null
  return `/app${search}${hash}`
}

export function libraryPresent(raw: string | null): boolean {
  if (raw == null || raw.trim() === "") return false
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    const count = (key: string) => (Array.isArray(data[key]) ? data[key].length : 0)
    return count("books") + count("notes") + count("sessions") > 0
  } catch {
    return true
  }
}
