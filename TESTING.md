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

Le dernier test fonctionnel (script d'import CSV Pharow, fin de S2) a été
validé end-to-end le 2026-07-30 : CSV fictif de test importé pour de vrai
contre Supabase, déduplication d'entreprise confirmée en base (voir le
Journal des sessions dans `PROGRESS.md`).

**Point d'attention pour la suite** : les noms de colonnes du CSV Pharow
utilisés par `packages/pharow/src/csv.ts` sont des suppositions (aucun compte
Pharow réel n'existe encore) — à revalider avec un vrai export dès qu'un
compte Pharow existe. Ce sera un candidat naturel pour le prochain test
fonctionnel de ce type.

Ce fichier sera réécrit avec la prochaine fonctionnalité nécessitant une
validation humaine (prochain candidat dans l'ordre du brief : S3,
intégration Dropcontact + génération de messages Claude API).

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
- **Données de test dans Supabase** (conservées, voir `PROGRESS.md`) :
  client de test `test-claude-enrich-pappers`, avec plusieurs prospects déjà
  créés à différents stades (`enriched_pappers`, `to_enrich`) — réutilisable
  pour tester les prochaines étapes du pipeline (Dropcontact, scoring,
  génération de message...) sans tout recréer.
