# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : ✅ correctif exécuté par mes soins — en attente de ta relecture

Suite à ton retour ("aucune UX/UI n'est disponible pour naviguer entre les
pages") : le CRM (`apps/crm`) n'avait en fait **aucun header ni menu de
navigation**, contrairement au Dashboard qui en a un depuis le début. Un
vrai manque, pas un souci de compréhension de ta part. Corrigé le
2026-07-31, testé dans un vrai navigateur (Playwright headless, même
outillage jetable que les itérations précédentes).

### Ce qui a changé

- **Header ajouté au CRM** (`apps/crm/src/components/Header.tsx`, même
  structure que celui du Dashboard) : titre "DMH CRM", nav "Prospects",
  email du membre staff connecté, bouton "Déconnexion" (qui n'existait pas
  du tout auparavant — il n'y avait aucun moyen de se déconnecter dans le
  CRM).
- **Lien "← Retour aux prospects"** ajouté sur la fiche détail d'un
  prospect — jusque-là, seul le bouton précédent du navigateur permettait
  d'y revenir.
- Périmètre volontairement limité au CRM lui-même (pas de lien croisé vers
  le Dashboard) : les deux apps servent des publics différents (staff
  interne vs. client), un lien direct entre les deux n'a pas de sens
  produit évident et n'a pas été demandé — à revoir si besoin.

### Étapes exécutées et résultat

1. `pnpm --filter @dmh/crm dev` (port 5173) — démarre sans erreur.
2. Connexion avec ton compte réel (`lrd@dmhassocies.com`).
3. Header visible sur la liste des prospects : titre, nav "Prospects" (état
   actif), email affiché, bouton "Déconnexion".
4. Clic sur un prospect → fiche détail → header toujours visible + lien
   "← Retour aux prospects" en haut de page.
5. Clic sur le lien retour → revient bien à la liste (`/`).
6. Clic sur "Déconnexion" → redirige bien vers `/login`.
7. Aucune erreur console sur l'ensemble du parcours.

**Point à valider par toi** : peux-tu maintenant naviguer dans le CRM et
tester le Dashboard comme demandé initialement (voir la précédente
itération dans le Journal de `PROGRESS.md` pour le détail du test du
Dashboard : vue d'ensemble, pipeline, interactions) ? Si le manque de
navigation était le seul obstacle, dis-moi si tout te convient pour que je
passe à S6 (attribution).

## Outillage disponible pour les prochains tests

- **Deno CLI** installé en standalone (`winget install DenoLand.Deno`,
  sans admin/Docker) — pour exécuter une Edge Function directement :
  ```
  export PATH="$PATH:/c/Users/loicr/AppData/Local/Microsoft/WinGet/Packages/DenoLand.Deno_Microsoft.Winget.Source_8wekyb3d8bbwe"
  cd supabase/functions/<nom-de-la-fonction>
  deno run --allow-net --allow-env --env-file=../../../.env.local index.ts
  ```
- **`pnpm run check-pappers -- <siren>`** pour tester rapidement le mapper Pappers sur une nouvelle entreprise.
- **`pnpm run import-pharow -- --client-id <uuid> <fichier.csv>`** pour importer un CSV Pharow (ou un CSV de test).
- **`pnpm exec supabase db push`** pour appliquer les migrations en attente sur la vraie base (toujours demander confirmation avant, cf. `CLAUDE.md`).
- **`pnpm --filter @dmh/crm dev`** (port 5173) pour le CRM interne, **`pnpm --filter @dmh/dashboard dev`** (port 5174 si le CRM tourne déjà) pour le dashboard client.
- **Comptes de test** :
  - CRM (staff) : `lrd@dmhassocies.com` (ton compte réel), lié à `staff_members` — accès à tous les clients.
  - Dashboard (client) : `client-test-claude@dmhassocies.com`, lié à `client_users` — accès au seul client de test.
- **Données de test dans Supabase** (conservées, voir `PROGRESS.md`) :
  client de test `test-claude-enrich-pappers` (avec `offer_description`
  configurée), 4 prospects couvrant plusieurs statuts, 7 interactions
  Smartlead simulées sur le prospect `1a646013-...` (statut `meeting_booked`).
