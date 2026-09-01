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

**Refonte UX/UI du CRM interne (`apps/crm`) — résorption de dette
technique : sous-onglets sur le Dashboard**, branche `feat/crm-redesign`,
exécuté le 2026-09-01. `/dashboard` est réorganisé en 4 onglets (Vue
d'ensemble / Évolution / Scores & Deals / Activité) au lieu d'empiler
toutes les sections verticalement — testé en navigateur, bascule
instantanée entre les 4 onglets, contenu correct dans chacun. Aucune
logique changée, uniquement la présentation.

Vient après les 4 améliorations UX précédentes (panneau latéral, vues en
onglets, fil d'activité groupé par jour, undo) et les 6 phases initiales
(toutes terminées) :

### Ce qui a été fait

1. **Panneau latéral pour la fiche prospect** — s'ouvre par-dessus la
   liste/le Kanban (pattern background-location React Router), au lieu
   d'une navigation plein écran qui faisait perdre le scroll/filtres/
   sélection.
2. **Vues sauvegardées en onglets épinglés** dans `/prospects` (au lieu
   d'un dropdown) — "Toutes" + une vue par onglet + "+ Nouvelle vue".
3. **Fil d'activité du Dashboard groupé par jour** ("Aujourd'hui", "Hier",
   date complète au-delà).
4. **Undo sur les actions groupées** — le toast de confirmation propose
   "Annuler", qui restaure la valeur propre à chaque prospect.

**Corrigé au passage** : le mode démo ne reproduisait pas le trigger
`prospect_status_change` (migration 010) — un changement de statut fait
dans le CRM n'apparaissait jamais dans le fil d'activité/funnel en mode
démo. `mockSupabase.ts` journalise maintenant l'historique comme le
ferait la vraie base.

### Ce qui a été testé

| Élément | Résultat |
|---|---|
| `pnpm test` / `pnpm typecheck` racine (10 packages) | ✅ vert (116 tests dans `@dmh/crm`, +10) |
| Ouverture du panneau latéral (clic sur un prospect depuis la liste) | ✅ liste visible en arrière-plan, filtres/scroll préservés |
| Fermeture du panneau (bouton "✕ Fermer") | ✅ retour à `/`, état de la liste intact |
| Onglets de vues sauvegardées | ✅ "Toutes" / vue existante testées, bascule correcte |
| Undo sur changement de statut groupé | ✅ testé de bout en bout : statut changé → toast "Annuler" → clic → statut restauré à sa valeur d'origine, confirmé visuellement |
| Fil d'activité groupé par jour, y compris "Aujourd'hui" en temps réel | ✅ après correction du mode démo, un changement de statut fait à l'instant apparaît bien sous "Aujourd'hui" |
| Aucune erreur console réelle (résidus de logs HMR déjà expliqués précédemment, confirmés stale) | ✅ |

### Point à valider par toi

1. Teste le panneau latéral et l'undo toi-même en conditions réelles.
2. Toutes les phases (0-6) + ces 4 améliorations sont maintenant
   terminées. Dis-moi si tu veux merger `feat/crm-redesign` dans `master`,
   ou d'abord relire l'ensemble du chantier.

## Dette technique actée (hors périmètre de cette refonte)

- **Pas de store partagé entre les instances de `useProspects()`** — la
  palette de commandes et la page affichée ont chacune leur propre état ;
  une action depuis la palette persiste réellement mais ne rafraîchit pas
  la liste visible sans navigation. Corriger demanderait un cache/store
  partagé (React Query ou équivalent).
- ~~Pas de navigation par sous-onglets entre les cartes du Dashboard~~ **Résolu le 2026-09-01** — `/dashboard` utilise maintenant `Tabs` (4 onglets).
- **Recherche globale mono-entité** — la palette cmd+K ne cherche que les
  prospects, pas entreprises/contacts/deals séparément.
- **Pas de champs personnalisés (custom properties)** — impliquerait un
  schéma flexible (JSONB/EAV) : changement d'architecture à part entière,
  à cadrer séparément si DMH le souhaite un jour.

## Outillage disponible pour ce chantier

- Mode démo local : `SUPABASE_DEMO_MODE=true` dans `.env.local`.
- `pnpm --filter @dmh/crm dev` (port 5173).
- Branche `feat/crm-redesign` — rien n'est poussé sur `master` avant merge
  final validé par toi.
- Vrai Supabase réactivé, migration 010 appliquée.
