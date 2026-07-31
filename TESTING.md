# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : ✅ test exécuté par mes soins — en attente de ta relecture finale

**S8, dernière étape de la Phase 1**, exécuté le 2026-07-31 : test
end-to-end complet, nettoyage, durcissement RLS/performance, et
documentation technique V1 (`README.md`).

### Nettoyage avant de commencer

- Supprimé `supabase/functions/webhook-waalaxy/` (dossier vide, jamais
  suivi par git, reste obsolète du scaffold initial).
- Retiré la ligne `deploy-client` de `package.json` (script jamais
  implémenté, échouait immédiatement) — la gestion des clients reste un
  sujet Phase 2 (décidé avec toi le 2026-07-31).

### Durcissement RLS/performance (`supabase db advisors`, jamais lancé jusqu'ici)

Résultat détaillé dans "Incertitudes techniques" de `PROGRESS.md`. En
résumé, 3 vraies catégories de problèmes trouvées et corrigées (migration
`009_performance_and_security_hardening.sql`, appliquée après ta
confirmation) :
- 23 policies RLS qui ré-évaluaient `auth.uid()`/`auth.role()` à chaque
  ligne au lieu d'une fois par requête (`(select auth.uid())`).
- 13 clés étrangères sans index de couverture (`client_id`, `prospect_id`,
  etc. — exactement les colonnes filtrées par RLS et par le CRM/dashboard).
- 2 fonctions trigger avec un `search_path` non fixé (bonne pratique de
  sécurité Postgres standard).

Restent en connaissance de cause (pas des bugs, des choix documentés) :
la coexistence de 3 policies additives par table (`client_isolation`/
`staff_full_access`/`client_user_access`, voulu) et l'activation de la
protection "mot de passe compromis" de Supabase Auth (à faire dans le
dashboard, pas par migration — recommandé mais pas fait ici).

### Test end-to-end complet (le cœur de S8)

Un seul et même prospect créé pour ce test (contact "Marie Dubois",
entreprise PM MECANIQUE INDUSTRIE), suivi à travers **toute la chaîne
réelle**, dans l'ordre :

| Étape | Résultat |
|---|---|
| Import CSV (`import-pharow`) | ✅ `to_enrich`, entreprise dédupliquée avec le test existant (comportement correct) |
| `enrich-pappers` | ✅ `enriched_pappers` |
| `score-prospect` | ✅ score 5/10 |
| `enrich-dropcontact` | ✅ `enriched_contact` (email non trouvé, cohérent) |
| `generate-messages` | ❌ puis ✅ — **bug bloquant trouvé** (`max_tokens`), corrigé, rejoué avec succès → `ready` |
| CRM (liste + détail) | ✅ score, message, statut cohérents en un seul endroit |
| "Marquer prêt pour Smartlead" | ✅ |
| Webhook Smartlead simulé (`EMAIL_SENT`, `EMAIL_REPLY`) | ✅ `ready` → `in_sequence` → `replied` |
| Synchro Lemlist simulée (`linkedinInterested`) | ✅ `replied` → `qualified` |
| Dashboard (pipeline, interactions) | ✅ le prospect apparaît correctement dans la bonne colonne, avec ses interactions |
| Déclaration d'un deal (`/deals`) | ✅ **attribution calculée sur le vrai historique** de ce test (5 interactions réelles) : `attributed_to_dmh: true`, commission `1 800 €` (9% de `20 000 €`), `months_between: 0` |

### Bug bloquant trouvé et corrigé

`generate-messages` a échoué en conditions réelles (`stop_reason:
max_tokens`, réponse tronquée) — `max_tokens: 1024` était une marge trop
juste. Corrigé à `2048` (`packages/claude-messages/src/client.ts`), même
précaution appliquée à `packages/scoring/src/client.ts` (`512` → `1024`).
Aucun test précédent n'avait rencontré ce cas — trouvé uniquement parce
que ce test end-to-end a rejoué les fonctions en conditions réelles.

### `README.md` — documentation technique V1

Nouveau fichier à la racine : architecture, cycle de vie d'un prospect
(qui fait avancer quel statut), setup, conventions de test, tableau des
scripts/Edge Functions, état du déploiement, modèle RLS. À relire de ton
côté si tu veux — c'est le document qui devrait permettre à quelqu'un
d'autre de reprendre le projet.

**Point à valider par toi** : avec ce test, **la Phase 1 (planning
détaillé S1-S8 du brief) est complète côté développement**. Peux-tu
confirmer que ça correspond à ce que tu attendais, et jeter un œil à
`README.md` ? Au-delà de cette validation, les étapes suivantes (Phase 2 :
clients pilotes, contrats, SDR, déploiement Vercel réel) sortent
largement du périmètre dev pur et impliquent des décisions business de
ton côté.

## Outillage disponible

- **`supabase db advisors --linked --type all --level info`** pour
  relancer le contrôle sécurité/performance à tout moment.
- **`supabase db query --linked "<SQL>"`** pour interroger directement la
  base réelle en lecture (ex. vérifier `pg_policies`).
- **Deno CLI** installé en standalone (`winget install DenoLand.Deno`) —
  pour exécuter une Edge Function directement, voir `README.md`.
- **`pnpm run check-pappers -- <siren>`**, **`import-pharow`**,
  **`test-attribution`**, **`sync-lemlist`** — voir `README.md` pour la
  liste complète des scripts.
- **`pnpm --filter @dmh/crm dev`** / **`pnpm --filter @dmh/dashboard dev`**
  (ports 5173/5174 selon dispo).
- **Comptes de test** : `lrd@dmhassocies.com` (staff, tous les clients),
  `client-test-claude@dmhassocies.com` (client de test uniquement).
- **Données de test dans Supabase** (conservées) : client de test
  `test-claude-enrich-pappers`, plusieurs prospects couvrant tous les
  statuts du pipeline, dont le nouveau prospect "Marie Dubois" (statut
  final `qualified`, avec un deal attribué de 20 000 €).
