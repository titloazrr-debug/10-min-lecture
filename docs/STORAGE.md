# Stockage local — 10 Min Lecture

Toutes les lectures et écritures passent par `src/storage.ts`. Il n’y a pas de `localStorage.clear()`.

## Clés

| Clé | Rôle |
|---|---|
| `dix-min-lecture-v1` | Ancienne clé, encore lue si `10ml:data` n’existe pas. Elle n’est pas supprimée après migration. |
| `10ml:data` | Clé actuelle. JSON `{ schemaVersion, books, notes, sessions, currentBookId, settings, meta }`. |
| `10ml:backup:<version>:<date>` | Instantané brut pris avant une migration, un import ou une restauration. Les 3 plus récents sont gardés. |
| `10ml:corrupt:<date>` | Copie d’un JSON illisible. La clé d’origine n’est pas écrasée. |
| `10ml:active` | Session en cours seulement : livre, mode, début, pause, temps de pause, objectif. Ce n’est pas la bibliothèque. Une écriture ici ne remplace pas `10ml:data`. |

`sessionStorage` sert seulement à ne pas répéter la notification du jour (`dix-min-rappel-…`). Ce n’est pas la bibliothèque.

## Forme actuelle (schemaVersion 6)

- `books` : id, titre, auteur, page actuelle, nombre de pages, `createdAt`. Les champs inconnus sont conservés.
- `sessions` : id, livre, début, fin, durée, page avant, page après. `mode` (`papier` ou `ecran`) est facultatif.
- `notes` : id, livre, session éventuelle, `note` ou `retenir`, texte, `createdAt`.
- `currentBookId`
- `settings.reminderTime` : ancienne heure `HH:MM`, ou `null` si le rappel est éteint. Conservé pour les copies anciennes.
- `settings.showRecap` : le panneau « Avant de reprendre… », vrai par défaut.
- `settings.weeklyGoalDays` : 1 à 7, défaut 3. `settings.minMinutesPerDay` : défaut 2, sans réglage à l’écran.
- `settings.reminder` : `{ enabled, time, days }`. `days` va de 1 (lundi) à 7 (dimanche). Désactivé par défaut, heure `20:30`, tous les jours. Une heure déjà choisie (`reminderTime`) active le rappel à la migration.
- `settings.analytics` : envoi de statistiques anonymes, vrai par défaut. Coupé dans Réglages.
- `settings.sessionMode` : dernier choix `papier` ou `ecran`, défaut `papier`.
- `settings.endSound` et `settings.endVibrate` : prévenance en fin de 10 minutes sur papier, faux par défaut.
- `challenge` : facultatif. Absent tant que personne n’a cliqué « Je relève le défi ». `{ joinedAt, answered, answer? }`. Une réponse `oui`, `un peu` ou `non` ne se repose pas. Ce n’est pas un classement.
- `meta.firstSeenAt` : première ouverture de l’app, ou `null`. `meta.return7dSent` : le retour à 7 jours a déjà été signalé.
- `books[].recapCollapsed` : le panneau est replié pour ce livre.
- `notes[].page` : page facultative. Une note liée à une session récupère `pageAfter` à la migration.
- `meta.lastBackupAt` : date ISO de la dernière copie téléchargée, ou `null`.

Les jours lus ne sont pas stockés : ils se calculent depuis les sessions, sur le jour local de `startedAt`.

L’ancienne forme (`version: 1`, `reminderTime` à la racine) est migrée par `migrations[1]`, puis 2 et 3. Un export de cette forme s’importe encore.

## Écritures

- `load` lit `10ml:data`, sinon l’ancienne clé. Si le schéma est ancien, il copie l’état brut dans `10ml:backup:…` puis écrit `10ml:data`. Si la copie échoue (quota), il n’écrit rien.
- `save` écrit `10ml:data` après un changement. Il n’écrit pas si la lecture a échoué.
- `snapshotRaw` écrit un instantané avant un import ou une restauration. S’il échoue, l’import n’a pas lieu.
- `archiveCorrupt` copie un JSON illisible dans `10ml:corrupt:…` sans remplacer la source.
- Les instantanés au-delà de 3 sont retirés avec `removeItem` sur ces clés seulement.

## Échecs

- Migration interrompue : les anciennes données restent, rien n’est écrit dans `10ml:data`, message « On n’a pas pu mettre à jour tes données. Rien n’est perdu. Télécharge ta copie de secours. »
- Quota plein avant migration : même prudence, avec un message qui demande de télécharger d’abord.
- Fichier d’import inconnu : « Ce fichier ne ressemble pas à une copie de secours. »
- Deux onglets : l’événement `storage` recharge `10ml:data`.
