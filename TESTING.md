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
