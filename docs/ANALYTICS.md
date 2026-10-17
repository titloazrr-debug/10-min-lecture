# Mesure anonyme

Une seule fonction : `track` dans `src/lib/track.ts`. Sans variable, elle ne fait rien.

`VITE_ANALYTICS_PROVIDER` vaut `plausible`, `umami`, `vercel`, ou reste vide.

- Plausible : `VITE_PLAUSIBLE_DOMAIN`
- Umami : `VITE_UMAMI_SRC` et `VITE_UMAMI_WEBSITE_ID`
- Vercel : le script `/_vercel/insights/script.js`

Pas de cookie et pas d’identifiant. Les propriétés interdites (titre, auteur, texte, page) sont retirées. Si le script est bloqué, l’app continue.

Événements : `visit`, `cta_click`, `session_started`, `session_finished`, `return_7d`, `note_added`, `challenge_answer`. `session_started` et `session_finished` envoient `mode` (`papier` ou `ecran`). La fin envoie aussi `durationBucket`. Jamais la page, le titre ou la note.

L’interrupteur est `settings.analytics`. La page est `/confidentialite`.
