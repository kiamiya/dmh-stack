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

Le dernier test fonctionnel (Edge Function `enrich-dropcontact`, S3) a été
validé end-to-end le 2026-07-30 : cycle complet soumission → en attente →
prêt, contre la vraie API Dropcontact et le vrai Supabase (voir le Journal
des sessions dans `PROGRESS.md` pour le détail — API asynchrone, migration
`003` requise, et un point de vigilance sur le mapping qualification →
confiance jamais observé avec un email réellement trouvé).

Ce fichier sera réécrit avec la prochaine fonctionnalité nécessitant une
validation humaine (prochain candidat dans l'ordre du brief : génération de
messages via Claude API, dernier morceau de S3).

## Outillage disponible pour les prochains tests

- **Deno CLI** installé en standalone (`winget install DenoLand.Deno`,
  sans admin/Docker) — pour exécuter une Edge Function directement :
  ```
  export PATH="$PATH:/c/Users/loicr/AppData/Local/Microsoft/WinGet/Packages/DenoLand.Deno_Microsoft.Winget.Source_8wekyb3d8bbwe"
  cd supabase/functions/<nom-de-la-fonction>
  deno run --allow-net --allow-env --env-file=../../../.env.local index.ts
  ```
- **`pnpm run check-pappers -- <siren>`** pour tester rapidement le mapper Pappers sur une nouvelle entreprise.
- **`pnpm run import-pharow -- --client-id <uuid> <fichier.csv>`** pour importer un CSV Pharow (ou un CSV de test).
- **`pnpm exec supabase db push`** pour appliquer les migrations en attente sur la vraie base (toujours demander confirmation avant, cf. `CLAUDE.md`).
- **Données de test dans Supabase** (conservées, voir `PROGRESS.md`) :
  client de test `test-claude-enrich-pappers`, avec un prospect au statut
  `enriched_contact` (Pappers + Dropcontact déjà passés) — réutilisable pour
  tester la génération de message Claude sans tout recréer.
