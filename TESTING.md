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

**Refonte UX/UI du CRM interne (`apps/crm`) — Phase 1 (Kanban + fiche
prospect refaite)**, branche `feat/crm-redesign`, exécuté le 2026-08-26.

### Contexte : le vrai projet Supabase reste en pause

Toujours injoignable (`hkonylfpcstbvxswyxyh.supabase.co`, statut `INACTIVE`
confirmé via `supabase projects list` — le nom affiché côté dashboard est
"Filum", pas "dmh-stack" : à vérifier que c'est bien le bon projet). Testé
contre le mode démo local, comme en Phase 0.

**Migration `010_add_crm_activity_tracking.sql`** : tu as donné le go, mais
la base restant injoignable, `supabase db push --linked` ne peut pas encore
s'exécuter. Je la relance dès que le projet est réactivé. Elle a été élargie
en Phase 1 (policy `staff_members` trop restrictive pour le sélecteur
d'assignation — voir le fichier de migration pour le détail).

### Ce qui a été testé

| Élément | Résultat |
|---|---|
| `pnpm --filter @dmh/crm test` (35 tests) | ✅ vert |
| `pnpm typecheck` racine (11 packages) | ✅ vert |
| **Kanban** (`/pipeline`) : 12 colonnes, répartition correcte des 4 prospects démo | ✅ |
| Carte compacte : avatar initiales, score IA, dernière activité relative | ✅ |
| Drag & drop initialisé (annonces d'accessibilité dnd-kit présentes) | ✅ — pas testé bout en bout par automatisation (déplacement réel d'une carte), à confirmer visuellement de ton côté |
| **Fiche prospect** : Score IA, Messages (Tabs Email/LinkedIn/Relance), timeline d'activité, panneau Pappers (SIREN inclus), Contact, Assignation | ✅ |
| Ajout d'une note via le formulaire | ✅ apparaît immédiatement en tête de la timeline avec auteur |
| Changement d'assignation | ✅ |
| Aucune erreur console | ✅ |

### Ce qui n'a **pas** encore été testé

- Le drag & drop réel (glisser une carte d'une colonne à l'autre) — je n'ai
  testé que l'initialisation technique, pas le geste lui-même. À valider de
  ton côté dans le navigateur.
- Le sélecteur d'assignation et l'auteur des notes ne fonctionneront contre
  le **vrai** Supabase qu'une fois la migration 010 appliquée (colonnes
  `assigned_to`/`created_by` inexistantes tant que non poussée).

### Point à valider par toi

1. Teste le drag & drop toi-même sur `/pipeline` (glisser une carte vers une
   autre colonne) — je n'ai pas pu le vérifier par ce biais.
2. Dis-moi quand le projet Supabase "Filum" est réactivé pour que je pousse
   la migration 010 et qu'on revalide tout contre la vraie base.
3. Feu vert pour la **Phase 2 (vue liste/tableau avancée)**.

## Outillage disponible pour ce chantier

- Mode démo local : `SUPABASE_DEMO_MODE=true` dans `.env.local` — connexion
  avec n'importe quel email/mot de passe, 4 prospects factices (avec statuts
  variés, assignations, interactions).
- `pnpm --filter @dmh/crm dev` (port 5173) — nav "Prospects" (liste) /
  "Pipeline" (Kanban, nouveau).
- Branche `feat/crm-redesign` — rien n'est poussé sur `master` avant merge
  final validé par toi.
