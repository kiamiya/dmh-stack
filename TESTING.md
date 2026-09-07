# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : 🔄 migration appliquée — reste le secret Vault + ta validation manuelle

**Automatisations — moteur étendu (branches Oui/Non + action "Enrichir")**,
S32-auto. Code écrit et vert (`pnpm typecheck`/`pnpm test` racine, 12
packages). Migration `supabase/migrations/030_automation_branching_and_enrichment.sql`
**appliquée en production le 2026-09-07** (confirmée par toi) — vérifiée
en lecture seule après coup : `pg_net` actif, colonne `branch` présente,
contraintes `entity_type`/`action_type` étendues, trigger
`prospects_automation` créé, secret Vault `app_service_role_key` créé
(vide). `automation_rules` était vide en production avant cette
migration : pas de règle existante à faire régresser.

Le détail complet (schéma, rétro-compatibilité, limite
synchrone/asynchrone assumée) est dans `PROGRESS.md`, section "2026-09-07
(suite) — S32-auto".

### Étape 1 — remplir le secret Vault (toi seul peux le faire)

Après la migration, exécute (SQL Editor Supabase, jamais dans un commit) :

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'app_service_role_key'),
  '<vraie clé service_role — Project Settings → API>'
);
```

Sans cette étape, l'action "Enrichir" ne fait rien (le code vérifie que le
secret n'est pas vide avant d'appeler `net.http_post`) — aucune erreur,
mais aucun effet non plus.

### Étape 2 — protocole de test manuel (dans l'ordre)

| # | Test | Pré-requis | Résultat attendu |
|---|---|---|---|
| 1 | **Simple sans branche** — créer une règle basique sur `/automations` (ex. `opportunity`/`stage_changed` → créer une tâche), sans cocher "Brancher" | Aucun | La tâche se crée normalement au changement d'étape — confirme que le trigger réécrit se comporte comme avant pour le cas `always` |
| 2 | **Branche Oui/Non** — créer une règle avec une condition simple (ex. `city est renseigné`), cocher "Brancher l'action selon les conditions", mettre une action différente en Oui et en Non | Test 1 validé | Créer un prospect avec `city` renseigné → l'action "Oui" s'exécute ; sans `city` → l'action "Non" s'exécute |
| 3 | **Enrichir** — créer une règle sur l'entité "Prospect", déclencheur "À la création", action "Enrichir" (Pappers ou Dropcontact) | Étape 1 du fichier (secret Vault rempli) | Créer un prospect réel test → vérifier dans `companies`/logs Edge Function que l'enrichissement a bien été déclenché |

Comme pour tout le reste : pas de vérification visuelle en navigateur réel
possible côté Claude — les 3 lignes ci-dessus sont à exécuter et constater
par toi.

## Outillage disponible pour ce chantier

- `pnpm --filter @dmh/crm dev` (port 5173), page `/automations`.
- `supabase db query --linked --project-ref hkonylfpcstbvxswyxyh "<SQL>"`
  pour inspecter l'état réel sans modifier quoi que ce soit.
- Logs de l'Edge Function appelée (`enrich-pappers`/`enrich-dropcontact`)
  visibles dans le dashboard Supabase, utiles pour le test 3.
