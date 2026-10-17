import assert from "node:assert/strict"
import { test } from "node:test"
import { homeRedirectTarget, libraryPresent, normalizePath } from "../src/site/paths.ts"

test("un lien profond sur l’accueil part vers /app", () => {
  assert.equal(homeRedirectTarget("/", "", ""), null)
  assert.equal(homeRedirectTarget("/", "?livre=1", ""), "/app?livre=1")
  assert.equal(homeRedirectTarget("/", "", "#session"), "/app#session")
  assert.equal(homeRedirectTarget("/", "?livre=1", "#session"), "/app?livre=1#session")
  assert.equal(homeRedirectTarget("/app", "?livre=1", ""), null)
  assert.equal(normalizePath("/app/"), "/app")
})

test("le bandeau ne s’affiche que s’il y a une bibliothèque", () => {
  assert.equal(libraryPresent(null), false)
  assert.equal(libraryPresent('{"books":[],"notes":[],"sessions":[]}'), false)
  assert.equal(libraryPresent('{"books":[{"id":"b1"}]}'), true)
  assert.equal(libraryPresent("{"), true)
})
