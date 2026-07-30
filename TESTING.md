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

Edge Function `supabase/functions/enrich-pappers` — enrichissement d'un
prospect via l'API Pappers (S2 du brief).

## Pourquoi un test fonctionnel ici (en plus des tests unitaires) ?

Les 13 tests unitaires de `@dmh/pappers` (`pnpm --filter @dmh/pappers test`)
couvrent la construction de l'URL, la gestion d'erreur HTTP et le mapping —
mais avec des **réponses simulées**, pas la vraie réponse de l'API Pappers.

Point important : la documentation officielle de l'API
(`pappers.fr/api/documentation`) a renvoyé une erreur 403 lors de la
récupération automatique pendant que j'écrivais le mapper. Les noms de
champs utilisés (`nom_entreprise`, `siege.ville`, `tranche_effectif`,
`chiffre_affaires`, etc.) viennent de sources tierces (SDK communautaires,
wrappers open source), pas de la doc officielle vérifiée directement. Ils
peuvent donc être imprécis ou incomplets par rapport à la vraie réponse.

Ce test sert à confirmer (ou corriger) ce mapping avant de considérer S2
terminé. Aucun risque de perte de données en attendant : la réponse brute
est toujours stockée intégralement dans `companies.pappers_data`, mapping
correct ou non.

Autre limite de cet environnement : ni Docker ni le CLI Deno ne sont
disponibles ici, donc je n'ai pas pu exécuter `supabase functions serve`
moi-même pour vérifier que le fichier `index.ts` tourne réellement — il a
seulement été relu, pas exécuté.

## Pré-requis

- Une entreprise française réelle avec un SIREN connu (n'importe laquelle,
  ex. une entreprise publique dont le SIREN est facile à trouver), pour
  tester l'appel avec `siren`.
- Docker installé (nécessaire à `supabase functions serve` pour lancer les
  Edge Functions en local) — ou possibilité de tester `@dmh/pappers`
  directement en Node sans passer par Deno (voir étape 1 ci-dessous, ne
  nécessite pas Docker).

## Étapes à exécuter

1. **Test rapide sans Docker** (valide juste le mapping, pas la Edge
   Function complète) : depuis `H:\FilumByDMH`, lancer un script one-off
   avec `tsx` qui appelle `fetchCompanyFromPappers` avec un vrai SIREN et la
   vraie clé (`PAPPERS_API_KEY` de `.env.local`), puis affiche le JSON brut
   et le résultat de `mapPappersCompany`. Dis-moi si tu veux que je
   l'ajoute comme script réutilisable (`pnpm run check-pappers <siren>`
   par exemple) plutôt qu'une commande ponctuelle.
2. **Test complet avec Docker** (si tu as Docker) :
   ```
   pnpm exec supabase functions serve enrich-pappers --env-file .env.local
   ```
   puis, dans un autre terminal :
   ```
   curl -X POST http://localhost:54321/functions/v1/enrich-pappers \
     -H "Content-Type: application/json" \
     -d '{"prospect_id": "<uuid d'\''un prospect existant en statut to_enrich>"}'
   ```
   (nécessite un prospect de test réel dans Supabase, en statut `to_enrich`,
   avec une `company` liée ayant un `siren` ou un `name`.)

## Résultat attendu vs résultat à constater

- Le JSON brut retourné par Pappers doit correspondre à ce qui est décrit
  dans le brief §1.3.1 (dénomination, forme juridique, NAF, adresse,
  effectif, dirigeants...).
- `mapPappersCompany(raw, new Date())` doit remplir `name`, `nafCode`,
  `legalForm`, `city`, etc. avec des valeurs cohérentes — pas tout à `null`
  (signe que les noms de champs supposés sont faux et qu'il faut corriger
  `packages/pappers/src/mapper.ts`).
- Avec le test complet (étape 2) : `companies` mis à jour, `prospects.status`
  passé à `enriched_pappers`, réponse HTTP `200 { ok: true, ... }`.

## Validation

- [ ] Mapping confirmé correct (ou corrections identifiées) contre un vrai
      appel Pappers.
- [ ] Format de ce document toujours adapté pour toi.
