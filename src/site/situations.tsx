export const situations = [
  {
    src: "/situations/lit.jpg",
    label: "Dans le lit",
    alt: "Dans un lit, de 22 h 31 à 23 h 48 : le téléphone reste allumé, le livre fermé sur la table de nuit. « Tu voulais dormir plus tôt. »",
  },
  {
    src: "/situations/canape.jpg",
    label: "Sur le canapé",
    alt: "Sur un canapé, de 21 h 00 à 22 h 17 : le livre est toujours fermé. « Et si tu commençais par ton livre ? »",
  },
  {
    src: "/situations/transport.jpg",
    label: "Dans le bus",
    alt: "Dans un bus, de 08 h 07 à 08 h 34 : le livre reste dans le sac. « Ce trajet pouvait être quelques pages. »",
  },
  {
    src: "/situations/attente.jpg",
    label: "En salle d’attente",
    alt: "En salle d’attente, de 14 h 02 à 14 h 29 : le livre est sur les genoux. « Tu avais apporté ton livre pour ça. »",
  },
] as const

export function SituationGallery() {
  return (
    <div className="situation-grid">
      {situations.map((item) => (
        <figure key={item.src}>
          <img src={item.src} alt={item.alt} width={1122} height={1402} />
          <figcaption>{item.label}</figcaption>
        </figure>
      ))}
    </div>
  )
}
