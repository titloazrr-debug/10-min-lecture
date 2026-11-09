# Vente des chapitres — architecture

Les chapitres 1 et 2 restent publics. À partir du chapitre 3, le texte ne doit plus être dans `public/` ni dans un dépôt Git public.

## État actuel

- La liseuse refuse d’afficher un chapitre verrouillé.
- Les fichiers `03.md` et suivants ne sont plus déployés.
- Il n’y a pas de paiement, pas de jeton, pas de déverrouillage local.

Le dépôt GitHub public conserve encore ces textes dans l’historique (`bdb453d` et avant). Une commercialisation demandera un dépôt privé, ou un filtrage d’historique, **après accord explicite**.

## Cible

1. Manuscrits hors Git public (Obsidian / dépôt privé).
2. Fonction serveur (Vercel) qui, après un paiement Stripe confirmé par webhook, délivre le chapitre demandé.
3. Jeton signé côté client, vérifié à chaque lecture — jamais un simple flag `localStorage`.
4. Liste d’attente email chez un prestataire (Brevo / Resend) avec double opt-in et mentions RGPD. Rien dans `localStorage` comme promesse d’envoi.

Tant que ces pièces n’existent pas, le site dit que la suite n’est pas en vente.
