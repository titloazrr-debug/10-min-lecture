import { useEffect, useState } from "react"
import { ReprendreArticle, ScrollArticle } from "./articles.tsx"
import { track, visitSource } from "../lib/track.ts"
import { DATA_KEY, LEGACY_KEY, rememberChallenge } from "../storage.ts"
import { libraryPresent } from "./paths.ts"

const pages: Record<string, { title: string; description: string; robots?: string }> = {
  "/": {
    title: "10 min lecture — Et si tu lisais avant de scroller ?",
    description: "Pour tes livres papier : rouvre ton livre 10 minutes à la fois et retrouve où tu en étais. Sans compte.",
  },
  "/lire-au-lieu-de-scroller": {
    title: "Je scrolle au lieu de lire : comment reprendre un livre le soir",
    description: "Le soir, le téléphone gagne souvent. Comment ouvrir ton livre avant, sans morale et sans pression.",
  },
  "/reprendre-la-lecture": {
    title: "J’ai des livres, mais je n’arrive plus à lire : comment s’y remettre",
    description: "Des livres plein les étagères, et pourtant tu n’arrives plus à t’y mettre ? Quelques idées simples et douces pour retrouver le plaisir de lire, sans pression.",
  },
  "/histoires": {
    title: "Histoires",
    description: "Bientôt : des histoires à lire 10 minutes à la fois.",
    robots: "noindex",
  },
  "/confidentialite": {
    title: "Confidentialité",
    description: "On compte des visites, jamais toi. Tes livres et tes notes ne quittent pas ton appareil.",
  },
  "/defi": {
    title: "Ce soir, 10 minutes de lecture avant d’ouvrir les réseaux",
    description: "Ce soir, avant d’ouvrir les réseaux, lis 10 minutes. Une seule fois, juste pour voir. Demain, on te posera une seule question.",
  },
}

export function Site({ path }: { path: string }) {
  const page = pages[path]
  const showBanner = useLibraryBanner()

  useEffect(() => {
    document.title = page ? page.title : "Page introuvable · 10 min lecture"
    let robots = document.querySelector('meta[name="robots"]')
    if (page?.robots) {
      if (!robots) {
        robots = document.createElement("meta")
        robots.setAttribute("name", "robots")
        document.head.appendChild(robots)
      }
      robots.setAttribute("content", page.robots)
    } else if (robots) {
      robots.setAttribute("content", "index,follow")
    }
    const description = document.querySelector('meta[name="description"]')
    if (description && page) description.setAttribute("content", page.description)
    if (page) {
      setMeta("property", "og:title", page.title)
      setMeta("property", "og:description", page.description)
    }
    const source = visitSource(window.location.search)
    track("visit", source ? { page: path, source } : { page: path })
  }, [page, path])

  return (
    <div className="site">
      <SiteMenu />
      {showBanner ? (
        <a className="resume-banner" href="/app">Reprendre ma lecture →</a>
      ) : null}
      {path === "/" ? <HomePage /> : path === "/defi" ? <DefiPage /> : path === "/reprendre-la-lecture" ? <ReprendreArticle /> : path === "/lire-au-lieu-de-scroller" ? <ScrollArticle /> : path === "/confidentialite" ? <Privacy /> : page ? <SitePage path={path} title={page.title} description={page.description} /> : <Missing />}
    </div>
  )
}

const doors = [
  {
    placement: "bloc-1",
    href: "/lire-au-lieu-de-scroller",
    title: "Je scrolle au lieu de lire",
    text: "Le soir, le téléphone gagne souvent. On peut changer l’ordre.",
  },
  {
    placement: "bloc-2",
    href: "/reprendre-la-lecture",
    title: "Mes livres attendent",
    text: "Tu en as plein, et tu n’arrives plus à t’y mettre.",
  },
  {
    placement: "bloc-3",
    href: "/app",
    title: "J’ai oublié l’histoire",
    text: "Note ta page et une phrase à retenir à chaque session : la reprise devient simple.",
  },
  {
    placement: "bloc-4",
    href: "/reprendre-la-lecture#choisir",
    title: "Je ne sais pas quoi lire",
    text: "Un livre qui te fait envie maintenant vaut mieux qu’un livre que tu “devrais” lire.",
  },
]

