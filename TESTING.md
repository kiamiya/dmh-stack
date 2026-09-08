# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : 🔄 migration appliquée — reste ta validation manuelle

**Segments (/lists) — Lot B (Propriétaire, Mise à jour, Import CSV,
Corbeille)**, S32-segments. Code écrit et vert (`pnpm typecheck`/`pnpm
test` racine, 12 packages, 428 tests côté CRM). Migration
`supabase/migrations/031_lists_metadata.sql` **appliquée en production
le 2026-09-08** (confirmée par toi) — vérifiée en lecture seule après
coup : les 9 colonnes ont le bon type, `pg_cron` actif, le job
`purge-old-deleted-lists` programmé et actif. 0 liste en production à
ce jour : rien à régresser.

Détail complet dans `PROGRESS.md`, section "2026-09-08 — S32-segments :
migration 031 appliquée en production".

### Protocole de test manuel (dans l'ordre)

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
