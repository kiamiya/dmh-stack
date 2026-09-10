# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : 🔄 lot S33 (revue dev CRM du 08/09) — validation navigateur en attente

Réunion Delphine/Loïc du 08/09/2026, prochaine réunion le 11/09/2026 10h.
3 tâches codées et testées (`pnpm typecheck`/`pnpm test` verts), aucune
migration nécessaire. Détail dans `PROGRESS.md`, section "2026-09-10 —
Revue dev CRM DMH (08/09) : lot S33".

### S33-1 — navigation (Contacts/Entreprises/Pipeline retirés de la sidebar)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir la sidebar, groupe "Prospection" | Seuls "Prospects", "Opportunités", "Tâches", "Segments" apparaissent — plus "Contacts"/"Entreprises"/"Pipeline" |
| 2 | Aller sur une fiche Prospect, cliquer le lien vers l'entreprise ou le contact liés | La fiche Contact/Entreprise s'ouvre normalement (`/contacts/:id`, `/companies/:id`) |
| 3 | Taper l'URL `/contacts` ou `/companies` directement dans le navigateur | La page s'affiche normalement (deep-link toujours actif, juste plus dans le menu) |

### S33-2 — vue Kanban fusionnée dans "Prospects"

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir "Prospects" (`/`), cliquer le toggle "Kanban" en haut à droite | Le tableau disparaît, remplacé par les colonnes Kanban (mêmes statuts qu'avant sur `/pipeline`) |
| 2 | Glisser une carte d'une colonne à une autre | Le statut du prospect change, la carte reste dans sa nouvelle colonne après rechargement |
| 3 | Cliquer sur une carte (pas glisser, un simple clic) | La fiche détail du prospect s'ouvre (vérifie que le correctif du bug de clic, factorisé dans `useKanbanDndSensors`, fonctionne toujours ici) |
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

### S33-5 — sous-navigation Vue globale/Kanban/Contacts/Entreprises

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur "Prospects" (`/`), regarder la barre d'actions | 4 boutons/liens : "Vue globale", "Kanban", "Contacts", "Entreprises" |
| 2 | Cliquer "Contacts" depuis `/` | Navigue vers `/contacts`, la même barre à 4 entrées est visible, "Contacts" est actif |
| 3 | Depuis `/contacts`, cliquer "Kanban" | Navigue vers `/?view=kanban`, le Kanban s'affiche directement |
| 4 | Depuis `/companies`, cliquer "Vue globale" | Navigue vers `/`, la vue tableau des prospects s'affiche |
| 5 | Sur `/`, basculer Liste ↔ Kanban via ces mêmes boutons | Comportement identique à avant (S33-2, pas de navigation, juste une bascule locale) |

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
