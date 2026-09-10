# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : 🔄 lot S33 (revue dev CRM du 08/09) — validation navigateur + confirmation de 3 migrations en attente

Réunion Delphine/Loïc du 08/09/2026, prochaine réunion le 11/09/2026 10h.
Détail dans `PROGRESS.md`, section "2026-09-10 — Revue dev CRM DMH (08/09) :
lot S33".

**⚠️ Avant de tester S33-7/S33-8/S33-9 ci-dessous** : ces 3 points nécessitent
d'appliquer respectivement les migrations `033_pipeline_five_stages.sql`,
`034_deal_contacts.sql` et `035_operator_is_not_set.sql` — écrites et testées
(`pnpm test`), mais **pas appliquées** sur le vrai Supabase. Dis-moi si je
peux lancer `supabase db push` (ou fais-le toi-même) avant de valider ces
points. S33-1 à S33-6 ne nécessitent aucune migration.

**❓ Un point à trancher avant de coder** : "logs/activités filtrables" — je
ne l'ai volontairement pas construit, le CR contenant une décision explicite
qui semble le reporter (voir `PROGRESS.md`, section "S33-10"). À confirmer
avec toi.

### S33-1 — navigation (Contacts/Entreprises/Pipeline retirés de la sidebar)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir la sidebar, groupe "Prospection" | Seuls "Prospects", "Opportunités", "Tâches", "Segments" apparaissent — plus "Contacts"/"Entreprises"/"Pipeline" |
| 2 | Aller sur une fiche Prospect, cliquer le lien vers l'entreprise ou le contact liés | La fiche Contact/Entreprise s'ouvre normalement (`/contacts/:id`, `/companies/:id`) |
| 3 | Taper l'URL `/contacts` ou `/companies` directement dans le navigateur | La page s'affiche normalement (deep-link toujours actif, juste plus dans le menu) |

### S33-2 — vue Kanban fusionnée dans "Prospects"

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir "Prospects" (`/`), cliquer le toggle "Kanban" en haut à droite | Le tableau disparaît, remplacé par les colonnes Kanban |
| 2 | Glisser une carte d'une colonne à une autre | Le statut du prospect change, la carte reste dans sa nouvelle colonne après rechargement |
| 3 | Cliquer sur une carte (pas glisser, un simple clic) | La fiche détail du prospect s'ouvre |
| 4 | Cliquer le toggle "Liste" | Retour au tableau, filtres/tri toujours fonctionnels |
| 5 | Ouvrir l'URL `/pipeline` directement | Redirection automatique vers `/?view=kanban`, le Kanban s'affiche |

### S33-3 — panneau "+ Nouveau" (Header)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Cliquer "+ Nouveau" en haut à droite (visible depuis n'importe quel écran) | Un panneau avec 3 choix apparaît : Contact / Entreprise / Opportunité |
| 2 | Choisir "Contact", remplir et valider | Le contact (+ prospect associé) est créé, comme avant avec "+ Contact" |
| 3 | Choisir "Entreprise", remplir et valider | L'entreprise est créée, redirection vers sa fiche |
| 4 | Choisir "Opportunité", remplir et valider | L'opportunité est créée, redirection vers sa fiche |
| 5 | Rouvrir "+ Nouveau" après une création | Le panneau repart bien sur l'écran de choix (pas bloqué sur le dernier dialogue ouvert) |

### S33-4 — import CSV Contacts/Entreprises

**Pré-requis pour vérifier l'enrichissement automatique** : un client DMH
avec une automatisation active (`/automations`, `entity_type` = "Prospect",
déclencheur "à la création", action "Enrichir" — provider `pappers`) et le
secret Vault `app_service_role_key` rempli (voir S32-auto plus bas, déjà
signalé comme en attente). Sans ça, le prospect est bien créé en statut "à
enrichir" mais rien ne se passe automatiquement — comportement attendu, pas
un bug de cet import.

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur `/contacts`, cliquer "Importer", choisir un client, uploader un CSV avec colonnes Prénom/Nom/Entreprise/Email | Les colonnes sont pré-associées automatiquement, l'aperçu affiche le nombre de lignes prêtes |
| 2 | Modifier manuellement une correspondance de colonne dans le menu déroulant | L'aperçu (lignes prêtes/ignorées) se met à jour immédiatement |
| 3 | Importer un CSV avec une ligne sans prénom et une ligne avec un email déjà utilisé par un contact existant | Ces 2 lignes apparaissent dans "ignorée(s)" avec la raison, les autres sont importées |
| 4 | Importer deux lignes qui partagent la même entreprise (même nom, casse différente) | Une seule entreprise créée, réutilisée pour la 2e ligne (vérifiable sur `/companies`) |
| 5 | Après import, ouvrir un des nouveaux contacts | Le contact et son entreprise existent, un prospect en statut "à enrichir" est visible sur `/?view=kanban` |
| 6 | (Si le pré-requis ci-dessus est rempli) Attendre quelques secondes puis rafraîchir la fiche entreprise | Les champs SIREN/secteur/effectif se remplissent (enrichissement Pappers réellement déclenché) |
| 7 | Sur `/companies`, cliquer "Importer", uploader un CSV Nom/Ville/Site web | Les entreprises sont créées, aucun prospect ni enrichissement (limite attendue, voir `PROGRESS.md`) |

