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

Test fonctionnel de l'interface CRM (`apps/crm`, S4 — premier item) exécuté
le 2026-07-30, dans un navigateur headless (Chromium via Playwright, piloté
par un script jetable — aucun outil de ce type n'existait dans le repo,
rien n'a été ajouté au projet).

### Pré-requis mis en place avant le test

- **Migration `005_add_staff_members.sql` appliquée** sur le vrai projet
  Supabase (confirmation donnée explicitement par toi) : table
  `staff_members` + policy `staff_full_access` additive sur les 7 tables
  scopées `client_id`.
- **Compte de test** : ton compte réel `lrd@dmhassocies.com` (mot de passe
  que tu as fourni) créé dans `auth.users` (n'existait pas encore) et lié
  à `staff_members`. Script jetable, clé `service_role`, supprimé après
  usage — pas conservé dans le repo.

### Étapes exécutées et résultat

1. **`pnpm --filter @dmh/crm dev`** — démarre sans erreur (Vite, port 5173).
2. **Page `/login` non authentifiée** : rendu correct (carte "DMH CRM",
   champs Email/Mot de passe, bouton "Se connecter"), aucune erreur
   console. La route protégée `/` redirige bien vers `/login` quand il n'y
   a pas de session.
3. **Connexion avec `lrd@dmhassocies.com`** : réussie, redirection vers `/`.
4. **Liste des prospects** : les 4 prospects de test s'affichent (PM
   MECANIQUE INDUSTRIE, ACME Fictive SAS ×2, Autre Entreprise Test), avec
   entreprise/contact/client DMH/statut (badge coloré). **Point important** :
   je n'ai qu'un seul client de test dans la base actuellement (`[TEST
   Claude] Client de test`) — je ne peux donc pas prouver littéralement un
   accès *inter-clients*. Ce que j'ai vérifié à la place : ton compte
   (`lrd@...`) est un utilisateur `auth` générique, sans lien direct avec
   ce `client_id` — s'il voyait 0 ligne, ce serait la preuve que seule la
   policy `client_isolation` s'applique ; comme il voit les 4 lignes, ça
   démontre que `staff_full_access` fonctionne bien (accès accordé via
   `staff_members`, indépendamment de tout `client_id`). La preuve
   "plusieurs clients différents visibles" restera à refaire dès qu'un
   deuxième vrai client existera.
5. **Détail du prospect `1a646013-c0a2-48e9-b402-45332023f873`** (PM
   MECANIQUE INDUSTRIE) : entreprise/contact enrichis affichés
   correctement (forme juridique, secteur, effectif, ville, CA ; nom du
   contact, email "— (not_found)" cohérent avec le résultat Dropcontact du
   test S3), et le **vrai message généré par Claude** (email, LinkedIn,
   relance J+7) s'affiche intégralement.
6. **Changement de statut** : dropdown testé (`ready` → `qualified` →
   retour à `ready`), mise à jour immédiate en base et à l'écran, aucune
   erreur.
7. **"Marquer prêt pour Smartlead"** : cliqué sur ce prospect (son message
   n'était pas encore marqué `approved`) — le bouton disparaît, remplacé
   par un badge vert "Prêt pour Smartlead — 30/07/2026", `approved=true` et
   `injected_at` bien persistés en base.

Aucune erreur console (`pageerror`/`console.error`) sur l'ensemble du
parcours. Captures d'écran disponibles si tu veux les voir (pas commitées
dans le repo, générées dans un dossier temporaire).

### Ce que ce test ne couvre pas (hors périmètre assumé de cette itération)

- Accès **réellement** inter-clients (un seul client de test existe).
- L'Edge Function `webhook-smartlead` (explicitement reportée à une
  itération séparée, cf. plan validé).
- Tests avec un deuxième compte staff (William, le SDR) — seul ton compte
  a été mis en place ; pour les autres, même procédure (créer l'utilisateur
  `auth`, ajouter une ligne `staff_members`) le moment venu.

**Point à valider par toi** : peux-tu te connecter toi-même à
`http://localhost:5173` (ou en déployant plus tard) avec ton compte pour
juger du rendu et de l'ergonomie ? Je considère la brique technique S4
"CRM basique" fonctionnelle sur la base du test ci-dessus, mais le jugement
sur l'UX/le contenu reste le tien.

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
- **`pnpm --filter @dmh/crm dev`** pour lancer le CRM en local (port 5173).
- **Compte de test CRM** : `lrd@dmhassocies.com` (ton compte réel), lié à `staff_members` — accès à tous les clients depuis le CRM.
- **Données de test dans Supabase** (conservées, voir `PROGRESS.md`) :
  client de test `test-claude-enrich-pappers` (avec `offer_description`
  configurée), 4 prospects couvrant tous les statuts intermédiaires, dont
  `1a646013-...` désormais `ready` **et** `approved=true` (marqué prêt pour
  Smartlead pendant ce test).