function HomePage() {
  return (
    <main className="site-main home">
      <section className="home-hero">
        <img src="/fond-lecture.jpg" alt="Un livre ouvert sous une lampe de chevet, un téléphone retourné à côté." />
        <h1>Tu voulais lire. Puis tu as ouvert ton téléphone.</h1>
        <p className="site-lede">Ça arrive à tout le monde. 10 min lecture t’aide à rouvrir ton livre, 10 minutes à la fois, et à retrouver où tu en étais.</p>
        <a className="btn btn-primary" href="/app" onClick={() => track("cta_click", { placement: "hero" })}>Reprendre mon livre</a>
        <p className="hint">Pour tes livres papier · sans compte · tes lectures restent sur cet appareil</p>
      </section>
      <section className="home-block">
        <h2>Qu’est-ce qui t’empêche de lire ?</h2>
        <div className="door-list">
          {doors.map((door) => (
            <a key={door.placement} className="door" href={door.href} onClick={() => track("cta_click", { placement: door.placement })}>
              <strong>{door.title}</strong>
              <span>{door.text}</span>
            </a>
          ))}
        </div>
      </section>
      <section className="home-block">
        <h2>Comment ça marche</h2>
        <ol className="home-steps">
          <li>Ajoute ton livre et ta page.</li>
          <li>Lance 10 minutes, pose ton téléphone, lis.</li>
          <li>Note ta page et, si tu veux, une phrase à retenir.</li>
        </ol>
      </section>
      <section className="home-block">
        <h2>Ce qui rend 10 min lecture différent</h2>
        <ul className="plain-list">
          <li>Fait pour les livres papier.</li>
          <li>Pas de compte, pas de pub.</li>
          <li>Une app simple, faite par un lecteur.</li>
        </ul>
      </section>
      <section className="home-block">
        <h2>Pourquoi j’ai créé l’app</h2>
        <blockquote className="home-quote">
          <p>J’ai des livres plein les étagères, et l’envie de les lire. Pourtant, le soir, je finissais souvent sur mon téléphone, avec un petit regret. Je ne voulais pas me faire la morale. Je voulais juste que mon livre soit aussi facile à ouvrir que l’appli. Alors j’ai fait 10 min lecture.</p>
          <footer>— Tim</footer>
        </blockquote>
      </section>
      <section className="home-block">
        <h2>Sur le canapé, cinq minutes</h2>
        <a href="/lire-au-lieu-de-scroller" onClick={() => track("cta_click", { placement: "home-scene" })}>
          <img className="home-scene" src="/situations/canape.jpg" width={1122} height={1402} alt="Sur un canapé, de 21 h 00 à 22 h 17, le livre reste fermé pendant que le téléphone reste allumé." />
        </a>
        <p><a href="/lire-au-lieu-de-scroller">Le canapé, le trajet, la salle d’attente, le soir.</a></p>
      </section>
      <p className="footer-note">Tes lectures restent sur cet appareil. Pas de compte, pas de pub. · <a href="/confidentialite">Confidentialité</a> · Fait par Tim</p>
    </main>
  )
}

function DefiPage() {
  return (
    <main className="site-main home">
      <section className="home-hero">
        <img src="/fond-lecture.jpg" alt="Un livre ouvert sous une lampe de chevet, un téléphone retourné à côté." />
        <h1>Ce soir, 10 minutes de lecture avant d’ouvrir les réseaux</h1>
        <p className="site-lede">Ce soir, avant d’ouvrir les réseaux, lis 10 minutes. Une seule fois, juste pour voir. Demain, on te posera une seule question.</p>
        <a className="btn btn-primary" href="/app" onClick={() => { rememberChallenge(); track("cta_click", { placement: "defi" }) }}>Je relève le défi</a>
      </section>
      <p className="footer-note">Tes lectures restent sur cet appareil. Pas de compte, pas de pub. · <a href="/confidentialite">Confidentialité</a> · Fait par Tim</p>
    </main>
  )
}

function SitePage({ path, title, description }: { path: string; title: string; description: string }) {
  return (
    <main className="site-main">
      <h1>{title}</h1>
      <p className="site-lede">{description}</p>
      {path === "/histoires" ? <a className="btn btn-primary" href="/app">Ouvrir l’app</a> : null}
      <p className="footer-note">Tes lectures restent sur cet appareil. <a href="/confidentialite">Confidentialité</a></p>
    </main>
  )
}

function Privacy() {
  return (
    <main className="site-main">
      <h1>Confidentialité</h1>
      <p className="site-lede">On compte des visites, jamais toi. Tes livres et tes notes ne quittent pas ton appareil.</p>
      <p>Pas de cookies. Pas de compte. Aucun titre, aucun auteur, aucun texte de note et aucun numéro de page n’est envoyé.</p>
      <ul className="plain-list">
        <li>Visite : la page, et la source du lien quand c’est google, pinterest, tiktok ou instagram.</li>
        <li>Clic : l’emplacement du bouton, rien d’autre.</li>
        <li>Session commencée : si c’est la première, et le mode de lecture quand il existe.</li>
        <li>Session terminée : le mode, et la durée en trois tranches, moins de 2 minutes, de 2 à 10, ou plus de 10.</li>
        <li>Retour après 7 jours : une seule fois, calculé sur cet appareil.</li>
        <li>Note ajoutée : seulement « note » ou « à retenir ».</li>
        <li>Réponse à une question : oui, un peu, ou non.</li>
      </ul>
      <p className="hint">Tu peux couper l’envoi dans l’app : Réglages, « Partager des statistiques anonymes ». Sans outil de mesure configuré, rien ne part.</p>
      <p className="footer-note">Tes lectures restent sur cet appareil. <a href="/confidentialite">Confidentialité</a></p>
    </main>
  )
}

function Missing() {
  return (
    <main className="site-main">
      <h1>Cette page n’existe pas.</h1>
      <p className="site-lede"><a href="/">Retour à l’accueil</a></p>
    </main>
  )
}

function SiteMenu() {
  return (
    <header className="site-bar">
      <nav className="site-nav" aria-label="Site">
        <a href="/">Accueil</a>
        <details>
          <summary>Articles</summary>
          <a href="/lire-au-lieu-de-scroller">Je scrolle au lieu de lire</a>
          <a href="/reprendre-la-lecture">J’ai des livres, mais je n’arrive plus à lire</a>
        </details>
        <a href="/app">Ouvrir l’app</a>
      </nav>
    </header>
  )
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

function useLibraryBanner(): boolean {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const current = libraryPresent(localStorage.getItem(DATA_KEY))
    const legacy = libraryPresent(localStorage.getItem(LEGACY_KEY))
    setShow(current || legacy)
  }, [])
  return show
}
