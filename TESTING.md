# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : ✅ vérifié en local (mode démo) — en attente de ta relecture

**Refonte UX/UI du CRM interne (`apps/crm`) — Phase 0 (fondations)**,
branche `feat/crm-redesign`, exécuté le 2026-08-26.

### Contexte : le vrai projet Supabase est en pause

`hkonylfpcstbvxswyxyh.supabase.co` ne résout plus en DNS (mis en pause pour
inactivité, incident déjà rencontré et documenté par Loïc le 2026-07-30). En
attendant sa réactivation, cette phase a été testée contre un **mode démo
local** (`SUPABASE_DEMO_MODE=true` dans `.env.local`, jamais commité) : un
faux client Supabase en mémoire (`apps/crm/src/lib/mockSupabase.ts` +
`mockData.ts`) qui reproduit exactement l'API utilisée par le CRM
(auth + requêtes), sur 4 prospects factices couvrant plusieurs statuts. Ce
n'est pas un remplacement du test contre la vraie base — juste ce qui est
possible tant que le projet reste inaccessible. **À revalider contre le vrai
Supabase dès sa réactivation.**

### Ce qui a été testé

| Élément | Résultat |
|---|---|
| `pnpm --filter @dmh/crm typecheck` | ✅ vert |
| `pnpm --filter @dmh/crm test` (23 tests : status, score, avatar, services/prospects) | ✅ vert |
| `pnpm typecheck` racine (11 packages) | ✅ vert, aucune régression |
| Connexion (mode démo, identifiants arbitraires) | ✅ |
| Liste des prospects (`useProspects`, nouveau hook) | ✅ mêmes 4 prospects, mêmes colonnes/scores/statuts qu'avant le refactor |
| Nouveaux tokens CSS (palette sobre + accent indigo) | ✅ compile sans erreur PostCSS après redémarrage du serveur Vite (le premier essai a échoué — `tailwind.config.ts` n'est pas rechargé à chaud, redémarrage nécessaire, sans rapport avec le code lui-même) |
| Aucune erreur console au chargement | ✅ (hors WebSocket HMR, sans rapport) |

### Ce qui n'a **pas** encore été testé (prévu en Phase 1+)

- Les nouvelles primitives UI (Skeleton, Avatar, Dialog, DropdownMenu, Tabs,
  Toast) sont écrites mais pas encore utilisées dans une page réelle — pas
  de retour visuel à donner dessus pour l'instant, elles serviront dès la
  Phase 1 (Kanban, fiche prospect refaite).
- La migration `010_add_crm_activity_tracking.sql` n'a pas été appliquée
  (attendu — voir ci-dessous).

### Point à valider par toi

1. **Confirmer le go pour la migration** `supabase/migrations/010_add_crm_activity_tracking.sql`
   (`interactions.created_by`, `prospects.assigned_to`, table
   `prospect_status_history` + trigger de log automatique) — je ne lance
   `supabase db push` que sur ta confirmation explicite séparée.
2. Confirmer que le refactor de `ProspectsList`/`ProspectDetail` vers les
   nouveaux hooks/services n'a rien changé de visible (comportement
   identique attendu).
3. Feu vert pour enchaîner sur la **Phase 1 (Kanban + fiche prospect
   refaite)**.

## Outillage disponible pour ce chantier

- Mode démo local : `SUPABASE_DEMO_MODE=true` dans `.env.local` (voir
  `apps/crm/src/lib/mockSupabase.ts`) — connexion avec n'importe quel
  email/mot de passe, 4 prospects factices.
- `pnpm --filter @dmh/crm dev` (port 5173).
- Branche `feat/crm-redesign` — rien n'est poussé sur `master` avant merge
  final validé par toi.
