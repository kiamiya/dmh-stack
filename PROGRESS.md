# Suivi de projet — DMH Stack (Phase 1)

> Ce fichier est la source de vérité sur l'avancement technique du projet.
> Il est mis à jour à la fin de chaque itération de travail, pas seulement en fin de session,
> pour que le travail reste traçable même si la fenêtre de commande se ferme.
> Voir aussi `TESTING.md` pour la démarche de test fonctionnel en cours.

Dernière mise à jour : 2026-07-30

## Fondations transverses (process, pas liées à une semaine précise)

| Élément | Statut |
|---|---|
| Infra de tests unitaires (vitest, wiring turbo `test`) | ✅ fait |
| `packages/config` — validation typée des variables d'environnement | ✅ fait (tests unitaires verts) |
| `packages/pappers` — client + mapper Pappers (logique pure, testée) | ✅ fait (15 tests unitaires verts) — mapping validé contre l'API réelle |
| `packages/pharow` — parsing CSV + mapping + orchestration import (logique pure, testée) | ✅ fait (13 tests unitaires verts) — validé end-to-end contre le vrai Supabase |
| `packages/dropcontact` — client (async) + mapping de confiance email (logique pure, testée) | ✅ fait (14 tests unitaires verts) — flux asynchrone complet validé contre l'API réelle |
| `packages/claude-messages` — prompt + client Claude (sorties structurées, logique pure, testée) | ✅ fait (9 tests unitaires verts) — message réel généré, conforme aux contraintes du brief |
| Typecheck de `scripts/` (jusque-là hors pipeline) | ✅ fait — `scripts/tsconfig.json` + `pnpm typecheck` racine le couvre désormais |
| `PROGRESS.md` (ce fichier) | ✅ fait |
| `TESTING.md` (process de test fonctionnel) | ✅ format validé à l'usage (3 itérations) |

## Planning détaillé Phase 1 (8 semaines) — Tâches Loïc

