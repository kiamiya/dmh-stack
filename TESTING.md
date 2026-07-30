# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : ✅ test exécuté par mes soins — en attente de ta relecture

Test fonctionnel du dashboard client (`apps/dashboard`, S5 — 1er item),
exécuté le 2026-07-30, dans un navigateur headless (Chromium via
Playwright, même outillage jetable que pour le CRM S4 — pas ajouté au
repo, `chromium-cli` toujours pas disponible dans cet environnement).

### Pré-requis mis en place avant le test

- **Migration `007_add_client_users.sql` appliquée** sur le vrai projet
  Supabase (confirmée par toi) : table `client_users` + policy
  `client_user_access` additive sur `dmh_clients` et les 6 tables scopées
  `client_id`.
- **Nouveau compte de test créé**, volontairement séparé du compte staff
  utilisé pour le CRM : `client-test-claude@dmhassocies.com`, lié via
  `client_users` au client de test existant (`[TEST Claude] Client de
  test`). Choix délibéré de ne pas réutiliser ton compte réel cette fois :
  je voulais un compte qui ne soit **pas** dans `staff_members`, pour
  prouver que l'accès aux données passe bien par la nouvelle policy
  `client_user_access` et pas par un accès staff plus large qui aurait
  masqué le test (vérifié directement en base : ce compte n'est pas dans
  `staff_members`). Script jetable, clé `service_role`, mot de passe
  généré et non conservé dans ce document — dis-moi si tu veux que je te
  le communique ou que je le régénère.

### Ce que je n'ai pas pu tester (un seul client de test existe)

Comme pour le test du CRM S4 : un seul client existe dans la base
actuellement, donc je ne peux pas prouver littéralement qu'un client ne
voit PAS les données d'un autre client — seulement que l'accès passe par
la bonne policy (`client_user_access`) et pas par un raccourci. La preuve
stricte "deux clients, chacun voit uniquement le sien" restera à refaire
dès qu'un deuxième client réel (ou de test) existera.

### Étapes exécutées et résultat

1. **`pnpm --filter @dmh/dashboard dev`** — démarre sans erreur (port 5174,
   5173 déjà pris par le CRM).
2. **Page `/login` non authentifiée** : redirection automatique depuis `/`
   confirmée (route protégée), rendu correct.
3. **Connexion avec le compte de test client** : réussie, redirection vers `/`.
4. **Vue d'ensemble** : les statistiques affichées sont exactes par rapport
   à l'état réel de la base (vérifié indépendamment) : 4 prospects, 0 en
   séquence active, taux de réponse 100 % (1 réponse pour 1 email envoyé —
   cohérent avec les interactions créées pendant le test du webhook
   Smartlead), 1 RDV programmé, 0 deal gagné.
5. **Pipeline (Kanban)** : les 4 prospects apparaissent dans les bonnes
   colonnes ("En préparation" ×3 pour les 3 prospects encore en
   enrichissement, la colonne du statut réel du 4e), avec le branding du
   client de test visible (nom "[TEST Claude] Client de test", couleur de
   la marque appliquée sur l'onglet actif).
6. **Interactions** : les 7 lignes créées pendant le test du webhook
   Smartlead s'affichent avec les bons libellés FR et les bonnes couleurs
   (Email envoyé, Email ouvert, Lien cliqué, Email rejeté, Réponse reçue,
   Note, Désinscription).
7. **Aucune erreur console** sur l'ensemble du parcours.

**Point à valider par toi si tu veux** : le contenu de la vue d'ensemble
(les 5 métriques choisies : prospects, en séquence active, taux de
réponse, RDV programmés, gagnés) te semble-t-il pertinent pour un vrai
client, ou il en manque/il y en a trop ? Le pipeline Kanban en lecture
seule (déjà confirmé avec toi) et le regroupement des statuts en 9
colonnes (3 fusionnées en "En préparation", 2 fusionnées en "Perdu")
te conviennent-ils ?

### Ce qui reste hors périmètre de cette itération (à documenter, pas à faire)

- **Déployer sur Vercel avec un domaine personnalisé** (2e item de S5) :
  dépend d'un vrai client pilote (compte + sous-domaine), reporté à une
  itération séparée — même logique que pour la configuration réelle du
  webhook Smartlead.
- Branding avant connexion (logo/couleur visibles dès la page de login,
  par sous-domaine) : nécessiterait d'exposer publiquement une partie des
  données `dmh_clients` (policy RLS anonyme ou vue dédiée), pas fait pour
  ce MVP — le branding s'applique seulement après connexion.
- Vue Deals : explicitement une tâche S6 séparée dans `PROGRESS.md`
  (dépend de S5), pas dans le périmètre de cette itération.

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
