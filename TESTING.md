# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : ⛔ bloqué — confirmation requise avant application de la migration 031

**Segments (/lists) — Lot B (Propriétaire, Mise à jour, Import CSV,
Corbeille)**, S32-segments. Code écrit et vert (`pnpm typecheck`/`pnpm
test` racine, 12 packages, 428 tests côté CRM). Migration
`supabase/migrations/031_lists_metadata.sql` ajoute des colonnes sur
`contact_lists`/`company_lists`/`opportunity_lists` (déjà en production)
et active `pg_cron` — par la règle CLAUDE.md §5, je n'applique **pas**
`supabase db push` sans ta confirmation explicite.

### Ce que fait la migration

1. `created_by`, `updated_at` (+ triggers), `deleted_at` sur les 3 tables
   de listes.
2. Active `pg_cron` (vérifié absent avant cette migration) et programme
   un job quotidien (3h du matin) qui supprime définitivement les listes
   dans la Corbeille depuis plus de 30 jours.

Détail complet dans `PROGRESS.md`, section "2026-09-07 (suite) —
S32-segments : Lot B".

### Étape 1 — confirmer l'application de la migration

Dis-moi si je peux lancer `supabase db push` (ou fais-le toi-même). Rien
ci-dessous n'est testable avant cette étape.

### Étape 2 — protocole de test manuel (dans l'ordre)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir `/segments` (Segments), vérifier que les listes existantes s'affichent toujours normalement | Aucune liste ne disparaît (le filtre `deleted_at is null` ne cache que les nouvelles suppressions) |
| 2 | Créer une liste, vérifier la colonne "Propriétaire" en base (`select created_by from contact_lists order by created_at desc limit 1`) | L'id correspond à ton compte staff |
| 3 | Ajouter/retirer un membre d'une liste statique, vérifier `updated_at` en base | La date change, sans toucher au nom ni aux règles |
| 4 | Cliquer "Supprimer" sur une liste → elle disparaît de la liste principale → cliquer "Corbeille" → elle y apparaît | Comportement soft-delete confirmé |
| 5 | Cliquer "Restaurer" dans la Corbeille | La liste réapparaît dans le tableau principal |
| 6 | "Importer un fichier" avec un petit CSV réel (contacts existants + 1-2 lignes volontairement non reconnues) | La liste créée contient les bons contacts, le toast indique le nombre de lignes non reconnues, aucun nouveau contact n'est créé |

Comme pour tout le reste : pas de vérification visuelle en navigateur
réel possible côté Claude — à valider par toi.

## Rappel — test en attente sur un autre chantier

Le protocole de test de l'extension du moteur d'Automatisations
(migration 030, branches Oui/Non + action "Enrichir") reste également en
attente de ta validation — voir `PROGRESS.md`, section "S32-auto". Pas
perdu, juste pas répété ici (ce fichier ne couvre que le test courant).

## Outillage disponible pour ce chantier

- `pnpm --filter @dmh/crm dev` (port 5173), page `/lists`.
- `supabase db query --linked --project-ref hkonylfpcstbvxswyxyh "<SQL>"`
  pour inspecter l'état réel sans modifier quoi que ce soit.
