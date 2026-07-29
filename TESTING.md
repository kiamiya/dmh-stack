# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : en attente de validation

## Fonctionnalité concernée

Module `@dmh/config` — validation des variables d'environnement
(`loadServerEnv` / `loadPublicEnv`).

## Pourquoi un test fonctionnel ici (en plus des tests unitaires) ?

Les tests unitaires (`pnpm --filter @dmh/config test`, 7/7 verts) couvrent la
logique de validation avec des valeurs factices. Ils ne prouvent pas que le
comportement est correct **avec le vrai `.env.local`** de la machine. Ce test
manuel, rapide, vérifie ça une fois avant de considérer la brique livrée.

## Pré-requis

- Rien de spécial : ce test n'appelle aucune API externe, aucune clé réelle
  n'est nécessaire pour l'instant.

## Étapes à exécuter

1. Dans `H:\FilumByDMH`, lancer :
   ```
   pnpm run check-env
   ```
   (script `scripts/check-env.ts`, charge `.env.local` et appelle
   `loadServerEnv(process.env)`.)
2. Constater le message affiché.

## Résultat attendu vs résultat à constater

- **Attendu maintenant** (aucune des 5 clés tierces n'est encore dans
  `.env.local`) : un message d'erreur listant clairement chacune des
  variables manquantes (`ANTHROPIC_API_KEY`, `PAPPERS_API_KEY`,
  `DROPCONTACT_API_KEY`, `SMARTLEAD_API_KEY`, `SMARTLEAD_WEBHOOK_SECRET`,
  `WAALAXY_API_KEY`), pas un crash silencieux ni un message vague.
- **Attendu plus tard**, une fois les comptes créés et les vraies clés
  collées dans `.env.local` : `OK: environnement complet`.

## Validation

- [ ] Format de ce document validé par Loïc (process à conserver tel quel
      pour les prochains tests fonctionnels : Pappers, Dropcontact, Claude,
      Smartlead webhooks...)
- [ ] Résultat du test ci-dessus constaté et conforme
