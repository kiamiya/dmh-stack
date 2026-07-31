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

Test fonctionnel du dernier item de S7 (synchro Lemlist → Supabase),
exécuté le 2026-07-31. **S7 est maintenant intégralement terminé.**

### Découverte avant de coder : ce n'est pas un webhook

Le brief §1.2.4 décrit explicitement une synchro **manuelle** pour
Waalaxy/Lemlist ("le SDR ou Loïc exporte les prospects... et les importe
dans Supabase"), contrairement à Smartlead (webhook temps réel, S4).
Implémenté comme un script (`scripts/sync-lemlist.ts`), déclenché à la
main — pas une Edge Function. Plutôt que de deviner un format d'export
CSV, utilisé la vraie clé `LEMLIST_API_KEY` (déjà dans `.env.local`) pour
appeler la vraie API Lemlist (`GET /activities`, vérifiée par recherche
avant d'écrire le code).

### Bug réel trouvé et corrigé pendant le test

`linkedinInterested`/`linkedinNotInterested` (les seuls types d'activité
porteurs d'un changement de statut candidat) ne produisaient initialement
**aucune interaction mappée** — le code les ignorait avant même de
vérifier le changement de statut, rendant cette logique inatteignable en
pratique. Corrigé en les mappant vers une interaction de type `note`
(même principe que `LEAD_CATEGORY_UPDATED` côté Smartlead). Détecté
uniquement grâce à un scénario de test réaliste bout en bout — les tests
unitaires sur le mapper seul ne l'auraient pas révélé.

### Test 1 — Connexion réelle à l'API Lemlist

```
GET https://api.lemlist.com/api/campaigns          -> []
GET https://api.lemlist.com/api/activities?version=v2&limit=5  -> []
```
Auth réussie avec la vraie clé, listes vides cohérentes (aucune campagne
réelle, pas de client pilote actif pour l'instant).

### Test 2 — Scénarios simulés (contre le vrai Supabase)

7 activités simulées (payloads conformes au format réel de l'API) sur le
prospect de test (contact `webhook-test-claude@example.com`, prospect
`1a646013-...`, statut de départ `meeting_booked`) :

| Scénario | Résultat |
|---|---|
| `linkedinInviteDone` → interaction `linkedin_request_sent` | ✅ |
| `linkedinInviteAccepted` → `linkedin_connected` | ✅ |
| `linkedinSent` → `linkedin_message_sent` | ✅ |
| `linkedinReplied` → `linkedin_replied` | ✅ |
| `linkedinInterested` → interaction `note` + statut avancé | ✅ `meeting_booked` → `qualified` |
| Rejeu du même `_id` (`linkedinInviteDone`) | ✅ dédupliqué, pas de doublon |
| `emailsSent` (non-LinkedIn, couvert par Smartlead) | ✅ ignoré proprement |

Résultat final : 5 interactions synchronisées, 1 dédupliquée, 1 ignorée,
`prospects.lemlist_contact_id` renseigné (`lea_test_1`), aucune erreur.

**Point à valider par toi** : le comportement te semble-t-il cohérent
(notamment `linkedinInterested`/`linkedinNotInterested` qui avancent
automatiquement le statut, comme pour Smartlead) ? Rien d'autre à
vérifier visuellement ici (pas d'interface — c'est un script backend),
mais dis-moi si tu veux revoir la sortie console d'un run réel.

### Hors périmètre de cette itération

- Synchro réelle avec un vrai compte Lemlist actif (campagnes/prospects
  réels) — dépend d'un client pilote, pas encore disponible.

## Outillage disponible pour les prochains tests

- **Deno CLI** installé en standalone (`winget install DenoLand.Deno`, sans admin/Docker) — pour exécuter une Edge Function directement.
- **`pnpm run check-pappers -- <siren>`** pour tester rapidement le mapper Pappers sur une nouvelle entreprise.
- **`pnpm run import-pharow -- --client-id <uuid> <fichier.csv>`** pour importer un CSV Pharow (ou un CSV de test).
- **`pnpm run test-attribution`** pour rejouer les 8 scénarios du trigger d'attribution contre le vrai Supabase.
- **`pnpm run sync-lemlist -- [--campaign-id <id>] [--since <date-ISO>]`** pour synchroniser les activités LinkedIn Lemlist (vide tant qu'aucune vraie campagne n'existe).
- **`pnpm exec supabase db push`** pour appliquer les migrations en attente sur la vraie base (toujours demander confirmation avant, cf. `CLAUDE.md`).
- **`pnpm --filter @dmh/crm dev`** / **`pnpm --filter @dmh/dashboard dev`** (ports 5173/5174 selon dispo) pour les deux apps.
- **Comptes de test** :
  - CRM (staff) : `lrd@dmhassocies.com` (ton compte réel), lié à `staff_members` — accès à tous les clients.
  - Dashboard (client) : `client-test-claude@dmhassocies.com`, lié à `client_users` — accès au seul client de test.
- **Données de test dans Supabase** (conservées, voir `PROGRESS.md`) :
  client de test `test-claude-enrich-pappers`, prospect `1a646013-...`
  désormais au statut `qualified` (avancé pendant ce test via
  `linkedinInterested`), avec un `lemlist_contact_id` de test renseigné,
  en plus des interactions Smartlead précédentes.
