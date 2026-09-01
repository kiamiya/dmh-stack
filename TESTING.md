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

**Refonte UX/UI du CRM interne (`apps/crm`) — Phase 6 (mode sombre,
optionnelle)**, branche `feat/crm-redesign`, exécuté le 2026-09-01.
**Toutes les phases prévues sont maintenant terminées.**

### Ce qui a été testé

| Élément | Résultat |
|---|---|
| `pnpm typecheck` racine (10 packages) | ✅ vert (111 tests dans `@dmh/crm`, +9) |
| Détection automatique de la préférence système | ✅ le navigateur de test préfère le sombre — le CRM s'est ouvert directement en mode sombre, sans action |
| Bascule clair → sombre → système (bouton dans le Header) | ✅ icône et rendu changent correctement à chaque clic |
| Rendu en mode sombre : liste, Dashboard (stats, statuts, funnel, fil d'activité, deals) | ✅ tout lisible, contrastes corrects, badges/alertes de stagnation cohérents |
| Anti-flash au chargement | ✅ pas de flash clair→sombre visible au premier rendu |
| Aucune erreur console | ✅ |

### Ce qui n'a **pas** été re-testé

- Le Kanban (`/pipeline`) et la fiche prospect en mode sombre spécifiquement
  — même mécanisme de tokens que le reste, très probablement correct, mais
  pas vérifié visuellement image par image dans cette phase précise.

### Point à valider par toi

1. Vérifie `/pipeline` et une fiche prospect en mode sombre de ton côté.
2. **Toutes les phases (0 à 6) sont maintenant terminées.** Dis-moi si tu
   veux merger `feat/crm-redesign` dans `master`, ou d'abord relire
   l'ensemble du chantier.

## Dette technique actée (hors périmètre de cette refonte)

- **Pas de store partagé entre les instances de `useProspects()`** (Phase
  4) — la palette de commandes et la page affichée ont chacune leur propre
  état ; une action depuis la palette persiste réellement mais ne
  rafraîchit pas la liste visible sans navigation. Corriger demanderait un
  cache/store partagé (React Query ou équivalent).
- **Pas de navigation par sous-onglets entre les cartes du Dashboard**
  (Phase 5) — la page empile actuellement toutes les sections
  verticalement. Un système de Tabs (déjà posé en Phase 0) faciliterait la
  navigation sans tout scroller.

## Outillage disponible pour ce chantier

- Mode démo local : `SUPABASE_DEMO_MODE=true` dans `.env.local`.
- `pnpm --filter @dmh/crm dev` (port 5173).
- Branche `feat/crm-redesign` — rien n'est poussé sur `master` avant merge
  final validé par toi.
- Vrai Supabase réactivé, migration 010 appliquée.
