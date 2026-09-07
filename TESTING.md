# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : ⛔ bloqué — confirmation requise avant application de la migration

**Automatisations — moteur étendu (branches Oui/Non + action "Enrichir")**,
S32-auto, code écrit et vert (`pnpm typecheck`/`pnpm test` racine, 12
packages). La migration `supabase/migrations/030_automation_branching_and_enrichment.sql`
modifie le moteur d'exécution en production (trigger PL/pgSQL utilisé par
TOUTES les automatisations existantes) — par la règle CLAUDE.md §5, je
n'applique **pas** `supabase db push` sans ta confirmation explicite,
même si le reste (git commit/push du code) est déjà fait automatiquement.

### Avant de valider : ce que fait la migration

1. Ajoute `automation_actions.branch` (`always`/`if_true`/`if_false`) et
   réécrit `run_automation_rules()` pour exécuter les actions par branche
   au lieu de sauter toute la règle quand une condition échoue.
2. Active `pg_net`, ajoute `entity_type = 'prospect'` (+ trigger sur
   `prospects`), ajoute `action_type = 'trigger_enrichment'`.
3. Crée un emplacement de secret Vault **vide** (`app_service_role_key`) —
   aucune vraie clé n'est dans la migration.

Le détail complet (schéma, rétro-compatibilité, limite
synchrone/asynchrone assumée) est dans `PROGRESS.md`, section "2026-09-07
(suite) — S32-auto".

### Étape 1 — confirmer l'application de la migration

Dis-moi si je peux lancer `supabase db push` (ou fais-le toi-même si tu
préfères garder la main sur les migrations en production). Rien
ci-dessous n'est testable avant cette étape.

### Étape 2 — remplir le secret Vault (toi seul peux le faire)

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

### Étape 3 — protocole de test manuel (dans l'ordre)

| # | Test | Pré-requis | Résultat attendu |
|---|---|---|---|
| 1 | **Non-régression** — une règle existante simple (`create_task`, sans branche) se déclenche encore normalement après la migration | Une règle déjà en place (ex. sur `opportunity`/`stage_changed`) | Comportement strictement identique à avant : la tâche se crée toujours, rien ne change dans son fonctionnement |
| 2 | **Branche Oui/Non** — créer une règle sur `/automations` avec une condition simple (ex. `city est renseigné`), cocher "Brancher l'action selon les conditions", mettre une action différente en Oui et en Non | Étape 1 validée | Créer un prospect avec `city` renseigné → l'action "Oui" s'exécute ; sans `city` → l'action "Non" s'exécute |
| 3 | **Enrichir** — créer une règle sur l'entité "Prospect", déclencheur "À la création", action "Enrichir" (Pappers ou Dropcontact) | Étape 2 du fichier (secret Vault rempli) | Créer un prospect réel test → vérifier dans `companies`/logs Edge Function que l'enrichissement a bien été déclenché |

Comme pour tout le reste : pas de vérification visuelle en navigateur réel
possible côté Claude — les 3 lignes ci-dessus sont à exécuter et constater
par toi.

## Outillage disponible pour ce chantier

- `pnpm --filter @dmh/crm dev` (port 5173), page `/automations`.
- `supabase db query --linked --project-ref hkonylfpcstbvxswyxyh "<SQL>"`
  pour inspecter l'état réel sans modifier quoi que ce soit.
- Logs de l'Edge Function appelée (`enrich-pappers`/`enrich-dropcontact`)
  visibles dans le dashboard Supabase, utiles pour l'étape 3.
