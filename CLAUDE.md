# Règles de travail — DMH Stack

Ces règles s'appliquent à toute session Claude Code sur ce repo, même après
fermeture/réouverture de la fenêtre. Elles surchargent le comportement par
défaut.

## 1. Suivi des tâches — `PROGRESS.md`

- `PROGRESS.md` (racine) est la source de vérité de l'avancement technique.
- Il doit être mis à jour **à la fin de chaque itération de travail**, pas
  seulement en fin de session : statut des tâches (✅/🔄/⬜), journal daté
  avec le point de reprise exact.
- Avant de proposer la suite, relire ce fichier pour savoir où on en est.

## 2. Tests unitaires obligatoires

- Toute nouvelle logique (code applicatif, Edge Functions, scripts,
  utilitaires) doit être accompagnée de tests unitaires (vitest).
- **Interdiction de passer à la tâche suivante si les tests ne passent pas.**
  Après avoir écrit du code : lancer `pnpm --filter <package> typecheck` et
  `pnpm --filter <package> test`, corriger jusqu'à ce que ce soit vert, avant
  de continuer.
- `pnpm test` / `pnpm typecheck` à la racine doivent rester verts sur
  l'ensemble du monorepo.

## 3. Tests fonctionnels — `TESTING.md`

- Quand une fonctionnalité nécessite une validation humaine (appel à une
  vraie API externe, vérification visuelle, comportement qu'un test unitaire
  ne peut pas garantir), rédiger la démarche dans `TESTING.md` (racine).
- Ce fichier est **réécrit à chaque fois** (pas un log cumulatif) : quoi
  tester, pré-requis, étapes précises, résultat attendu vs constaté, statut.
- **Attendre la validation explicite de Loïc** sur ce document avant
  d'enchaîner sur la suite. Ne pas supposer qu'un silence vaut validation.

## 4. Blocage sur les clés API

- Ne démarrer **aucune tâche de développement suivante** (ex : Edge Function
  S2+) tant que toutes les clés API bloquantes ne sont pas dans
  `.env.local` — pas seulement celle du composant visé. Vérifier avec
  `pnpm run check-env`.
- Exception : `SMARTLEAD_WEBHOOK_SECRET` n'est pas un compte à créer, c'est
  un secret généré au moment de configurer le webhook (tâche S4) — ne
  compte pas comme bloquant pour cette règle.

## 5. Push automatique après chaque tâche terminée

- Dès qu'une tâche est terminée (tests/typecheck verts), **commit et push
  vers `origin master` automatiquement**, sans attendre une confirmation
  explicite — les collaborateurs doivent toujours avoir le projet à jour.
- Avant de stager : vérifier `git status`/`git diff` qu'aucun secret ne
  s'y glisse (`.env.local` reste gitignoré, ne jamais forcer son ajout).
- Cette règle couvre uniquement **git** (le code/la doc du repo). Elle ne
  couvre pas les actions sur des systèmes distants tiers (ex : appliquer une
  migration SQL sur le vrai projet Supabase, déployer sur Vercel) — celles-là
  restent soumises à confirmation explicite au cas par cas.

## 6. Ordre strict des tâches

- Le tableau S1-S8 de `PROGRESS.md` (reflet du planning détaillé Phase 1,
  brief section 1.4) définit un ordre à suivre à la lettre.
- Ne jamais proposer à Loïc de choisir entre deux tâches quand l'une est
  ordonnée avant l'autre — enchaîner directement sur la prochaine tâche non
  faite dans l'ordre. Ne demander un choix que si aucun ordre n'est défini
  entre les options, ou si une vraie dépendance bloque la suite logique.

## Contexte projet (repère rapide)

- Brief complet : `C:\Users\loicr\Downloads\DMH Plan Execution Strategique Juillet Decembre 2026.docx`
  (stratégie 3 phases, spécifications techniques détaillées section 1).
  **Ce document est une référence en lecture seule : ne jamais le modifier**,
  même quand une décision s'en écarte (ex : Lemlist a remplacé Waalaxy). Les
  écarts se documentent dans `PROGRESS.md`, jamais rétro-appliqués au brief.
- Stack : pnpm workspaces + Turborepo, TypeScript, Supabase (Postgres + Edge
  Functions + RLS), React/Vite + Tailwind pour les apps, déploiement Vercel.
- Avancement détaillé, checklist des comptes API à créer, critères de succès
  Phase 1 : voir `PROGRESS.md`.
