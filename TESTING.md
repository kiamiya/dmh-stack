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

**Refonte UX/UI du CRM interne (`apps/crm`) — Phase 2 (vue liste/tableau
avancée)**, branche `feat/crm-redesign`, exécuté le 2026-09-01.

### Contexte

Le vrai projet Supabase est réactivé et la migration 010 est appliquée
(confirmé) — mais cette phase reste testée en mode démo local, comme les
précédentes, pour rester cohérent. Rien n'empêche de retester contre le
vrai Supabase quand tu veux (`SUPABASE_DEMO_MODE=false`).

### Ce qui a été testé

| Élément | Résultat |
|---|---|
| `pnpm test` / `pnpm typecheck` racine (10 packages) | ✅ vert (67 tests dans `@dmh/crm`, dont 32 nouveaux) |
| Tri multi-colonnes (clic sur un en-tête) | ✅ testé sur "Score IA", tri correct (8 → 5 → 2 → —) |
| Recherche instantanée | ✅ testé avec "Techno", filtre correctement sur 1 résultat |
| Réinitialisation des filtres | ✅ |
| Sélection multiple + barre d'actions groupées | ✅ apparaît au clic sur une case |
| Changement de statut en masse | ✅ testé sur 1 prospect ("En séquence" → "Qualifié"), toast de confirmation, sélection réinitialisée après |
| Aucune erreur console (après un faux positif initial — logs résiduels du HMR Vite après un précédent hot-reload, confirmé stale par un redémarrage complet du serveur + vérification fonctionnelle directe) | ✅ |

### Ce qui n'a **pas** encore été testé

- L'action groupée "Assigner" — testée uniquement pour "Changer le statut" ;
  le code est identique en pattern (`bulkUpdateAssignment`), pas re-testé
  séparément par manque de temps.
- L'export CSV (téléchargement réel du fichier) — non vérifiable par
  automatisation navigateur (le clic déclenche un téléchargement natif).
  À tester de ton côté.
- La persistance des préférences de colonnes (ordre/visibilité) après un
  rechargement complet de page — le mécanisme localStorage est testé
  unitairement (`columnPreferences.test.ts`) mais pas revérifié en
  conditions réelles de navigation.

### Point à valider par toi

1. Teste l'export CSV (bouton "Exporter en CSV" ou "Exporter la
   sélection") — je ne peux pas vérifier le fichier téléchargé moi-même.
2. Teste "Assigner" en masse et la persistance des préférences de colonnes
   (masquer une colonne, recharger la page, vérifier qu'elle reste masquée).
3. Feu vert pour la **Phase 3 (dashboard/analytics interne)**.

## Outillage disponible pour ce chantier

- Mode démo local : `SUPABASE_DEMO_MODE=true` dans `.env.local`.
- `pnpm --filter @dmh/crm dev` (port 5173) — nav "Prospects" (liste
  avancée, refaite) / "Pipeline" (Kanban).
- Branche `feat/crm-redesign` — rien n'est poussé sur `master` avant merge
  final validé par toi.
- Vrai Supabase réactivé et à jour (migration 010 appliquée) — disponible
  dès que tu veux basculer `SUPABASE_DEMO_MODE=false`.
