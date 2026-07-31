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

Test fonctionnel de S7 (scoring IA, items 1-2 — le 3e item, webhooks
Lemlist, est reporté), exécuté le 2026-07-31.

### Bug réel trouvé et corrigé avant le test

`output_config.format` (sorties structurées Claude) refuse `minimum`/
`maximum` sur un champ de type `integer` — erreur 400 réelle
("properties maximum, minimum are not supported") en testant contre la
vraie API. Corrigé en retirant ces contraintes du schéma
(`packages/scoring/src/client.ts`) ; la fourchette 1-10 reste imposée par
les instructions du prompt, pas par le schéma JSON.

### Test 1 — Scoring réel (Edge Function `score-prospect`, Deno CLI)

Exécuté contre le vrai Supabase + la vraie API Claude, sur le prospect de
test PM MECANIQUE INDUSTRIE (SIREN 481838852, PME industrielle réelle) :

- **Score obtenu : 5/10.**
- **Justification** (in extenso) : *"Secteur pertinent (mécanique
  industrielle, vente traditionnelle par réseau) et CA stagnant en 2023
  (+0.1%) après forte hausse en 2022, ce qui peut indiquer un besoin de
  relancer la croissance. Cependant, l'effectif est très faible (au moins
  1 salarié, probablement TPE) et le dirigeant est en poste depuis 88
  mois, donc pas de signal fort de réévaluation récente. L'absence de
  site web confirme une immaturité commerciale mais la petite taille
  limite le potentiel de budget pour une cellule externalisée."*
- Justification cohérente avec les vraies données Pappers de cette
  entreprise (secteur, historique de CA, ancienneté du dirigeant,
  absence de site web) — croise correctement plusieurs signaux du brief
  dans les deux sens (positifs et négatifs), pas juste une réponse
  générique.

Relance possible à tout moment (Deno CLI) :
```
export PATH="$PATH:/c/Users/loicr/AppData/Local/Microsoft/WinGet/Packages/DenoLand.Deno_Microsoft.Winget.Source_8wekyb3d8bbwe"
cd supabase/functions/score-prospect
deno run --allow-net --allow-env --env-file=../../../.env.local index.ts
# puis, dans un autre terminal :
curl -X POST http://localhost:8000 -H "Content-Type: application/json" -d '{"prospect_id":"<uuid>"}'
```

### Test 2 — Affichage CRM + Dashboard (vrai navigateur, Playwright)

1. **CRM, liste des prospects** : nouvelle colonne "Score" — badge
   "5/10" (jaune) visible pour PM MECANIQUE INDUSTRIE.
2. **CRM, fiche détail** : nouvelle carte "Score IA" en haut de page,
   badge + justification complète affichée.
3. **Dashboard, Pipeline (Kanban)** : badge de score à côté du badge de
   statut sur la carte du prospect.
4. Aucune erreur console sur les deux apps.

**Point à valider par toi** : le score/la justification obtenus sur ce
prospect de test te semblent-ils pertinents et exploitables tels quels
par William/le SDR ? Le placement de l'affichage (colonne dans la liste,
carte en haut de la fiche détail, badge sur les cartes Kanban) te
convient-il ?

### Hors périmètre de cette itération

- Webhooks Lemlist → Supabase (3e item de S7) — recherche API pas encore
  faite, reporté à une itération séparée.
- Déclenchement automatique du scoring après `enrich-pappers` — comme
  pour toutes les Edge Functions du pipeline, l'appel reste manuel pour
  l'instant (câblage des triggers DB non fait, cf. "Incertitudes
  techniques" dans `PROGRESS.md`).

## Outillage disponible pour les prochains tests

- **Deno CLI** installé en standalone (`winget install DenoLand.Deno`,
  sans admin/Docker) — pour exécuter une Edge Function directement (voir
  commande ci-dessus).
- **`pnpm run check-pappers -- <siren>`** pour tester rapidement le mapper Pappers sur une nouvelle entreprise.
- **`pnpm run import-pharow -- --client-id <uuid> <fichier.csv>`** pour importer un CSV Pharow (ou un CSV de test).
- **`pnpm run test-attribution`** pour rejouer les 8 scénarios du trigger d'attribution contre le vrai Supabase.
- **`pnpm exec supabase db push`** pour appliquer les migrations en attente sur la vraie base (toujours demander confirmation avant, cf. `CLAUDE.md`).
- **`pnpm --filter @dmh/crm dev`** / **`pnpm --filter @dmh/dashboard dev`** (ports 5173/5174 selon dispo) pour les deux apps.
- **Comptes de test** :
  - CRM (staff) : `lrd@dmhassocies.com` (ton compte réel), lié à `staff_members` — accès à tous les clients.
  - Dashboard (client) : `client-test-claude@dmhassocies.com`, lié à `client_users` — accès au seul client de test.
- **Données de test dans Supabase** (conservées, voir `PROGRESS.md`) :
  client de test `test-claude-enrich-pappers`, 4 prospects de prospection
  (dont PM MECANIQUE INDUSTRIE désormais scorée 5/10) + 6 entreprises de
  test pour l'attribution + 1 deal de test, 7 interactions Smartlead
  simulées.
