import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { parseStoryPath } from "../src/serial/catalog.ts"
import { homeRedirectTarget, libraryPresent, normalizePath } from "../src/site/paths.ts"

function jpegSize(buffer: Buffer): { width: number; height: number } | null {
  let i = 2
  while (i + 8 < buffer.length && buffer[i] === 0xff) {
    const marker = buffer[i + 1]
    const length = buffer.readUInt16BE(i + 2)
    if (marker === 0xc0 || marker === 0xc2) {
      return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) }
    }
    i += 2 + length
  }
  return null
}

test("un lien profond sur l’accueil part vers /app", () => {
  assert.equal(homeRedirectTarget("/", "", ""), null)
  assert.equal(homeRedirectTarget("/", "?livre=1", ""), "/app?livre=1")
  assert.equal(homeRedirectTarget("/", "", "#session"), "/app#session")
  assert.equal(homeRedirectTarget("/", "?livre=1", "#session"), "/app?livre=1#session")
  assert.equal(homeRedirectTarget("/app", "?livre=1", ""), null)
  assert.equal(normalizePath("/app/"), "/app")
  assert.deepEqual(parseStoryPath("/histoires/la-maison-qui-ecoutait/1"), { slug: "la-maison-qui-ecoutait", episode: 1 })
})

test("l’image de partage fait 1200 × 630", () => {
  const size = jpegSize(readFileSync("public/og-image.jpg"))
  assert.deepEqual(size, { width: 1200, height: 630 })
})

test("le bandeau ne s’affiche que s’il y a une bibliothèque", () => {
  assert.equal(libraryPresent(null), false)
  assert.equal(libraryPresent('{"books":[],"notes":[],"sessions":[]}'), false)
  assert.equal(libraryPresent('{"books":[{"id":"b1"}]}'), true)
  assert.equal(libraryPresent("{"), true)
})
