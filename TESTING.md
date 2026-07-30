# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : mapping validé le 2026-07-30 — reste la Edge Function complète (Docker requis)

## Fonctionnalité concernée

Edge Function `supabase/functions/enrich-pappers` — enrichissement d'un
prospect via l'API Pappers (S2 du brief).

## Ce qui a déjà été validé (2026-07-30)

Le client (`fetchCompanyFromPappers`) et le mapper (`mapPappersCompany`) de
`@dmh/pappers` ont été testés contre un vrai appel API, pas seulement des
réponses simulées : `pnpm run check-pappers -- 356000000` (SIREN de La
Poste, choisi car facile à vérifier publiquement). Deux bugs de mapping ont
été trouvés et corrigés grâce à ce test réel :

- `employeeRange` utilisait `tranche_effectif` (un code interne, ex. "53")
  au lieu de `siege.effectif` (le libellé humain, ex. "Entre 2 000 et 4 999
  salariés").
- `revenue`/`revenueYear` cherchaient un champ racine `chiffre_affaires`
  inexistant — le chiffre d'affaires vit dans un tableau `finances[]` (une
  entrée par exercice comptable), on prend maintenant l'exercice le plus
  récent.
- `website` utilisait `site_web`, corrigé en `website` (le champ existe
  mais est souvent `null` en pratique — confirmé sur ce SIREN).

Après correction, les 15 tests unitaires de `@dmh/pappers` passent et le
mapping revérifié contre le même appel réel donne des valeurs cohérentes
(`name: "LA POSTE"`, `revenue: 10260000000`, `revenueYear: 2024`,
`employeeRange: "Entre 2 000 et 4 999 salariés"`, etc.).

## Ce qui reste à valider

L'Edge Function `index.ts` (glue Deno : lecture de la requête, accès
Supabase) n'a **pas encore été exécutée réellement** — ni Docker ni le CLI
Deno ne sont disponibles dans cet environnement, donc `supabase functions
serve` n'a pas pu tourner ici. Le fichier a été relu attentivement mais pas
testé en conditions réelles.

## Pré-requis

- Docker installé (nécessaire à `supabase functions serve`).
- Un prospect de test réel dans Supabase, en statut `to_enrich`, avec une
  `company` liée ayant un `siren` ou un `name`.

## Étapes à exécuter

```
pnpm exec supabase functions serve enrich-pappers --env-file .env.local
```

puis, dans un autre terminal :

```
curl -X POST http://localhost:54321/functions/v1/enrich-pappers \
  -H "Content-Type: application/json" \
  -d '{"prospect_id": "<uuid du prospect de test>"}'
```

## Résultat attendu vs résultat à constater

- Réponse HTTP `200 { ok: true, prospect_id, company_id }`.
- Dans Supabase : la ligne `companies` correspondante mise à jour (`name`,
  `naf_code`, `revenue`, `employee_range`, `pappers_data`...), et
  `prospects.status` passé à `enriched_pappers`.
- En cas d'erreur (SIREN invalide, prospect pas en `to_enrich`, etc.) :
  réponse HTTP avec code d'erreur explicite (400/404/409/502) et message
  clair, `prospects.status` inchangé (pour permettre un nouvel essai).

## Validation

- [ ] Edge Function testée en conditions réelles (Docker) et conforme.
- [ ] Format de ce document toujours adapté pour toi.
