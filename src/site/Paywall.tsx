import { useState, type FormEvent } from "react"
import { track } from "../lib/track.ts"
import { serialBuyHref } from "../serial/catalog.ts"
import { addWaitlist, isValidEmail, parseWaitlist, WAITLIST_KEY } from "../serial/waitlist.ts"

export function Paywall({ slug, buyUrl }: { slug: string; buyUrl: string }) {
  const [email, setEmail] = useState("")
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const buy = serialBuyHref(buyUrl, slug)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!isValidEmail(email)) {
      setError("Indique une adresse email valide.")
      return
    }
    const current = parseWaitlist(localStorage.getItem(WAITLIST_KEY))
    localStorage.setItem(WAITLIST_KEY, JSON.stringify(addWaitlist(current, email, slug)))
    setError("")
    setSaved(true)
    track("cta_click", { placement: "waitlist" })
  }

  return (
    <section className="card stack paywall">
      <h2>La suite est derrière la porte</h2>
      <p>Les deux premiers chapitres sont libres. Pour continuer :</p>
      {buy ? (
        <a
          className="btn btn-primary btn-block"
          href={buy}
          rel="noreferrer"
          target="_blank"
          onClick={() => track("buy_click", { slug })}
        >
          ⚡ Achat immédiat — 2,99 €
        </a>
      ) : (
        <p className="hint">⚡ Achat immédiat — 2,99 €. Le paiement n’est pas encore ouvert.</p>
      )}
      {saved ? (
        <p>C’est noté. Ton adresse reste sur cet appareil. L’envoi du chapitre 3 le dimanche soir n’est pas encore en place.</p>
      ) : (
        <form className="stack" onSubmit={submit}>
          <label>
            💌 Reçois le chapitre 3 dimanche soir
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          {error ? <p className="hint error" role="alert">{error}</p> : null}
          <button type="submit" className="btn btn-ghost btn-block">Laisser mon email</button>
        </form>
      )}
    </section>
  )
}
