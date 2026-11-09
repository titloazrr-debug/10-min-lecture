import assert from "node:assert/strict"
import { test } from "node:test"
import {
  asSerialMeta,
  isLocked,
  isPublicChapterFile,
  parseStoryPath,
  recapNs,
  resumeEpisode,
  scrollPercent,
  serialBuyHref,
  serialBookId,
  storyHref,
  upsertSerialBook,
  wantsTenMinuteSession,
} from "../src/serial/catalog.ts"
import { renderMarkdown } from "../src/serial/markdown.ts"
import { decorsForGenre, recommendSlug } from "../src/serial/quiz.ts"
import { addWaitlist, isValidEmail, parseWaitlist } from "../src/serial/waitlist.ts"

test("les routes /histoires/slug et /histoires/slug/n sont reconnues", () => {
  assert.deepEqual(parseStoryPath("/histoires/la-maison-qui-ecoutait"), { slug: "la-maison-qui-ecoutait", episode: null })
  assert.deepEqual(parseStoryPath("/histoires/la-maison-qui-ecoutait/2"), { slug: "la-maison-qui-ecoutait", episode: 2 })
  assert.deepEqual(parseStoryPath("/lire/la-maison-qui-ecoutait/1"), { slug: "la-maison-qui-ecoutait", episode: 1 })
  assert.equal(parseStoryPath("/lire-au-lieu-de-scroller"), null)
  assert.equal(parseStoryPath("/histoires"), null)
  assert.equal(storyHref("lavare-2052", 1), "/histoires/lavare-2052/1")
  assert.equal(wantsTenMinuteSession("?session=10"), true)
  assert.equal(wantsTenMinuteSession("?session=open"), false)
})

test("les chapitres après le 2e sont verrouillés", () => {
  assert.equal(isLocked(1), false)
  assert.equal(isLocked(2), false)
  assert.equal(isLocked(3), true)
  assert.equal(isLocked(5, 2, true), false)
  assert.equal(isPublicChapterFile("01.md"), true)
  assert.equal(isPublicChapterFile("01.recap.md"), true)
  assert.equal(isPublicChapterFile("03.md"), false)
  assert.equal(resumeEpisode(5, 2, false), 2)
  assert.equal(resumeEpisode(5, 2, true), 5)
  assert.equal(resumeEpisode(1, 2, false), 1)
})

test("le quiz oriente vers une série existante", () => {
  assert.equal(recommendSlug("frisson", "chalet"), "la-maison-qui-ecoutait")
  assert.equal(recommendSlug("frisson"), "la-maison-qui-ecoutait")
  assert.equal(recommendSlug("rire", "administration"), "abel-doit-nuire")
  assert.equal(recommendSlug("rire", "grece"), "lodyssee-fiscale")
  assert.equal(recommendSlug("rire", "colonie"), "lavare-2052")
  assert.equal(recommendSlug("rire", "chalet"), "lavare-2052")
  assert.deepEqual(decorsForGenre("frisson"), ["chalet"])
  assert.deepEqual(decorsForGenre("rire"), ["colonie", "administration", "grece"])
})

test("la liste d’attente reste locale et dédupliquée", () => {
  assert.equal(isValidEmail("lecteur@example.com"), true)
  assert.equal(isValidEmail("pas-un-email"), false)
  const first = addWaitlist([], "Lecteur@example.com", "lavare-2052", new Date("2026-11-09T00:00:00.000Z"))
  const second = addWaitlist(first, "lecteur@example.com", "lavare-2052")
  assert.equal(second.length, 1)
  assert.deepEqual(parseWaitlist(JSON.stringify(first)), first)
})

test("le markdown n’injecte pas de HTML et garde les citations", () => {
  const html = renderMarkdown("# Titre\n\nUn **mot** et un <script>x</script>.\n\n> Ce soir, la porte a attendu.")
  assert.match(html, /<h1>Titre<\/h1>/)
  assert.match(html, /<strong>mot<\/strong>/)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /<blockquote>/)
})

test("l’achat reste un lien externe avec UTM, jamais un paiement", () => {
  assert.equal(serialBuyHref("", "la-maison-qui-ecoutait"), null)
  assert.equal(
    serialBuyHref("https://boutique.example/livre", "la-maison-qui-ecoutait"),
    "https://boutique.example/livre?utm_source=10minlecture&utm_medium=app&utm_campaign=la-maison-qui-ecoutait",
  )
})

test("un feuilleton n’est ajouté qu’une fois dans Livres", () => {
  const meta = asSerialMeta({
    slug: "la-maison-qui-ecoutait",
    title: "La maison qui écoutait",
    author: "Tim",
    buyUrl: "",
    episodes: [{ n: 1, title: "La porte", file: "01.md" }],
  })
  assert.ok(meta)
  if (!meta) return
  const first = upsertSerialBook([], meta, new Date("2026-11-09T00:00:00.000Z"))
  assert.equal(first.created, true)
  assert.equal(first.id, serialBookId("la-maison-qui-ecoutait"))
  assert.equal(first.books[0]?.source, "feuilleton")
  const second = upsertSerialBook(first.books, meta)
  assert.equal(second.created, false)
  assert.equal(second.books.length, 1)
})

test("les récaps ne concernent que les épisodes déjà lus, avant l’épisode ouvert", () => {
  assert.deepEqual(recapNs([1, 2], 3), [1, 2])
  assert.deepEqual(recapNs([1, 3], 3), [1])
  assert.deepEqual(recapNs([1, 2], 1), [])
  assert.equal(scrollPercent(50, 100), 50)
  assert.equal(scrollPercent(0, 0), 0)
})

test("un fichier d’épisode hors dossier est refusé", () => {
  assert.equal(asSerialMeta({
    slug: "x",
    title: "X",
    episodes: [{ n: 1, title: "A", file: "../secret.md" }],
  }), null)
})
