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

## Contexte projet (repère rapide)

- Brief complet : `C:\Users\loicr\Downloads\DMH Plan Execution Strategique Juillet Decembre 2026.docx`
  (stratégie 3 phases, spécifications techniques détaillées section 1).
- Stack : pnpm workspaces + Turborepo, TypeScript, Supabase (Postgres + Edge
  Functions + RLS), React/Vite + Tailwind pour les apps, déploiement Vercel.
- Avancement détaillé, checklist des comptes API à créer, critères de succès
  Phase 1 : voir `PROGRESS.md`.
