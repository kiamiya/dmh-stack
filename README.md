# DMH Stack — Cellule commerciale externalisée

Stack propriétaire de prospection B2B pour DMH & Associés : pipeline
d'enrichissement (Pappers + Claude), CRM interne, dashboard client en
marque blanche, module d'attribution des deals, scoring IA des prospects.

> Documentation technique **V1** (S8). Pour le détail tâche par tâche, les
> décisions prises et les incertitudes/limites connues, voir
> [`PROGRESS.md`](./PROGRESS.md) — ce fichier-ci ne duplique pas ce
> contenu, il donne la vue d'ensemble pour prendre le projet en main.
> Le brief de référence (`DMH Plan Execution Strategique Juillet Decembre
> 2026.docx`) est la source de vérité produit/business — jamais modifié.

## Architecture

Monorepo pnpm + Turborepo, TypeScript strict partout.

```
apps/
  crm/         Interface interne (staff DMH) — Vite + React + Tailwind
  dashboard/   Dashboard client en marque blanche — Vite + React + Tailwind
packages/
  types/           Types partagés (schéma DB)
  config/          Validation typée des variables d'environnement (zod)
  pappers/         Client + mapper API Pappers
  pharow/          Parsing CSV + import Pharow → Supabase
  dropcontact/     Client API Dropcontact (asynchrone)
  claude-messages/ Génération de messages de prospection (Claude API)
  scoring/         Scoring IA des prospects (Claude API)
  smartlead/       Vérification webhook + mapping événements Smartlead
  lemlist/         Client API Lemlist + mapping activités LinkedIn
scripts/           CLI ponctuels (import, tests, synchro manuelle)
supabase/
  migrations/      Schéma + évolutions (voir liste ci-dessous)
  functions/       Edge Functions Deno (pipeline d'enrichissement + webhooks)
```

Chaque intégration externe suit le même principe : logique pure et testée
dans un `packages/*` dédié (client HTTP + mapper), puis une glue fine
(Edge Function ou script) qui l'appelle. La glue elle-même n'est pas
testée en vitest — elle est validée par un test fonctionnel réel,
documenté à chaque itération dans `TESTING.md`.

## Cycle de vie d'un prospect

```
to_enrich → enriched_pappers → enriched_contact → ready → in_sequence
  → replied → meeting_booked → qualified → proposal_sent → won
                                                          ↘ lost / not_interested
```

Qui fait avancer quoi :

| Statut visé | Déclenché par |
|---|---|
| `to_enrich` | Import Pharow (`scripts/import-pharow.ts`) ou saisie manuelle CRM |
| `enriched_pappers` | Edge Function `enrich-pappers` |
| `enriched_contact` | Edge Function `enrich-dropcontact` (asynchrone : soumission puis consultation) |
| `ready` | Edge Function `generate-messages` |
| `in_sequence` → `won`/`lost` | Webhook `webhook-smartlead` (email) et synchro `scripts/sync-lemlist.ts` (LinkedIn) — avancée **conservatrice** uniquement (`shouldAdvanceStatus`, jamais de retour en arrière) |

Le **score IA** (`companies.ai_score`/`ai_score_reason`, Edge Function
`score-prospect`) est calculé en parallèle dès que `enrich-pappers` est
passé — ce n'est pas une étape bloquante du pipeline.

Le passage d'un `deal` à `won` déclenche automatiquement le trigger
PostgreSQL `calculate_attribution` (voir `001_initial_schema.sql` +
`008_fix_deal_attribution_trigger.sql`) qui calcule `attributed_to_dmh` et
`commission_amount` à partir de l'historique réel des `interactions`.

## Setup

Prérequis : Node ≥ 20, pnpm ≥ 11.

```bash
pnpm install
cp .env.example .env.local   # puis remplir les clés (voir ci-dessous)
pnpm run check-env           # vérifie que les clés obligatoires sont présentes
pnpm dev                     # lance apps/crm et apps/dashboard (Vite)
```

`.env.local` centralise **toutes** les variables (apps + scripts + Edge
Functions), jamais commité. Clés nécessaires : Supabase (URL + anon +
service role), Anthropic, Pappers, Dropcontact, Smartlead (API + webhook
secret), Lemlist. Pharow n'a pas de clé API en Phase 1 (export CSV manuel).

