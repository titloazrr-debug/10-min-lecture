import { useEffect } from "react"
import { track } from "../lib/track.ts"


const ORIGIN = "https://10-min-lecture.vercel.app"
const PHOTO = "/fond-lecture.jpg"

type Faq = { q: string; a: string }

export function ReprendreArticle() {
  useArticleHead("/reprendre-la-lecture", REPRENDRE_FAQ)
  return (
    <article className="article">
      <h1>J’ai des livres, mais je n’arrive plus à lire</h1>
      <figure>
        <img src={PHOTO} alt="Un livre ouvert dans un coin de lecture, sous une lumière chaude." />
      </figure>
      <p>Il y a la pile sur la table de nuit. Le roman offert à Noël, encore dans son film plastique. Celui que tu as commencé cet été, avec un ticket de caisse en guise de marque-page, page 63. Et puis ceux de l’étagère, que tu regardes parfois en te disant : <em>un jour.</em></p>
      <p>Tu aimes lire. Tu le sais. Tu te souviens de livres dévorés en deux soirs, de ce moment où on ne voit plus les mots, seulement l’histoire. Alors pourquoi est-ce devenu si difficile ?</p>
      <p>Si tu te reconnais, sache d’abord une chose : ce n’est pas que tu as « perdu » le goût de lire. Le plus souvent, c’est que la lecture est devenue plus difficile à <em>commencer</em> que le reste. Et ça, on peut y remédier.</p>

      <h2>Ce que j’ai vécu</h2>
      <p>Je m’appelle Tim. Pendant longtemps, j’ai acheté des livres plus vite que je ne les lisais. J’avais l’envie, j’avais les livres, j’avais même le temps, en vrai. Mais le soir, entre la fatigue et le téléphone, le livre restait fermé. Et chaque livre non lu ajoutait un petit poids : la pile devenait un reproche plutôt qu’une promesse.</p>
      <p>Ce qui a changé, ce n’est pas une grande résolution. C’est d’arrêter de vouloir « me remettre à lire » et de me dire simplement : <em>ce soir, 10 minutes</em>. Puis de noter où j’en étais, pour que le lendemain, reprendre soit facile.</p>

      <h2>Pourquoi c’est devenu difficile</h2>
      <p>Quelques raisons reviennent souvent, et aucune n’est un défaut de caractère.</p>
      <p><strong>Commencer coûte plus que continuer.</strong> Ouvrir un livre demande de retrouver sa page, de se replonger dans l’histoire, de se concentrer. Le téléphone, lui, ne demande rien pour démarrer. Le soir, on choisit naturellement ce qui coûte le moins.</p>
      <p><strong>On a oublié où on en était.</strong> Après deux semaines sans lire, on ne se souvient plus de qui est qui. Alors on hésite à reprendre, ou on se dit qu’il faudrait recommencer depuis le début… et on ne fait ni l’un ni l’autre.</p>
      <p><strong>Le livre n’est pas le bon, en ce moment.</strong> Parfois, on s’accroche à un livre qu’on « devrait » finir. Il bloque tous les autres.</p>
      <p><strong>On attend le moment parfait.</strong> Une heure tranquille, un dimanche pluvieux, des vacances. Ce moment arrive rarement, et en attendant, on ne lit pas.</p>

      <h2>7 idées pour t’y remettre en douceur</h2>
      <ol>
        <li><strong>Pense en minutes, pas en livres.</strong> « Lire ce livre » paraît énorme. « Lire 10 minutes ce soir » est faisable, même fatigué. Souvent, l’envie de continuer arrive en lisant.</li>
        <li><strong>Reprends là où tu t’es arrêté, sans tout relire.</strong> Feuillette les deux ou trois pages d’avant, relis la dernière scène, et repars. Tu retrouveras le fil plus vite que tu ne crois.</li>
        <li><strong>Laisse une trace à chaque fin de lecture.</strong> Ta page, et une phrase : « Le frère est revenu, personne ne le croit. » Le lendemain, cette ligne suffit à te remettre dans l’histoire.</li>
        <li><strong>Rends le livre visible et facile à prendre.</strong> Sur l’oreiller, sur le canapé, dans ton sac. Celui qu’on voit en premier gagne souvent.</li>
        <li><strong>Choisis un livre qui te fait envie maintenant.</strong></li>
        <li><strong>Accepte les petites lectures.</strong> Cinq minutes dans le bus, trois pages avant de dormir. Ça compte. Un livre avance aussi comme ça.</li>
        <li><strong>Garde un moment à toi, même court.</strong> Le soir avant d’ouvrir les réseaux, le matin avec le café, la pause de midi. Un moment régulier, même petit, finit par devenir un rendez-vous qu’on attend.</li>
      </ol>

      <h2 id="choisir">Et si tu ne sais pas quoi lire ?</h2>
      <p>C’est fréquent, et c’est souvent ce qui bloque tout. Quelques pistes :</p>
      <ul>
        <li><strong>Abandonner un livre, c’est permis.</strong> Si tu bloques depuis des semaines sur le même, pose-le. Tu pourras y revenir plus tard, ou jamais. Ce n’est pas un échec.</li>
        <li><strong>Relis un livre que tu as aimé.</strong> On sous-estime le plaisir de la relecture : pas de surprise à craindre, juste le bonheur de retrouver une voix.</li>
        <li><strong>Va vers le court et le prenant.</strong> Une nouvelle, un polar, une BD, un roman léger. Le but, c’est de retrouver la sensation de <em>vouloir</em> tourner la page.</li>
        <li><strong>Demande autour de toi.</strong> Le libraire, la bibliothèque, une amie qui lit. « Qu’est-ce que tu as lu que tu n’arrivais pas à lâcher ? » est une excellente question.</li>
      </ul>
      <p>On sait, de façon générale, que lire régulièrement, même un peu, aide à garder le plaisir de lire et la concentration [source à ajouter]. Pas besoin de chiffres pour le vérifier sur toi : essaie une semaine.</p>

      <h2>Un petit outil pour t’aider</h2>
      <p>J’ai créé <strong>10 min lecture</strong> pour rendre la reprise plus simple. Tu ajoutes ton livre et ta page, tu lances 10 minutes, tu poses ton téléphone. À la fin, tu notes ta page et, si tu veux, une phrase à retenir. Pas de compte, pas de pub : tes lectures restent sur ton appareil.</p>
      <p><a className="btn btn-primary" href="/app" onClick={() => track("cta_click", { placement: "article-reprendre" })}>Reprendre mon livre</a></p>
      <FaqList items={REPRENDRE_FAQ} />
    </article>
  )
}

