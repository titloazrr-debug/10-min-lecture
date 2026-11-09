import { useState } from "react"
import { track } from "../lib/track.ts"
import { storyHref } from "../serial/catalog.ts"
import { loadSerialMeta } from "../serial/load.ts"
import { DECOR_LABELS, decorsForGenre, recommendSlug, type DecorChoice, type GenreChoice } from "../serial/quiz.ts"
import type { SerialMeta } from "../serial/catalog.ts"

export function QuizPage() {
  const [step, setStep] = useState<"genre" | "decor" | "result">("genre")
  const [genre, setGenre] = useState<GenreChoice | null>(null)
  const [meta, setMeta] = useState<SerialMeta | null>(null)

  async function showResult(nextGenre: GenreChoice, decor?: DecorChoice) {
    const slug = recommendSlug(nextGenre, decor)
    const next = await loadSerialMeta(slug)
    setMeta(next)
    setStep("result")
  }

  function pickGenre(choice: GenreChoice) {
    setGenre(choice)
    track("cta_click", { placement: "quiz-genre" })
    const decors = decorsForGenre(choice)
    if (decors.length <= 1) {
      void showResult(choice, decors[0])
      return
    }
    setStep("decor")
  }

  function pickDecor(choice: DecorChoice) {
    if (!genre) return
    track("cta_click", { placement: "quiz-decor" })
    void showResult(genre, choice)
  }

  const decors = genre ? decorsForGenre(genre) : []

  return (
    <main className="site-main">
      <p className="kicker">Découvrir</p>
      <h1>Quelle histoire ce soir ?</h1>
      <p className="site-lede">Deux questions. Une série. Dix minutes pour commencer.</p>

      {step === "genre" ? (
        <section className="card stack">
          <h2>Quel genre d’évasion ce soir ?</h2>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => pickGenre("rire")}>
            🎭 Rire et légèreté
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => pickGenre("frisson")}>
            🔪 Frisson
          </button>
        </section>
      ) : null}

      {step === "decor" ? (
        <section className="card stack">
          <h2>Quel décor ?</h2>
          {decors.map((decor) => (
            <button key={decor} type="button" className="btn btn-secondary btn-block" onClick={() => pickDecor(decor)}>
              {DECOR_LABELS[decor]}
            </button>
          ))}
        </section>
      ) : null}

      {step === "result" ? (
        <section className="card stack">
          {meta ? (
            <>
              <p className="kicker">{meta.genre}</p>
              <h2>{meta.title}</h2>
              <p>{meta.pitch}</p>
              <a className="btn btn-primary" href={`${storyHref(meta.slug, 1)}?session=10`} onClick={() => track("cta_click", { placement: "quiz-start" })}>
                Commencer les 10 premières minutes
              </a>
              <a href={storyHref(meta.slug)}>Voir la fiche</a>
            </>
          ) : (
            <p>Cette histoire n’est pas encore en ligne.</p>
          )}
        </section>
      ) : null}
    </main>
  )
}