## Tests

- `pnpm typecheck` / `pnpm test` — couvrent tous les `packages/*` et
  `apps/*` (Turborepo) plus `scripts/` (`tsc` seul, pas de runtime Node
  requis). Doivent rester verts avant tout push (voir `CLAUDE.md`).
- **Edge Functions (Deno)** : `deno check index.ts` pour le typage,
  exécution locale contre le vrai Supabase pour un test fonctionnel réel :
  ```bash
  export PATH="$PATH:/c/Users/loicr/AppData/Local/Microsoft/WinGet/Packages/DenoLand.Deno_Microsoft.Winget.Source_8wekyb3d8bbwe"
  cd supabase/functions/<nom-de-la-fonction>
  deno run --allow-net --allow-env --env-file=../../../.env.local index.ts
  ```
- **Test fonctionnel humain** : documenté à chaque itération dans
  `TESTING.md` (réécrit, pas cumulatif — l'historique validé vit dans le
  journal de `PROGRESS.md`).

## Scripts et Edge Functions

| Nom | Type | Rôle |
|---|---|---|
| `check-env` | script | Vérifie que les variables d'environnement obligatoires sont présentes |
| `check-pappers -- <siren>` | script | Teste le mapper Pappers sur une entreprise réelle |
| `import-pharow -- --client-id <uuid> <csv>` | script | Importe un export CSV Pharow (prospects + entreprises + contacts) |
| `test-attribution` | script | Rejoue 8 scénarios du trigger d'attribution contre le vrai Supabase |
| `sync-lemlist -- [--campaign-id <id>] [--since <date>]` | script | Synchro manuelle des activités LinkedIn Lemlist → `interactions` |
| `enrich-pappers` | Edge Function | Enrichissement entreprise (SIREN, NAF, effectif, CA...) |
| `enrich-dropcontact` | Edge Function | Recherche d'email professionnel (asynchrone) |
| `generate-messages` | Edge Function | Génération email + LinkedIn + relance J+7 (Claude) |
| `score-prospect` | Edge Function | Score IA 1-10 + justification (Claude) |
| `webhook-smartlead` | Edge Function | Réception temps réel des événements email Smartlead |

Aucun déclenchement automatique par trigger DB n'est encore câblé — toutes
les Edge Functions s'invoquent aujourd'hui manuellement (`POST { prospect_id }`).

## Déploiement

- **Supabase** : projet réel en ligne, migrations appliquées via
  `pnpm exec supabase db push` (confirmation explicite avant chaque push
  sur ce projet partagé).
- **Vercel** : pas encore fait — dépend d'un vrai client pilote (sous-domaine
  dédié par client, brief §1.3.3). `apps/crm`/`apps/dashboard` tournent en
  local (`pnpm dev`) pour l'instant.
- **Comptes tiers** : Smartlead et Lemlist ont de vraies clés API mais pas
  encore de campagne/client pilote actif — les intégrations sont validées
  par simulation de payloads réels, pas encore par un vrai flux de bout
  en bout (voir `PROGRESS.md`, section "Incertitudes techniques").

## Sécurité des données (RLS)

Trois familles de policies additives par table scopée `client_id`
(`companies`, `contacts`, `prospects`, `interactions`,
`messages_generated`, `deals`, `dmh_clients`) :
- `client_isolation` — schéma initial, accès `service_role` ou UID Auth
  correspondant directement à `dmh_clients.id`.
- `staff_full_access` — accès total pour tout compte listé dans
  `staff_members` (utilisé par `apps/crm`).
- `client_user_access` — accès scopé au client d'un utilisateur listé
  dans `client_users` (utilisé par `apps/dashboard`).

Toutes les policies utilisent `(select auth.uid())`/`(select auth.role())`
plutôt qu'un appel direct (migration `009_performance_and_security_hardening.sql`)
pour que Postgres les évalue une seule fois par requête plutôt qu'à
chaque ligne — recommandation officielle du linter Supabase
(`supabase db advisors`), à relancer périodiquement pour détecter de
nouvelles régressions de perf/sécurité.
