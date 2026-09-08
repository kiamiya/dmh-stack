# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : ⛔ bloqué — confirmation requise avant application de la migration 032

**Segments (/lists) — Lot C (Dossiers)**, S32-segments. Code écrit et
vert (`pnpm typecheck`/`pnpm test` racine, 12 packages, 454 tests côté
CRM). Migration `supabase/migrations/032_list_folders.sql` crée une
nouvelle table `list_folders` et ajoute `folder_id` sur les 3 tables de
listes (déjà en production) — par la règle CLAUDE.md §5, je n'applique
**pas** `supabase db push` sans ta confirmation explicite.

### Ce que fait la migration

1. Nouvelle table `list_folders` (arbre à 2 niveaux, rattachée à un
   client DMH — décision de cadrage prise avec toi), avec les mêmes 3
   policies RLS que `contact_lists`.
2. `folder_id` (nullable) ajouté sur `contact_lists`/`company_lists`/
   `opportunity_lists` — supprimer un dossier ne supprime jamais les
   listes qu'il contenait, juste les déclasse (`on delete set null`).

Détail complet dans `PROGRESS.md`, section "2026-09-08 (suite) —
S32-segments : Lot C (Dossiers)".

### Étape 1 — confirmer l'application de la migration

Dis-moi si je peux lancer `supabase db push` (ou fais-le toi-même). Rien
ci-dessous n'est testable avant cette étape.

### Étape 2 — protocole de test manuel (dans l'ordre)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir `/segments`, sélectionner un client dans le filtre "Client DMH" | Une colonne "Dossiers" apparaît à gauche (vide au départ) |
| 2 | Cliquer "+ Dossier", créer un dossier racine | Le dossier apparaît dans l'arbre |
| 3 | Créer un sous-dossier (choisir le dossier créé comme parent) | Le sous-dossier apparaît indenté sous le dossier racine |
| 4 | Dans le tableau, changer le "Dossier" d'une liste existante via le menu déroulant de la colonne | La liste apparaît quand on clique sur ce dossier dans l'arbre |
| 5 | Cliquer sur le dossier racine (celui qui a le sous-dossier) | Les listes classées dans le sous-dossier apparaissent aussi (agrégation parent) |
| 6 | Supprimer le dossier racine (bouton ×, confirmer) | Le sous-dossier disparaît aussi, mais la liste qui y était classée reste intacte (juste déclassée — vérifiable via la colonne "Dossier" qui repasse à "—") |
| 7 | Créer une liste ou importer un CSV en choisissant un dossier dans le formulaire | La liste apparaît directement classée dans ce dossier |

Comme pour tout le reste : pas de vérification visuelle en navigateur
réel possible côté Claude — à valider par toi.

## Rappel — tests en attente sur d'autres chantiers

- Automatisations (migration 030, branches Oui/Non + "Enrichir") — voir
  `PROGRESS.md`, section "S32-auto".
- Segments Lot B (migration 031, Propriétaire/Mise à jour/Import CSV/
  Corbeille) — voir `PROGRESS.md`, section "S32-segments : migration
  031 appliquée en production".

Pas perdus, juste pas répétés ici (ce fichier ne couvre que le test
courant).

## Outillage disponible pour ce chantier

- `pnpm --filter @dmh/crm dev` (port 5173), page `/lists`.
- `supabase db query --linked --project-ref hkonylfpcstbvxswyxyh "<SQL>"`
  pour inspecter l'état réel sans modifier quoi que ce soit.
