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

**Refonte UX/UI du CRM interne (`apps/crm`) — Phase 3 (dashboard/analytics
interne)**, branche `feat/crm-redesign`, exécuté le 2026-09-01.

### Ce qui a été testé

| Élément | Résultat |
|---|---|
| `pnpm test` / `pnpm typecheck` racine (10 packages) | ✅ vert (81 tests dans `@dmh/crm`, dont 19 nouveaux) |
| Nouvelle page `/dashboard` (nav "Dashboard") | ✅ |
| Tuiles de stats (total, en séquence, deals gagnés, commission cumulée) | ✅ valeurs cohérentes avec les données démo |
| Compteurs par statut (12, y compris à 0) | ✅ |
| Funnel de conversion | ✅ calcul vérifié à la main : 4 → 3 (75%) → 3 (100%) → 3 (100%) → 2 (66.7%) → 1 (50%) → 1 (100%) → 1 (100%) → 0 — cohérent avec l'historique de statuts factice |
| Évolution hebdomadaire (nouveaux prospects, deals gagnés) | ✅ graphiques SVG faits main, tooltips au survol des points, table de données accessible en alternative |
| Top 5 prospects par score IA | ✅ tri correct (8, 5, 2) |
| Liste des deals avec attribution/commission | ✅ (2 gagnés dont 1 attribué à 1800€, 1 perdu) |
| Aucune erreur console réelle (mêmes logs résiduels de HMR déjà expliqués en Phase 2, confirmés stale) | ✅ |

### Décision technique notable

Le funnel utilise `prospect_status_history` (migration 010, maintenant
appliquée) plutôt que le statut courant des prospects — un prospect passé
à `qualified` a bien "atteint" `ready` même s'il ne s'y trouve plus. Un
comptage naïf par statut courant aurait fortement sous-estimé les
premières étapes du pipeline.

### Ce qui n'a **pas** encore été testé

- Contre le **vrai** Supabase — toujours testé en mode démo par cohérence
  avec les phases précédentes. Le vrai historique de statuts (migration
  010) n'a que très peu de recul réel (juste appliquée), donc le funnel
  sera peu significatif tant que le pipeline n'a pas vraiment tourné.
- Le rendu sur un jeu de données plus large (le mode démo n'a que 4
  prospects et 3 deals) — les graphiques n'ont pas été éprouvés avec plus
  de points/semaines.

### Point à valider par toi

1. Vérifie visuellement `/dashboard` de ton côté.
2. Feu vert pour la **Phase 4 (recherche cmd+K + vues sauvegardées)**.

## Outillage disponible pour ce chantier

- Mode démo local : `SUPABASE_DEMO_MODE=true` dans `.env.local`.
- `pnpm --filter @dmh/crm dev` (port 5173) — nav "Prospects" / "Pipeline" /
  "Dashboard" (nouveau).
- Branche `feat/crm-redesign` — rien n'est poussé sur `master` avant merge
  final validé par toi.
- Vrai Supabase réactivé, migration 010 appliquée.
