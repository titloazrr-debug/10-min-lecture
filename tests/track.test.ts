import assert from "node:assert/strict"
import { test } from "node:test"
import { analyticsAllowed, cleanProps, durationBucket, returnIsDue, track, visitSource } from "../src/lib/track.ts"

test("la mesure reste anonyme et muette sans fournisseur", () => {
  assert.equal(durationBucket(119), "<2")
  assert.equal(durationBucket(120), "2-10")
  assert.equal(durationBucket(599), "2-10")
  assert.equal(durationBucket(600), "10+")
  assert.equal(visitSource("?utm_source=Pinterest"), "pinterest")
  assert.equal(visitSource("?utm_source=newsletter"), undefined)
  assert.deepEqual(cleanProps({ placement: "hero", title: "Dune", page: 12, author: "Herbert", text: "secret" }), { placement: "hero" })
  assert.equal(track("visit", { page: "/", title: "Dune" }), false)
  assert.equal(track("livre", { title: "Dune" }), false)
  const week = 7 * 86_400_000
  assert.equal(returnIsDue("2026-10-01T00:00:00.000Z", false, Date.parse("2026-10-08T00:00:00.000Z")), true)
  assert.equal(returnIsDue("2026-10-01T00:00:00.000Z", true, Date.parse("2026-10-08T00:00:00.000Z")), false)
  assert.equal(returnIsDue("2026-10-01T00:00:00.000Z", false, Date.parse("2026-10-07T00:00:00.000Z")), false)
  assert.equal(returnIsDue(null, false, week), false)
  assert.equal(analyticsAllowed(() => null), true)
  assert.equal(analyticsAllowed(() => "{\"settings\":{\"analytics\":false}}"), false)
  assert.equal(analyticsAllowed(() => "{"), true)
})
