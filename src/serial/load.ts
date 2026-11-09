import { asSerialIndex, asSerialMeta, isPublicChapterFile, type SerialIndexItem, type SerialMeta } from "./catalog.ts"

export async function loadSerialIndex(): Promise<SerialIndexItem[]> {
  const value = await getJson("/histoires/catalog.json")
  return asSerialIndex(value)
}

export async function loadSerialMeta(slug: string): Promise<SerialMeta | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  try {
    const value = await getJson(`/histoires/${slug}/meta.json`)
    const meta = asSerialMeta(value)
    if (!meta || meta.slug !== slug) return null
    return meta
  } catch {
    return null
  }
}

export async function loadSerialText(slug: string, file: string): Promise<string | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  if (file.includes("..") || file.includes("/")) return null
  if (!isPublicChapterFile(file)) return null
  try {
    const response = await fetch(`/histoires/${slug}/${file}`)
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(path)
  if (!response.ok) throw new Error("introuvable")
  return response.json()
}
