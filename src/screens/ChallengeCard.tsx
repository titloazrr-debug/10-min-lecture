import { useState } from "react"
import { challengeIsDue, challengeReply } from "../logic.ts"
import { useStore } from "../store.tsx"
import type { ChallengeAnswer } from "../types.ts"

const HIDE_KEY = "10ml:challenge-hide"

const choices: { answer: ChallengeAnswer; label: string }[] = [
  { answer: "oui", label: "Oui" },
  { answer: "un peu", label: "Un peu" },
  { answer: "non", label: "Pas vraiment" },
]

export function ChallengeCard() {
  const { data, answerChallenge } = useStore()
  const [hidden, setHidden] = useState(() => sessionStorage.getItem(HIDE_KEY) === "1")
  const [reply, setReply] = useState("")
  if (hidden) return null
  if (!reply && !challengeIsDue(data.challenge)) return null

  function hide() {
    sessionStorage.setItem(HIDE_KEY, "1")
    setHidden(true)
  }

  function choose(answer: ChallengeAnswer) {
    answerChallenge(answer)
    setReply(challengeReply(answer))
  }

  return (
    <section className="card stack challenge-card">
      {reply ? (
        <p>{reply}</p>
      ) : (
        <>
          <h2 className="book-title">As-tu eu envie de continuer ton livre ?</h2>
          <div className="challenge-actions">
            {choices.map((choice) => (
              <button key={choice.answer} type="button" className="btn btn-ghost" onClick={() => choose(choice.answer)}>
                {choice.label}
              </button>
            ))}
          </div>
        </>
      )}
      <button type="button" className="text-btn" onClick={hide}>Fermer</button>
    </section>
  )
}
