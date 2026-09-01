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

**Refonte UX/UI du CRM interne (`apps/crm`) — Phase 5 (fil d'activité +
indicateurs de stagnation)**, branche `feat/crm-redesign`, exécuté le
2026-09-01. **Dernière phase obligatoire** — reste seulement le mode
sombre optionnel (Phase 6).

### Ce qui a été testé

| Élément | Résultat |
|---|---|
| `pnpm test` / `pnpm typecheck` racine (10 packages) | ✅ vert (102 tests dans `@dmh/crm`, +10) |
| Fil d'activité (Dashboard) | ✅ fusion correcte des changements de statut et interactions, tri chronologique décroissant vérifié |
| Auteur affiché sur les changements manuels | ✅ "William Demo"/"Loïc Demo" apparaissent bien sur les transitions marquées `changed_by` dans les données démo |
| Indicateur stagnant sur le Kanban | présent dans le code, pas re-testé visuellement séparément (même logique que la liste, déjà vérifiée) |
| Indicateur stagnant sur la liste | ✅ "⚠" affiché sur "Groupe Techno Soudure" (22 jours sans activité), absent sur les autres |
| Carte "Prospects stagnants" (Dashboard) | ✅ "Prospects stagnants (1)" — exactement le prospect attendu |
| Aucune erreur console | ✅ |

### Point à valider par toi

1. Vérifie visuellement `/dashboard` et `/pipeline` de ton côté.
2. Confirme le seuil de stagnation (14 jours par défaut, `stagnation.ts`)
   — à ajuster si ce n'est pas le bon rythme pour DMH.
3. Feu vert pour merger `feat/crm-redesign` dans `master`, ou pour
   attaquer le mode sombre (Phase 6, optionnelle) avant.

## Dette technique actée (pas dans le périmètre de cette refonte)

- **Pas de store partagé entre les instances de `useProspects()`** — la
  palette de commandes (Phase 4) et la page affichée ont chacune leur
  propre état. Une action depuis la palette (ex. changer un statut)
  persiste bien réellement, mais la liste visible ne se rafraîchit pas
  automatiquement tant qu'on ne navigue pas. Corriger proprement
  demanderait d'introduire un cache/store partagé (React Query ou
  équivalent) — hors périmètre de cette refonte, à traiter comme un
  chantier dédié si souhaité.

## Outillage disponible pour ce chantier

- Mode démo local : `SUPABASE_DEMO_MODE=true` dans `.env.local`.
- `pnpm --filter @dmh/crm dev` (port 5173).
- Branche `feat/crm-redesign` — rien n'est poussé sur `master` avant merge
  final validé par toi.
