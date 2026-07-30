# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : ✅ rien en attente actuellement

Le dernier test fonctionnel (Edge Function `enrich-pappers`, S2) a été validé
end-to-end le 2026-07-30 : client + mapper Pappers contre l'API réelle,
Edge Function exécutée avec Deno CLI contre le vrai projet Supabase,
prospect enrichi de bout en bout (voir le Journal des sessions dans
`PROGRESS.md` pour le détail complet — deux bugs trouvés et corrigés au
passage, un problème de projet Supabase en pause résolu par Loïc).

Ce fichier sera réécrit avec la prochaine fonctionnalité nécessitant une
validation humaine (prochain candidat : Dropcontact + Claude API, S3, ou le
script d'import CSV Pharow).

## Outillage disponible pour les prochains tests

- **Deno CLI** installé en standalone (`winget install DenoLand.Deno`,
  sans admin/Docker) — pour exécuter une Edge Function directement :
  ```
  export PATH="$PATH:/c/Users/loicr/AppData/Local/Microsoft/WinGet/Packages/DenoLand.Deno_Microsoft.Winget.Source_8wekyb3d8bbwe"
  cd supabase/functions/<nom-de-la-fonction>
  deno run --allow-net --allow-env --env-file=../../../.env.local index.ts
  ```
- **`pnpm run check-pappers -- <siren>`** pour tester rapidement le mapper Pappers sur une nouvelle entreprise.
- **Données de test dans Supabase** (conservées, voir `PROGRESS.md`) :
  un `dmh_clients`/`companies`/`contacts`/`prospects` de test déjà en place
  (prospect id `1a646013-c0a2-48e9-b402-45332023f873`, déjà en statut
  `enriched_pappers`) — réutilisable pour tester les prochaines étapes du
  pipeline (Dropcontact, scoring, génération de message...) sans tout
  recréer.