export function ScrollArticle() {
  useArticleHead("/lire-au-lieu-de-scroller", SCROLL_FAQ)
  return (
    <article className="article">
      <h1>Je scrolle au lieu de lire</h1>
      <p>Le livre est là, sur la table de nuit. Tu voulais en lire quelques pages. Puis le téléphone est dans la main, et le soir s’en va.</p>
      <p>Ça arrive à tout le monde. Le téléphone ne demande rien pour démarrer. Le livre, si : retrouver la page, se rappeler l’histoire, rester un moment. Le soir, on prend souvent ce qui s’ouvre tout seul.</p>

      <section>
        <p className="kicker">Le canapé</p>
        <h2>« Je regarde juste cinq minutes… »</h2>
        <p>C’est souvent là que tout commence. On s’installe, on prend le téléphone sans vraiment y penser. Quand on relève les yeux, la soirée a bien avancé.</p>
        <p>Pose ton livre à l’endroit où tu attrapes habituellement ton téléphone. Et commence par deux pages.</p>
        <img className="scene-wide" src="/situations/canape.jpg" width={1122} height={1402} alt="Sur un canapé, de 21 h 00 à 22 h 17 : le livre est toujours fermé. « Et si tu commençais par ton livre ? »" />
      </section>

      <h2>Ce que j’ai vécu</h2>
      <p>Le soir, je finissais souvent sur mon téléphone, avec un petit regret. Autour de moi, beaucoup me racontaient la même chose.</p>
      <p>Je ne voulais pas me faire la morale. Je voulais seulement changer l’ordre : le livre d’abord, dix minutes, et le téléphone ensuite s’il reste de la place.</p>
      <p><strong>Le téléphone est déjà allumé.</strong> Un coup d’œil à l’heure, un message, et la soirée bascule. Le livre attend encore qu’on le prenne. Il ne demande pas de s’y remettre : pas de page à chercher, pas de « qui est qui ».</p>

      <section>
        <p className="kicker">Dans les transports</p>
        <h2>Ton prochain chapitre se cache peut-être entre deux arrêts.</h2>
        <p>Dans le bus, il y a toujours ce petit moment où l’on sort son téléphone presque sans y penser. On regarde les messages, on fait défiler quelques vidéos, puis on arrive.</p>
        <div className="scene-split">
          <img src="/situations/transport.jpg" width={1122} height={1402} alt="Dans un bus, de 08 h 07 à 08 h 34 : le livre reste dans le sac. « Ce trajet pouvait être quelques pages. »" />
          <div>
            <p>Avec un livre dans le sac, vingt minutes suffisent parfois pour avancer d’un chapitre. Pas besoin de se fixer un objectif. Juste ouvrir le livre au lieu de l’appli habituelle.</p>
            <p>Et si tu dois descendre au milieu d’une scène ? Tant mieux. Tu auras envie de reprendre au prochain trajet.</p>
            <p>Garde le livre accessible. Pas tout au fond, sous tes affaires.</p>
          </div>
        </div>
      </section>

      <aside className="scene-aside">
        <img src="/situations/attente.jpg" width={1122} height={1402} alt="En salle d’attente, de 14 h 02 à 14 h 29 : le livre est sur les genoux. « Tu avais apporté ton livre pour ça. »" />
        <div>
          <p className="kicker">En salle d’attente</p>
          <h2>Tu avais justement apporté ton livre pour ça.</h2>
          <p>Le rendez-vous est en retard. Le réflexe est d’ouvrir le téléphone, alors qu’il reste peut-être un quart d’heure.</p>
          <p>Dès que tu t’assieds, ouvre ton livre avant les notifications.</p>
        </div>
      </aside>

      <section>
        <p className="kicker">Avant de dormir</p>
        <h2>Le fameux « encore une vidéo »</h2>
        <p>On devait se coucher tôt. Mais la vidéo suivante démarre, puis encore une autre.</p>
        <p>Essaie quelques pages avant de toucher au téléphone. Et si la fatigue est déjà là, mieux vaut dormir que se forcer à lire.</p>
        <p>On parle beaucoup des écrans le soir et du sommeil. Je ne mets pas de chiffre à la place d’une étude : [source à ajouter].</p>
        <img className="scene-wide" src="/situations/lit.jpg" width={1122} height={1402} alt="Dans un lit, de 22 h 31 à 23 h 48 : le téléphone reste allumé, le livre fermé sur la table de nuit. « Tu voulais dormir plus tôt. »" />
      </section>

      <h2>Un minuteur, une page, une phrase</h2>
      <p>J’ai fait <strong>10 min lecture</strong> pour ce geste. C’est un minuteur. Tu notes ta page. Tu peux garder une note, ou une phrase à retenir. Pas de compte : tes lectures restent sur ton appareil.</p>
      <p><a className="btn btn-primary" href="/app" onClick={() => track("cta_click", { placement: "article-scroll" })}>Reprendre mon livre</a></p>
      <p>Tu as des livres qui attendent ? Lis aussi : <a href="/reprendre-la-lecture">J’ai des livres, mais je n’arrive plus à lire</a></p>
      <FaqList items={SCROLL_FAQ} />
    </article>
  )
}