### S33-5 — sous-navigation Vue globale/Kanban/Contacts/Entreprises

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur "Prospects" (`/`), regarder la barre d'actions | 4 boutons/liens : "Vue globale", "Kanban", "Contacts", "Entreprises" |
| 2 | Cliquer "Contacts" depuis `/` | Navigue vers `/contacts`, la même barre à 4 entrées est visible, "Contacts" est actif |
| 3 | Depuis `/contacts`, cliquer "Kanban" | Navigue vers `/?view=kanban`, le Kanban s'affiche directement |
| 4 | Depuis `/companies`, cliquer "Vue globale" | Navigue vers `/`, la vue tableau des prospects s'affiche |
| 5 | Sur `/`, basculer Liste ↔ Kanban via ces mêmes boutons | Comportement identique à avant (S33-2, pas de navigation, juste une bascule locale) |

### S33-6 — Kanban Prospection limité à 8 colonnes (arrêt au RDV pris)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir le Kanban Prospects (`/?view=kanban`) | 8 colonnes visibles (à enrichir → RDV pris, + "Pas intéressé"), plus de colonnes Qualifié/Proposition envoyée/Gagné/Perdu |
| 2 | Sur la vue Liste (`/`), filtre "Statuts" | Les 12 statuts sont toujours proposés (inchangé) |
| 3 | (Si un prospect existant a le statut Qualifié/Gagné/etc., via la base) | Il reste visible et filtrable en vue Liste, absent du Kanban (comportement voulu, pas un bug) |

### S33-7 — pipeline Opportunités à 5 étapes *(nécessite migration 033)*

| # | Test | Résultat attendu |
|---|---|---|
| 1 | `/opportunities`, vue Kanban, choisir un client | 5 colonnes visibles : Nouveau, Qualifié, Proposition envoyée, Négociation, Gagné, Perdu (6 au total, Gagné/Perdu distincts) |
| 2 | Vérifier une opportunité déjà classée avant la migration | Reste dans sa colonne d'origine (Négociation/Gagné/Perdu), pas déplacée |

### S33-8 — opportunité liée à plusieurs contacts *(nécessite migration 034)*

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir une fiche Opportunité | Carte "Contacts liés" visible, avec le contact principal existant marqué "Principal" |
| 2 | Lier un contact existant avec un rôle (ex. "Juridique") | Le contact apparaît dans la liste avec son rôle entre parenthèses |
| 3 | Cliquer "+ Nouveau contact", créer un contact | Le nouveau contact est automatiquement lié à l'opportunité |
| 4 | Cliquer "Retirer" sur un contact lié | Le contact disparaît de la liste (la fiche contact elle-même n'est pas supprimée) |

### S33-9 — opérateurs "connu/inconnu" + dates *(nécessite migration 035)*

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur un éditeur de conditions (Segments, Automatisations), ouvrir la liste des opérateurs | "n'est pas renseigné (inconnu)" apparaît, sans champ valeur associé |
| 2 | Créer une liste dynamique avec une condition "date de signature" + "supérieur à / après" + une date | Seules les opportunités signées après cette date apparaissent (vérifie que la comparaison de date fonctionne, pas juste les nombres) |

## Rappel — tests en attente sur d'autres chantiers

- **⛔ Bloquant** : Segments (/lists) — Lot C (Dossiers), migration
  `supabase/migrations/032_list_folders.sql` écrite mais **non appliquée** —
  toujours en attente de ta confirmation explicite avant `supabase db push`
  (voir `PROGRESS.md`, section "S32-segments : Lot C (Dossiers)"). Non lié à
  ce lot S33, pas retesté ici.
- Automatisations (migration 030, branches Oui/Non + "Enrichir") — voir
  `PROGRESS.md`, section "S32-auto".
- Segments Lot B (migration 031, Propriétaire/Mise à jour/Import CSV/
  Corbeille) — voir `PROGRESS.md`, section "S32-segments : migration
  031 appliquée en production".

Pas perdus, juste pas répétés ici (ce fichier ne couvre que le test
courant).

## Outillage disponible pour ce chantier

- `pnpm --filter @dmh/crm dev` (port 5173).
- `supabase db query --linked --project-ref hkonylfpcstbvxswyxyh "<SQL>"`
  pour inspecter l'état réel sans modifier quoi que ce soit.
