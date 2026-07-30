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

Le dernier test fonctionnel (Edge Function `generate-messages`, dernière
brique de S3) a été validé end-to-end le 2026-07-30 : message généré par
Claude conforme à toutes les contraintes du brief, **pipeline complet
Pharow → Pappers → Dropcontact → Claude validé pour la première fois** sur
un même prospect (`to_enrich` → `enriched_pappers` → `enriched_contact` →
`ready`). Voir le Journal des sessions dans `PROGRESS.md` pour le détail
(dont deux bugs trouvés par `deno check` avant même d'exécuter le test :
un import cassé et une méthode SDK absente de la version épinglée).

**Point à valider par toi si tu veux** : le message généré (email + LinkedIn
+ relance J+7) pour PM MECANIQUE INDUSTRIE est dans `messages_generated`
(prospect `1a646013-c0a2-48e9-b402-45332023f873`) — n'hésite pas à le
relire directement dans Supabase pour juger de la qualité rédactionnelle,
au-delà du simple respect des contraintes de format que j'ai vérifié.

Ce fichier sera réécrit avec la prochaine fonctionnalité nécessitant une
validation humaine (prochain candidat dans l'ordre du brief : S4, interface
CRM basique + webhooks Smartlead → Supabase).

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
  client de test `test-claude-enrich-pappers` (avec `offer_description`
  configurée), prospect `1a646013-...` désormais au statut final `ready`
  avec un message généré complet — réutilisable pour tester les prochaines
  étapes (S4 CRM, injection Smartlead...) sans tout recréer.