| Sem. | Priorité | Tâche | Statut |
|---|---|---|---|
| S1 | Infrastructure | Créer le projet Supabase (DB, auth, RLS) | ✅ fait — réactivé le 2026-07-30 après une mise en pause pour inactivité |
| S1 | Infrastructure | Définir et implémenter le schéma complet des tables | ✅ fait (`supabase/migrations/001_initial_schema.sql`) |
| S1 | Infrastructure | Souscrire aux outils (Smartlead, Pharow, Dropcontact, Lemlist) | ⬜ à faire — voir checklist ci-dessous |
| S1 | Infrastructure | Configurer les variables d'environnement | ✅ toutes les clés bloquantes réunies (Anthropic, Pappers, Dropcontact, Smartlead, Lemlist) ; il ne manque que `SMARTLEAD_WEBHOOK_SECRET` (non bloquant, généré à la config du webhook S4) |
| S2 | Pipeline Pappers | Intégrer l'API Pappers (Edge Function Supabase) | ✅ fait — validée end-to-end le 2026-07-30 contre le vrai Supabase + la vraie API Pappers (voir Journal) |
| S2 | Pipeline Pappers | Tester l'enrichissement sur 50 entreprises tests | ⬜ à faire — 1 entreprise réelle validée (PM MECANIQUE INDUSTRIE, SIREN 481838852) ; passage à l'échelle (50) reste à faire, dépend d'un vrai export Pharow avec un vrai client |
| S2 | Pipeline Pappers | Développer le script d'import CSV Pharow → Supabase | ✅ fait — validé end-to-end le 2026-07-30 (voir Journal), y compris la déduplication d'entreprise |
| S3 | Email + Claude | Intégrer l'API Dropcontact | ✅ fait — validée end-to-end le 2026-07-30 (API asynchrone, voir Journal) |
| S3 | Email + Claude | Développer le pipeline complet Pappers → Dropcontact → Claude API | ✅ fait — **pipeline complet validé end-to-end le 2026-07-30** (to_enrich → enriched_pappers → enriched_contact → ready), voir Journal |
| S3 | Email + Claude | Tester la génération de messages sur 100 prospects réels | ⬜ à faire — 1 message réel généré et conforme aux contraintes du brief ; passage à l'échelle dépend d'un vrai export Pharow avec un vrai client |
| S4 | CRM v1 | Interface CRM basique (liste prospects, statut, messages, export Smartlead) | ⬜ à faire |
| S4 | CRM v1 | Configurer les webhooks Smartlead → Supabase | ⬜ à faire |
| S5 | Dashboard v1 | Dashboard client React (vue d'ensemble, pipeline Kanban, interactions) | ⬜ à faire |
| S5 | Dashboard v1 | Déployer sur Vercel avec custom domain (premier client) | ⬜ à faire |
| S6 | Attribution | Implémenter le module d'attribution (trigger PostgreSQL) | ✅ fait en avance — trigger `calculate_attribution` déjà livré avec le schéma initial (S1) |
| S6 | Attribution | Tester le trigger sur des scénarios simulés | ⬜ à faire |
| S6 | Attribution | Développer la vue Deals dans le dashboard | ⬜ à faire (dépend de S5) |
| S7 | Scoring IA | Intégrer le scoring Claude API | ⬜ à faire |
| S7 | Scoring IA | Afficher le score dans le CRM et le dashboard | ⬜ à faire |
| S7 | Scoring IA | Configurer les webhooks Lemlist → Supabase (synchro manuelle) | ⬜ à faire |
| S8 | Tests & pilote | Tests complets de la stack end-to-end | ⬜ à faire |
| S8 | Tests & pilote | Corriger les bugs, optimiser les performances | ⬜ à faire |
| S8 | Tests & pilote | V1 de la documentation technique interne | ⬜ à faire |

## Critères de succès Phase 1 (section 1.5 du brief)

- [ ] Le pipeline d'enrichissement tourne sans intervention manuelle : CSV Pharow → prospects enrichis + messages générés en moins de 24h.
- [ ] Séquences Smartlead actives sur au moins 2 clients pilotes, taux d'ouverture > 40 %.
- [ ] Dashboard client déployé en marque blanche pour les 2 clients pilotes, données temps réel.
- [ ] Module d'attribution fonctionnel : un deal test génère automatiquement le calcul de commission + email de notification à William.
- [ ] Scoring IA actif et pertinent (validé par William sur un échantillon de 50 prospects).
- [ ] Coût mensuel total de la stack < 700 €.

## Checklist "comptes à créer" (action Loïc, pas Claude Code)

> **Règle de blocage** : aucune tâche de développement suivante (S2+) ne démarre tant que toutes les clés API bloquantes ne sont pas dans `.env.local`. C'est désormais le cas — voir ci-dessous.

Comptes créés et clés déjà dans `.env.local` (jamais commité) : Anthropic, Pappers, Dropcontact, Smartlead (clé API), Lemlist. Reste à faire :

- [x] **Anthropic** (Claude API) → `ANTHROPIC_API_KEY`
- [x] **Pappers** → `PAPPERS_API_KEY`
- [x] **Dropcontact** → `DROPCONTACT_API_KEY`
- [x] **Smartlead** → `SMARTLEAD_API_KEY`
- [x] **Lemlist** → `LEMLIST_API_KEY`
- [ ] **Smartlead** → `SMARTLEAD_WEBHOOK_SECRET` (généré à la configuration du webhook, tâche S4 — pas bloquant pour l'instant)
- [ ] **Pharow** — pas de clé API en Phase 1 (export CSV manuel, cf. brief §1.2.1), rien à configurer ici.

Rappel action William (brief S1, hors périmètre dev) : dès que le compte Smartlead existe, créer les domaines email dédiés par client pilote et les connecter pour démarrer le warm-up (3-4 semaines) le plus tôt possible.

## Données de test dans Supabase (conservées, à ne pas confondre avec de vrais clients)

Créées le 2026-07-30 pour valider `enrich-pappers` end-to-end, gardées sur demande de Loïc pour retester rapidement plus tard (S6 attribution, S7 scoring...) :
- `dmh_clients` : `subdomain = "test-claude-enrich-pappers"`, nom `"[TEST Claude] Client de test"`.
- `companies` : `"PM MECANIQUE INDUSTRIE (test)"`, SIREN `481838852` (entreprise réelle, petite PME industrielle — bon exemple représentatif de l'ICP DMH).
- `contacts` : `"Test Claude"`.
- `prospects` : id `1a646013-c0a2-48e9-b402-45332023f873`, statut `enriched_pappers` après le test.

Ajoutées le 2026-07-30 pour valider le script d'import CSV Pharow (même client de test) :
- `companies` : `"ACME Fictive SAS"` (Lyon) et `"Autre Entreprise Test"` (Paris) — noms fictifs, à ne pas confondre avec de vraies entreprises.
- `contacts` : Alice Fictive et Bob Exemple (tous deux rattachés à "ACME Fictive SAS", pour valider la déduplication), Claire Demo (rattachée à l'autre entreprise).
- `prospects` : 3 nouveaux, tous en statut `to_enrich`.

Toutes préfixées/nommées explicitement "test"/"fictive"/"exemple"/"demo" pour rester identifiables dans le dashboard/CRM une fois construits.

Le client de test a désormais un `offer_description` renseigné (transformation digitale PME industrielles), et le prospect `1a646013-...` a un message généré réel dans `messages_generated`, statut final `ready`.

## Écarts assumés par rapport au brief original

> Le brief (`DMH Plan Execution Strategique Juillet Decembre 2026.docx`) reste la référence historique et **n'est jamais modifié** — les décisions qui s'en écartent sont tracées ici, pas rétro-appliquées au document.

- **2026-07-30 — Lemlist remplace Waalaxy** pour l'automatisation LinkedIn/cold outreach (le brief §1.2.4 documente Waalaxy en détail, ce n'est plus l'outil retenu). Impact code : variable d'environnement `LEMLIST_API_KEY` (ex-`WAALAXY_API_KEY`), colonne `prospects.lemlist_contact_id` (migration `002_rename_waalaxy_to_lemlist.sql`, appliquée sur Supabase le 2026-07-30).
- **2026-07-30 — Modèle Claude `claude-sonnet-5` au lieu de `claude-sonnet-4-6`** cité dans le brief (§1.3.1 étape 4) : cet identifiant précis n'existe plus dans l'API Claude actuelle. Le tiers Sonnet reste le bon choix (le brief le justifie par le coût à ce volume, ~0,003-0,005 €/message), seul l'identifiant exact change — même logique que Lemlist/Waalaxy. Colonne `messages_generated.model_used` mise à jour avec la vraie valeur à chaque insertion (pas de migration nécessaire, le défaut de colonne n'est qu'indicatif).

## Incertitudes techniques à lever

- ~~Champs de réponse de l'API Pappers non vérifiés~~ **Validé le 2026-07-30** contre deux vrais appels (La Poste puis PM MECANIQUE INDUSTRIE). Deux bugs de mapping trouvés et corrigés : `employeeRange` utilisait `tranche_effectif` (un code interne) au lieu de `siege.effectif` (le libellé humain) ; `revenue`/`revenueYear` cherchaient un champ racine `chiffre_affaires` inexistant — le CA vit dans un tableau `finances[]`, on prend l'exercice le plus récent. `website` utilisait `site_web`, corrigé en `website`. Détail dans `packages/pappers/src/mapper.ts`.
- ~~Edge Function `index.ts` jamais exécutée réellement~~ **Exécutée et validée end-to-end le 2026-07-30** (Deno CLI en local, contre le vrai Pappers + le vrai Supabase). A révélé et corrigé un bug de couplage (`loadServerEnv` → `loadPappersFunctionEnv` scopé).
- ~~`SUPABASE_URL` injoignable~~ **Résolu le 2026-07-30** — le projet Supabase était en pause pour inactivité, Loïc l'a réactivé.
- **Déclenchement automatique des Edge Functions** : le brief prévoit un déclenchement automatique sur changement de statut (webhook DB Supabase). Ce n'est pas encore câblé — `enrich-pappers` et `enrich-dropcontact` s'invoquent pour l'instant manuellement via HTTP POST `{ prospect_id }`. Câblage des triggers DB → webhook à faire dans une itération suivante (probablement en même temps pour les deux, plus `generate-messages` une fois écrite).
- ~~API Dropcontact non vérifiée~~ **Validée le 2026-07-30** contre l'API réelle : le flux asynchrone (soumission -> `request_id` -> consultation) fonctionne exactement comme documenté, y compris le message `"Request not ready yet, try again in 30 seconds"` retourné tel quel pendant le traitement. Testé avec un contact fictif (résultat `not_found`, attendu) et avec le vrai dirigeant de PM MECANIQUE INDUSTRIE (Frederic Vaysse Labonde) — également `not_found`, probablement car cette PME n'a pas de site web renseigné (Dropcontact devine moins bien sans domaine). Le mapping `qualification -> email_confidence` ("nominative@pro" -> valid, etc.) est une interprétation raisonnable du vocabulaire Dropcontact, pas explicitée dans le brief — testée unitairement sur tous les cas mais pas observée en conditions réelles faute d'avoir trouvé un email réel pendant les tests. À surveiller sur les premiers vrais prospects clients.
- **Nouvelle colonne `contacts.dropcontact_request_id`** (migration `003_add_dropcontact_request_id.sql`, appliquée le 2026-07-30) : nécessaire car l'API Dropcontact est asynchrone, contrairement à Pappers — pas anticipé dans le schéma initial du brief.
- **Payload Pappers potentiellement volumineux pour de très grandes entreprises** : un test avec La Poste (entité centenaire) a produit un JSON de 16 Mo et fait timeout la requête d'update PostgreSQL — pas un bug de notre code, juste une entreprise extrême et non représentative. Les PME industrielles ciblées par DMH (20-200 salariés, cf. brief) ont des payloads bien plus petits (~25-50 Ko sur le test réel PM MECANIQUE INDUSTRIE). À garder en tête si jamais un client DMH a un très gros groupe dans son ICP : prévoir une limite de taille ou un timeout de requête plus long pour ce cas rare.
- **Noms de colonnes du CSV Pharow non vérifiés contre un vrai export** : aucun compte Pharow n'existe encore, donc `packages/pharow/src/csv.ts` devine les en-têtes probables (prénom/nom/entreprise/etc., plusieurs alias par champ, tolérant à la casse/aux accents) plutôt que de les avoir validés comme pour Pappers. Le test du 2026-07-30 utilisait un CSV fictif écrit à la main avec les en-têtes supposées — donc il valide la logique d'import (parsing, dédup, écriture DB), pas la compatibilité avec un vrai fichier Pharow. **À revalider dès qu'un compte Pharow existe et qu'un vrai export est disponible.**
- **`contacts.appointment_date`/`months_in_role` jamais renseignés par le pipeline actuel** : le prompt Claude sait exploiter "en poste depuis X mois" (signal important brief §1.3.5 pour le scoring aussi), mais rien ne remplit encore ce champ — Pappers renvoie bien les dirigeants (`representants`, avec `date_prise_de_poste`) mais faire correspondre un dirigeant Pappers au contact exact du prospect est une logique métier ambiguë, volontairement pas implémentée (voir décision de scope lors de S2). Pour l'instant ce champ reste toujours `null` en pratique. À trancher avant S7 (scoring).
- **Nouvelle colonne `dmh_clients.offer_description`** (migration `004_add_dmh_clients_offer_description.sql`, appliquée le 2026-07-30) : nécessaire pour personnaliser le prompt Claude (description de l'offre du client DMH), absente du schéma initial du brief.

## Journal des sessions

### 2026-07-29
- Reprise après une session précédente arrêtée à "configuration des clés API".
- État vérifié : schéma DB + `@dmh/types` en place, projet Supabase réel connecté, 5 clés tierces encore vides (aucun compte créé côté Anthropic/Pappers/Dropcontact/Smartlead/Waalaxy).
- Mis en place l'infra de tests unitaires (vitest) au niveau du monorepo.
- Créé `packages/config` (`@dmh/config`) : validation typée des variables d'environnement (`loadServerEnv`/`loadPublicEnv`, zod, erreurs agrégées, séparation stricte secrets/public). 7 tests unitaires verts, typecheck OK.
- Créé `PROGRESS.md` et `TESTING.md` (ce fichier + le suivant).
- **Point de reprise** : la prochaine tâche technique (S2) est l'intégration de l'API Pappers via une Edge Function Supabase — bloquée tant que le compte Pappers n'existe pas et que la clé n'est pas dans `.env.local`. En attendant, possibilité d'avancer sur le script d'import CSV Pharow → Supabase (ne nécessite aucune clé API tierce).

### 2026-07-30
- Loïc a fourni les clés réelles Anthropic, Pappers, Dropcontact et Smartlead (API). Ajoutées dans `.env.local` (non commité).
- Vérifié avec `pnpm run check-env` : ne manquent plus que `SMARTLEAD_WEBHOOK_SECRET` (pas bloquant, généré plus tard à la config du webhook S4) et `WAALAXY_API_KEY` (compte pas encore créé).
- Loïc a précisé une règle de blocage plus stricte : ne démarrer aucune tâche suivante tant que toutes les clés API ne sont pas réunies, pas seulement celle du composant visé. Ajoutée dans `CLAUDE.md`.
- Décision : remplacement de Waalaxy par Lemlist dans toute la stack (voir section "Écarts assumés par rapport au brief" ci-dessus). Loïc a fourni la clé Lemlist. Renommage effectué dans `@dmh/config`, `@dmh/types`, `.env.example`/`.env.local`, nouvelle migration `002_rename_waalaxy_to_lemlist.sql` (pas encore appliquée sur Supabase).
- Clarification importante : le document brief source (`.docx`) ne doit **jamais** être modifié, même quand une décision s'en écarte — uniquement le code et la documentation du repo.
- **Point de reprise** : toutes les clés API bloquantes sont réunies → l'Edge Function `enrich-pappers` (S2) peut démarrer à la prochaine itération.
- Créé `packages/pappers` (`@dmh/pappers`) : client Pappers (siren + recherche par nom) et mapper vers les champs `companies`, tous deux purs et testés (13 tests unitaires verts, typecheck OK). Documentation officielle Pappers inaccessible (403) au moment de coder — mapping basé sur des sources tierces, à valider contre un vrai appel (voir "Incertitudes techniques" ci-dessus et `TESTING.md`).
- Écrit `supabase/functions/enrich-pappers/index.ts` (Deno) : lit `prospect_id`, appelle Pappers, met à jour `companies` + fait passer `prospects.status` à `enriched_pappers`. Glue non testée unitairement (runtime Deno hors du pipeline vitest/tsc du monorepo), pas encore exécutée localement (ni Docker ni Deno CLI disponibles dans cet environnement) — **à valider fonctionnellement avant de considérer S2 terminé**.
- **Point de reprise** : prochaine étape = exécuter le test fonctionnel décrit dans `TESTING.md` (appel réel à Pappers + vérification du mapping), puis câbler le déclenchement automatique (webhook DB sur statut `to_enrich`) et le script d'import CSV Pharow.
- **Test fonctionnel exécuté** : ajouté `scripts/check-pappers.ts` (+ `pnpm run check-pappers -- <siren>`) et testé contre un vrai SIREN (356000000, La Poste). Deux bugs de mapping trouvés et corrigés (`employeeRange`, `revenue`/`revenueYear`) — détail dans "Incertitudes techniques" ci-dessus. 15 tests unitaires verts après correction, mapping revérifié contre le même appel réel.
- **Point de reprise** : le client + mapper Pappers sont validés. Reste : exécuter réellement `index.ts` (Docker/Deno indisponibles ici), câbler le déclenchement automatique par webhook DB, et démarrer le script d'import CSV Pharow.
- Loïc a demandé d'installer Docker et l'outillage nécessaire pour tester. Docker Desktop nécessite WSL2 (non installé, demande des droits admin + un redémarrage, indisponibles dans cet environnement) — installé **Deno CLI en standalone** à la place (`winget install DenoLand.Deno`, sans élévation), suffisant pour exécuter directement l'Edge Function sans la stack Docker complète puisqu'on teste contre le vrai projet Supabase (pas un environnement local émulé).
- `deno check index.ts` passe (le code Deno est valide, imports relatifs vers `@dmh/config`/`@dmh/pappers` et `deno.json` corrects). Exécution réelle (`deno run --allow-net --allow-env --env-file=.env.local`) a trouvé un vrai bug : la fonction utilisait `loadServerEnv`, bloquée par l'absence de `SMARTLEAD_WEBHOOK_SECRET` alors que ça n'a aucun rapport avec Pappers. Corrigé avec `loadPappersFunctionEnv` (scopé à Supabase + Pappers), testé (10 tests verts dans `@dmh/config`).
- Après ce correctif, nouveau blocage trouvé : `SUPABASE_URL` (`hkonylfpcstbvxswyxyh.supabase.co`) ne résout plus du tout en DNS (`NXDOMAIN`, confirmé via `nslookup`, cohérent avec `supabase/.temp/project-ref` donc pas une faute de frappe). Projet probablement en pause ou supprimé côté Supabase.
- **Point de reprise — bloqué sur une action Loïc** : vérifier l'état du projet Supabase sur le dashboard (probablement mis en pause pour inactivité) et le réactiver, ou recréer le projet et mettre à jour les 3 clés Supabase dans `.env.local` si supprimé. Sans ça, impossible de tester quoi que ce soit contre la vraie base — ni Pappers, ni rien d'autre.
- **Loïc a réactivé le projet Supabase.** `SUPABASE_URL` résout de nouveau (`nslookup` confirmé). Edge Function relancée : le test "prospect introuvable" (`00000000-...`) renvoie maintenant une vraie erreur PostgREST (`Cannot coerce the result to a single JSON object`), plus une erreur réseau — connexion et auth service role confirmées OK.
- Pour tester le chemin complet, Loïc a demandé d'insérer des données de test réelles dans Supabase (voir section dédiée ci-dessus). Premier essai avec La Poste (SIREN 356000000, la même entreprise utilisée pour valider le mapper) : **timeout** — son historique Pappers pèse 16 Mo de JSON, trop pour une seule requête d'update. Pas un bug : juste un mauvais choix de test (entité centenaire, pas représentative). Reprise avec **PM MECANIQUE INDUSTRIE** (SIREN 481838852, vraie PME de mécanique industrielle au Creusot, ~980 K€ de CA — un exemple représentatif de l'ICP DMH) : payload ~25 Ko, **succès complet**.
- **S2 validé end-to-end** : `POST /enrich-pappers { prospect_id }` → `200 { ok: true }`, `prospects.status` passé à `enriched_pappers`, `companies` entièrement peuplée avec les vraies données Pappers (nom, NAF, forme juridique, effectif, CA, ville, adresse, JSON brut). Vérifié directement en base après coup.
- Données de test conservées dans Supabase (sur décision de Loïc) pour retester plus tard sans tout recréer — détail dans la section dédiée ci-dessus.
- **Point de reprise** : S2 (Pappers) est terminé et validé. Prochaines pistes : câbler le déclenchement automatique par webhook DB (statut `to_enrich`), démarrer le script d'import CSV Pharow → Supabase (S2), ou enchaîner sur S3 (Dropcontact + Claude).
- Loïc a corrigé mon approche : suivre l'ordre strict des tâches du brief plutôt que proposer de choisir. L'item S2 restant ("script d'import CSV Pharow") passe donc avant S3. Règle ajoutée dans `CLAUDE.md` et en mémoire.
- Créé `packages/pharow` (`@dmh/pharow`) : parsing CSV (`csv-parse`, en-têtes tolérants avec alias — noms réels non vérifiés, voir "Incertitudes techniques"), mapping vers `companies`/`contacts`, et une orchestration d'import (`runImport`) avec dépendances DB injectées pour rester testable sans vraie base (dédup entreprise, comptage, gestion d'erreur ligne par ligne). 13 tests unitaires verts.
- Ajouté `loadPharowImportEnv` dans `@dmh/config` (Supabase uniquement, Pharow n'a pas de clé API en Phase 1) — même principe que `loadPappersFunctionEnv`.
- Écrit `scripts/import-pharow.ts` (Node, branché sur le vrai `@supabase/supabase-js`) + mis à jour le script racine `import-pharow` avec `--env-file=.env.local`.
- En marge : ajouté un vrai typecheck pour `scripts/` (`scripts/tsconfig.json`, chaîné dans `pnpm typecheck`), qui n'était jusque-là jamais vérifié — a immédiatement trouvé et corrigé un vrai problème de typage dans `scripts/check-pappers.ts` (narrowing perdu à travers une closure).
- **Test fonctionnel exécuté** (après ton accord) : CSV fictif de 3 lignes (2 partageant la même entreprise) importé pour de vrai contre Supabase. Résultat conforme : 3 prospects créés en `to_enrich`, 2 entreprises (1 créée pour Alice+Bob, réutilisée pour Bob ; 1 pour Claire) — vérifié directement en base, `company_id` identique pour Alice et Bob.
- **S2 est maintenant intégralement terminé** (Pappers + import CSV Pharow, les deux validés end-to-end).
- Loïc a validé S2 et donné le feu vert pour S3.
- Créé `packages/dropcontact` (`@dmh/dropcontact`) : contrairement à Pappers, l'API Dropcontact est **asynchrone** (soumission -> `request_id` -> consultation différée), confirmé par recherche avant de coder. Client (`submitDropcontactBatch`/`pollDropcontactBatch`) + mapping de qualification (`"nominative@pro"` etc. -> `valid`/`accept`/`risky`/`not_found`), 14 tests unitaires verts.
- Nouvelle migration `003_add_dropcontact_request_id.sql` (colonne sur `contacts`, pour suivre une requête en cours entre deux appels de l'Edge Function).
- Ajouté `loadDropcontactFunctionEnv` (Supabase + Dropcontact uniquement).
- Écrit `supabase/functions/enrich-dropcontact/index.ts` : 1er appel = soumission (202), appels suivants = consultation (202 si en cours, 200 + mise à jour `contacts`/`prospects.status` si prêt). `deno check` OK.
- Avant de tester, demandé confirmation à Loïc pour appliquer les migrations 002 et 003 sur la vraie base (accordé) — `supabase db push` : les deux appliquées avec succès.
- **Test fonctionnel exécuté** : cycle complet soumission → "pending" (message exactement conforme à la doc) → "ready" sur le prospect de test. Résultat `not_found` (contact fictif, normal). Testé aussi avec le vrai dirigeant de PM MECANIQUE INDUSTRIE (Frederic Vaysse Labonde, trouvé dans les données Pappers) : également `not_found`, probablement faute de site web connu pour cette PME — pas un bug, juste pas de chance sur les données de test disponibles. Le mapping qualification->confidence reste donc validé unitairement mais pas observé sur un cas "email trouvé" réel — à surveiller sur les premiers vrais prospects.
- **S3 (Dropcontact) terminé et validé.** Reste dans S3 : génération de messages via Claude API (prochaine étape), et test à 100 prospects réels (dépend d'un vrai compte Pharow/client).
- Créé `packages/claude-messages` (`@dmh/claude-messages`) : construction du prompt (persona + contraintes strictes du brief §1.3.1 étape 4) et appel Claude en sorties structurées (`output_config.format`, JSON schema — pas de parsing de texte libre à la main). 9 tests unitaires verts.
- Modèle : le brief cite `claude-sonnet-4-6`, un identifiant qui n'existe plus — utilisé `claude-sonnet-5` à la place (même tiers, coût similaire), tracé dans "Écarts assumés" ci-dessus.
- Nouvelle migration `004_add_dmh_clients_offer_description.sql` (le prompt a besoin d'une description de l'offre du client DMH, absente du schéma initial) — appliquée après confirmation de Loïc.
- En construisant l'Edge Function, `deno check` a trouvé deux vrais bugs avant même le test réel : un import de type interne cassé (même souci `.js`/`.ts` que d'habitude, corrigé en évitant l'import croisé) et surtout — la version de `@anthropic-ai/sdk` épinglée (`^0.32.0`) n'a pas la méthode `messages.parse()` que j'avais prévu d'utiliser. Corrigé en utilisant `messages.create()` (méthode stable présente dans toutes les versions) + parsing JSON manuel du texte retourné — plus robuste, moins dépendant d'une version précise du SDK.
- **Test fonctionnel exécuté** : génération réelle sur le prospect de test (PM MECANIQUE INDUSTRIE / Frederic Vaysse Labonde). Message conforme à toutes les contraintes du brief : email de 4 phrases avec référence concrète (Le Creusot, CA proche du million), pas de formule de politesse générique, CTA clair et non agressif ; message LinkedIn de 159 caractères (dans la fourchette 150-200) ; relance J+7 avec un angle différent (exemple chiffré d'un cas similaire plutôt qu'une reformulation).
- **Pipeline complet validé de bout en bout pour la première fois** : un prospect a traversé `to_enrich` → `enriched_pappers` → `enriched_contact` → `ready` via les trois Edge Functions enchaînées manuellement.
- **S3 est maintenant intégralement terminé.**
- **Point de reprise** : prochaine tâche dans l'ordre du brief = S4 (interface CRM basique + webhooks Smartlead → Supabase).