const REPRENDRE_FAQ: Faq[] = [
  {
    q: "Faut-il recommencer un livre depuis le début si je l’ai laissé longtemps ?",
    a: "Rarement. Relis la dernière scène, regarde tes notes si tu en as, et repars. Si vraiment tu es perdu, reprends au début du chapitre.",
  },
  {
    q: "J’ai honte de ma pile de livres non lus…",
    a: "Tu n’as pas à en avoir honte. Une pile, c’est une réserve d’histoires. Choisis-en un seul, celui qui te fait envie ce soir.",
  },
  {
    q: "10 minutes, ce n’est pas trop peu ?",
    a: "C’est un point de départ, pas une limite. Certains soirs, tu t’arrêteras à 10 minutes. D’autres, tu ne verras pas l’heure passer.",
  },
  {
    q: "Ça marche avec les livres papier ?",
    a: "Oui, c’est pensé pour ça. L’app sert de minuteur et de carnet ; ton livre reste un vrai livre.",
  },
  {
    q: "Et si je n’aime plus lire ?",
    a: "Peut-être que tu n’as pas encore retrouvé le bon livre. Essaie quelque chose de très différent de d’habitude. Et si ça ne vient pas, ce n’est pas grave : le plaisir ne se force pas.",
  },
]

const SCROLL_FAQ: Faq[] = [
  {
    q: "Je peux lire même si j’ai déjà ouvert le téléphone ?",
    a: "Oui. Dix minutes comptent encore. L’idée est d’ouvrir le livre avant, pas de réussir tous les soirs.",
  },
  {
    q: "Faut-il mettre le téléphone dans une autre pièce ?",
    a: "Si ça t’aide, oui. Le retourner à côté du livre suffit souvent. Choisis le geste que tu referas demain.",
  },
  {
    q: "Et si je m’endors au bout de deux pages ?",
    a: "Alors tu as lu. Note la page, tu reprendras là.",
  },
]

function FaqList({ items }: { items: Faq[] }) {
  return (
    <section className="article-faq">
      <h2>Questions fréquentes</h2>
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </section>
  )
}

function useArticleHead(path: string, faqs: Faq[]) {
  useEffect(() => {
    const canonical = document.createElement("link")
    canonical.rel = "canonical"
    canonical.href = `${ORIGIN}${path}`
    document.head.appendChild(canonical)

    const data = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    }
    const script = document.createElement("script")
    script.type = "application/ld+json"
    script.dataset.article = path
    script.textContent = JSON.stringify(data)
    document.head.appendChild(script)

    setMeta("property", "og:url", `${ORIGIN}${path}`)
    setMeta("property", "og:image", `${ORIGIN}${PHOTO}`)
    return () => {
      canonical.remove()
      script.remove()
    }
  }, [path, faqs])
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!element) {
    element = document.createElement("meta")
    element.setAttribute(attr, key)
    document.head.appendChild(element)
  }
  element.setAttribute("content", content)
}
