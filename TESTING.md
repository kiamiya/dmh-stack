# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : ✅ test exécuté par mes soins — en attente de ta relecture

Test fonctionnel de S6 (attribution + vue Deals), exécuté le 2026-07-31.

### Ce qui a été trouvé et corrigé avant même le test

En préparant les scénarios, deux bugs réels dans le trigger
`calculate_attribution` (existant depuis S1, jamais testé jusqu'ici) :

1. Le trigger ne se déclenchait que sur `UPDATE` (`before update on
   deals`), jamais sur un `INSERT` direct en `status: 'won'` — alors que
   le brief décrit "dès la saisie [d'un deal signé], le module
   d'attribution calcule automatiquement", et que le code lui-même
   suggérait que ce cas était censé être couvert.
2. Le champ `months_between` du rapport d'attribution (`attribution_report`,
   documenté "pour litiges éventuels") était mal calculé pour tout écart
   de plus d'un an entre le premier contact et la signature (bug
   `extract(month from age(...))`, ne renvoie que 0-11). La vraie règle
   d'éligibilité (18 mois) n'était pas affectée, seul ce champ informatif.

Corrigés dans `supabase/migrations/008_fix_deal_attribution_trigger.sql`,
appliquée après ta confirmation.

### Test 1 — Scénarios du trigger (`scripts/test-attribution.ts`)

Exécuté contre le vrai Supabase (client de test), 8/8 scénarios réussis :

| Scénario | Résultat |
|---|---|
| INSERT direct en `won` déclenche l'attribution | ✅ `attributed_to_dmh=true`, commission = `deal_value × commission_rate` |
| `months_between` correct pour un écart <1 mois | ✅ `0` |
| Contact préexistant → non attribué | ✅ |
| Aucune interaction enregistrée → non attribué | ✅ |
| Premier contact >18 mois → non attribué | ✅ |
| `months_between` correct pour un écart >12 mois (fix #2) | ✅ `~20` (aurait été 0-11 avant le fix) |
| Deal sans `prospect_id` → non attribué | ✅ |
| Mise à jour d'un deal déjà `won` → pas de recalcul du rapport | ✅ |

Relance possible à tout moment : `pnpm run test-attribution`.

### Test 2 — Vue Deals (`apps/dashboard`, `/deals`)

Dans un vrai navigateur (Playwright headless, compte de test client) :

1. Onglet "Deals" visible dans la nav, page charge sans erreur.
2. Formulaire "Déclarer un deal signé" rempli (entreprise, montant, date)
   et soumis → le deal apparaît immédiatement en haut de la liste, avec
   le bon statut d'attribution (non attribué ici, aucun prospect lié —
   cohérent).
3. Les 6 deals créés par le script de test s'affichent avec les bons
   montants formatés (`8 000,00 €`), badges "Oui"/"Non" et statut de
   commission ("payée"/"à payer").
4. Aucune erreur console.

**Point à valider par toi** : le contenu du formulaire (entreprise,
montant, date, prospect lié optionnel) et de la liste (montant, date,
attribution, commission + statut payé/à payer) te semble suffisant pour
déclarer un deal signé, ou il manque quelque chose d'évident ? Si tout te
va, un "c'est bon" suffit pour enchaîner sur S7 (scoring IA).

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
- **`pnpm run test-attribution`** pour rejouer les 8 scénarios du trigger d'attribution contre le vrai Supabase.
- **`pnpm exec supabase db push`** pour appliquer les migrations en attente sur la vraie base (toujours demander confirmation avant, cf. `CLAUDE.md`).
- **`pnpm --filter @dmh/crm dev`** (port 5173 ou 5174 selon dispo) pour le CRM interne, **`pnpm --filter @dmh/dashboard dev`** pour le dashboard client.
- **Comptes de test** :
  - CRM (staff) : `lrd@dmhassocies.com` (ton compte réel), lié à `staff_members` — accès à tous les clients.
  - Dashboard (client) : `client-test-claude@dmhassocies.com`, lié à `client_users` — accès au seul client de test.
- **Données de test dans Supabase** (conservées, voir `PROGRESS.md`) :
  client de test `test-claude-enrich-pappers` (avec `offer_description`
  configurée), 4 prospects de prospection + 6 entreprises de test créées
  pour l'attribution (`[TEST attribution] ...`) + 1 deal créé pendant le
  test navigateur (`[TEST UI] Nouvelle Entreprise`), 7 interactions
  Smartlead simulées sur le prospect `1a646013-...`.
