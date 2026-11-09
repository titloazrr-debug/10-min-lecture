import { track } from "../lib/track.ts"
import { serialBuyHref } from "../serial/catalog.ts"

export function Paywall({ slug, buyUrl }: { slug: string; buyUrl: string }) {
  const buy = serialBuyHref(buyUrl, slug)

  return (
    <section className="card stack paywall">
      <h2>La suite n’est pas encore en vente</h2>
      <p>Les deux premiers chapitres sont libres. L’achat et l’envoi des suivants ne sont pas ouverts.</p>
      {buy ? (
        <a
          className="btn btn-primary btn-block"
          href={buy}
          rel="noreferrer"
          target="_blank"
          onClick={() => track("buy_click", { slug })}
        >
          Continuer chez l’éditeur
        </a>
      ) : null}
    </section>
  )
}
