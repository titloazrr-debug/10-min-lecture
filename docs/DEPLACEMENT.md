# Déplacement de l’app vers /app

Les clés ne changent pas : `10ml:data` et `dix-min-lecture-v1`, sur le même domaine `10-min-lecture.vercel.app`.

## Test manuel

1. Sur l’ancienne adresse (`/`, avant ce déplacement), ajoute un livre, par exemple « Dune ».
2. Déploie cette version.
3. Ouvre `https://10-min-lecture.vercel.app/app`. Le livre « Dune » est là, avec ses notes et ses sessions.
4. Dans Réglages → Mes données, télécharge une copie, puis importe-la avec « Fusionner ». Les comptes annoncés correspondent, et le livre est toujours là.
5. Ouvre `/`. Un bandeau « Reprendre ma lecture → » mène à `/app`.
6. Ouvre `/?livre=1` et `/#session`. Les deux arrivent sur `/app` en gardant la query ou le hash.
7. `/histoires` n’est pas dans le menu, répond `noindex`, et n’est pas dans `sitemap.xml`.
