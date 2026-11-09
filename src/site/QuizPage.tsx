import { useState } from "react"
import { track } from "../lib/track.ts"
import { storyHref } from "../serial/catalog.ts"
import { loadSerialMeta } from "../serial/load.ts"
import { recommendSlug, type DecorChoice, type GenreChoice } from "../serial/quiz.ts"
import type { SerialMeta } from "../serial/catalog.ts"

export function QuizPage() {
  const [step, setStep] = useState<"genre" | "decor" | "time" | "result">("genre")
  const [genre, setGenre] = useState<GenreChoice | null>(null)
  const [decor, setDecor] = useState<DecorChoice | null>(null)
  const [meta, setMeta] = useState<SerialMeta | null>(null)

  function pickGenre(choice: GenreChoice) {
    setGenre(choice)
    setStep("decor")
    track("cta_click", { placement: "quiz-genre" })
  }

  function pickDecor(choice: DecorChoice) {
    setDecor(choice)
    setStep("time")
    track("cta_click", { placement: "quiz-decor" })
  }

  async function pickTime() {
    if (!genre || !decor) return
    const slug = recommendSlug(genre, decor)
    const next = await loadSerialMeta(slug)
    setMeta(next)
    setStep("result")
    track("cta_click", { placement: "quiz-time" })
  }

  return (
    <main className="site-main">
      <p className="kicker">Découvrir</p>
      <h1>Quelle histoire ce soir ?</h1>
      <p className="site-lede">Trois questions. Une série. Dix minutes pour commencer.</p>

      {step === "genre" ? (
        <section className="card stack">
          <h2>Quel genre d’évasion ce soir ?</h2>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => pickGenre("rire")}>
            🎭 Rire et légèreté
          </button>
          <p className="hint">Ulysse Truffaut</p>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => pickGenre("frisson")}>
            🔪 Frisson
          </button>
          <p className="hint">T.R. Loiseau</p>
        </section>
      ) : null}

      {step === "decor" ? (
        <section className="card stack">
          <h2>Quel décor ?</h2>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => pickDecor("administration")}>Administration absurde</button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => pickDecor("grece")}>Grèce antique</button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => pickDecor("colonie")}>Colonie sous IA</button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => pickDecor("chalet")}>Chalet sous la neige</button>
        </section>
      ) : null}

      {step === "time" ? (
        <section className="card stack">
          <h2>Combien de temps ?</h2>
          <button type="button" className="btn btn-primary btn-block" onClick={() => void pickTime()}>
            10 minutes
          </button>
        </section>
      ) : null}

      {step === "result" ? (
        <section className="card stack">
          {meta ? (
            <>
              <p className="kicker">{meta.author}</p>
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
