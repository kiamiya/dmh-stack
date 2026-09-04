# Suivi de projet — DMH Stack (Phase 1)

> Ce fichier est la source de vérité sur l'avancement technique du projet.
> Il est mis à jour à la fin de chaque itération de travail, pas seulement en fin de session,
> pour que le travail reste traçable même si la fenêtre de commande se ferme.
> Voir aussi `TESTING.md` pour la démarche de test fonctionnel en cours.

Dernière mise à jour : 2026-09-04

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
| `TESTING.md` (process de test fonctionnel) | ✅ format validé à l'usage (4 itérations) |
| `apps/crm` — interface CRM interne (Vite+React+TS+Tailwind, hors S4 webhooks) | ✅ fait — validée end-to-end le 2026-07-30 (login, liste, détail, statut, marquage Smartlead) ; header/navigation ajouté le 2026-07-31 (manquait initialement) |
| `packages/smartlead` — vérification signature webhook + mapping événements/statuts (logique pure, testée) | ✅ fait (32 tests unitaires verts) — validé end-to-end contre une vraie instance locale de l'Edge Function |
| `apps/dashboard` — dashboard client interne (Vite+React+TS+Tailwind, hors déploiement Vercel) | ✅ fait — validé end-to-end le 2026-07-30 (login, vue d'ensemble, pipeline Kanban, interactions, branding) |
| `packages/scoring` — extraction de signaux Pappers + prompt + client Claude (logique pure, testée) | ✅ fait (21 tests unitaires verts) — score réel généré, cohérent avec les signaux du brief §1.3.5 |
| `packages/lemlist` — client API réelle (activités LinkedIn) + mapping événements/statuts (logique pure, testée) | ✅ fait (20 tests unitaires verts) — connexion API réelle vérifiée, synchro simulée validée contre le vrai Supabase |
| `README.md` (documentation technique V1) | ✅ fait — architecture, cycle de vie prospect, setup, tests, scripts/Edge Functions, déploiement |
| Durcissement perf/sécurité RLS (`supabase db advisors`) | ✅ fait — 23 policies + 2 fonctions + 13 index corrigés (migration `009`), voir Journal |

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
| S4 | CRM v1 | Interface CRM basique (liste prospects, statut, messages, export Smartlead) | ✅ fait — validée end-to-end le 2026-07-30 (voir Journal), `apps/crm` |
| S4 | CRM v1 | Configurer les webhooks Smartlead → Supabase | ✅ fait côté code — validé end-to-end le 2026-07-30 (voir Journal) ; reste la config réelle côté Smartlead (compte + campagne pilote), hors périmètre dev |
| S5 | Dashboard v1 | Dashboard client React (vue d'ensemble, pipeline Kanban, interactions) | ✅ fait — validé end-to-end le 2026-07-30 (voir Journal), `apps/dashboard` |
| S5 | Dashboard v1 | Déployer sur Vercel avec custom domain (premier client) | ⬜ à faire — reporté, dépend d'un vrai client pilote (même logique que le déploiement réel du webhook Smartlead) |
| S6 | Attribution | Implémenter le module d'attribution (trigger PostgreSQL) | ✅ fait en avance — trigger `calculate_attribution` livré avec le schéma initial (S1), 2 bugs corrigés le 2026-07-31 (voir Journal) |
| S6 | Attribution | Tester le trigger sur des scénarios simulés | ✅ fait — 8 scénarios validés le 2026-07-31 contre le vrai Supabase (`scripts/test-attribution.ts`), voir Journal |
| S6 | Attribution | Développer la vue Deals dans le dashboard | ✅ fait — validée end-to-end le 2026-07-31 (voir Journal), `apps/dashboard/src/pages/Deals.tsx` |
| S7 | Scoring IA | Intégrer le scoring Claude API | ✅ fait — validé end-to-end le 2026-07-31 (voir Journal), `packages/scoring` + `supabase/functions/score-prospect` |
| S7 | Scoring IA | Afficher le score dans le CRM et le dashboard | ✅ fait — badge + justification dans `apps/crm` (liste + détail) et `apps/dashboard` (Kanban) |
| S7 | Scoring IA | Configurer les webhooks Lemlist → Supabase (synchro manuelle) | ✅ fait — validé end-to-end le 2026-07-31 (voir Journal). **Précision** : le brief §1.2.4 décrit en réalité une synchro manuelle par export/import (comme Pharow), pas un webhook temps réel — implémenté comme `scripts/sync-lemlist.ts` (appel API réel, déclenché à la main) |
| S8 | Tests & pilote | Tests complets de la stack end-to-end | ✅ fait — validé le 2026-07-31 (voir Journal), un seul prospect testé de bout en bout à travers toute la chaîne |
| S8 | Tests & pilote | Corriger les bugs, optimiser les performances | ✅ fait — 1 bug bloquant (Claude `max_tokens`) + durcissement RLS/index via `supabase db advisors` (voir Journal) |
| S8 | Tests & pilote | V1 de la documentation technique interne | ✅ fait — `README.md` |

## Roadmap "parité Brevo" (S9-S16) — demande de Delphine, relayée par Loïc

> Phase 1 (S1-S8) terminée. Ce tableau couvre l'évolution du CRM vers un
> modèle plus proche de HubSpot/Brevo (analyse du 2026-09-02, plan détaillé
> validé le même jour). Ordre strict comme pour S1-S8 — voir dépendances
> dans le plan de session au moment de l'écriture. Permissions par rôle
> explicitement hors périmètre (décision Loïc).

| # | Étape | Statut |
|---|---|---|
| S9 | Champs personnalisés (Contacts/Entreprises) | ✅ fait — validé en navigateur réel le 2026-09-02 |
| S10 | Pipelines & étapes personnalisables + fiche détail Opportunité | ✅ fait — validé en navigateur réel le 2026-09-02 |
| S11 | Kanban drag-and-drop + propriétés de deal enrichies | ✅ fait — validé en navigateur réel le 2026-09-02 |
| S12 | Moteur d'automatisation générique (déclencheur/condition/action) | ✅ fait — validé en navigateur réel le 2026-09-03 |
| S13 | Segments dynamiques sur Contacts | ✅ fait — validé en navigateur réel le 2026-09-03 |
| S14 | Fusion/dédoublonnage de contacts | ✅ fait — validé en navigateur réel le 2026-09-03 |
| S15 | Dashboards pipeline Opportunités/Tâches | ✅ fait — validé en navigateur réel le 2026-09-03 |
| S16 | Rendez-vous / synchro calendrier (Google/Outlook) | ✅ fait — validé en conditions réelles le 2026-09-03 (Google + Microsoft connectés, liste d'événements visible) |
| S17 | Calendrier visuel des tâches internes + édition d'une tâche | ✅ fait — voir Journal, en attente de test navigateur réel par Loïc |
| S18 | Calendrier visuel + édition d'événement sur "Mon calendrier" (Google/Outlook) | ✅ fait — validé en conditions réelles le 2026-09-03 |
| S19 | Créer un événement + lier un événement à un contact/entreprise/opportunité | ✅ fait côté code — en attente de déploiement Edge Function + test navigateur réel |
| S20 | Listes statiques de contacts | ✅ fait côté code — en attente de migration + test navigateur réel |
| S21 | Rappel des tâches du jour (en-tête, toujours visible) | ✅ fait |
| S22 | Compacter les blocs de connexion calendrier | ✅ fait |
| S23 | Généraliser les listes (Contacts/Entreprises/Opportunités) + assignation croisée | ✅ fait — déployé, un hint de découvrabilité ajouté suite au retour de Loïc ("je ne vois pas les listes" → sélecteur caché tant qu'aucun client n'est choisi) |
| S24 | Bouton "+ Nouveau contact" sur /contacts | ✅ fait |
| S25 | Tags = nouveau type de champ personnalisé "Choix multiples" | ✅ fait côté code — en attente de migration |
| S26 | Listes dynamiques (critères ET/OU) + fusion des segments dans les listes | ✅ fait côté code — en attente de migration + test navigateur réel |
| S27 | Dropdowns avec recherche (contacts/entreprises/listes) | ✅ fait |
| S28 | Navigation en barre latérale gauche avec menus/sous-menus (HubSpot/Brevo) | ✅ fait |

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

Le client de test a désormais un `offer_description` renseigné (transformation digitale PME industrielles), et le prospect `1a646013-...` a un message généré réel dans `messages_generated`, statut final `ready`, **`approved = true`** (marqué "prêt pour Smartlead" depuis le CRM pendant le test S4 du 2026-07-30).

Compte `staff_members` de test créé le 2026-07-30 pour valider le CRM : ton compte réel `lrd@dmhassocies.com` (n'existait pas encore dans `auth.users`, créé via un script jetable clé `service_role` pour ce test).

## Écarts assumés par rapport au brief original

> Le brief (`DMH Plan Execution Strategique Juillet Decembre 2026.docx`) reste la référence historique et **n'est jamais modifié** — les décisions qui s'en écartent sont tracées ici, pas rétro-appliquées au document.

- **2026-07-30 — Lemlist remplace Waalaxy** pour l'automatisation LinkedIn/cold outreach (le brief §1.2.4 documente Waalaxy en détail, ce n'est plus l'outil retenu). Impact code : variable d'environnement `LEMLIST_API_KEY` (ex-`WAALAXY_API_KEY`), colonne `prospects.lemlist_contact_id` (migration `002_rename_waalaxy_to_lemlist.sql`, appliquée sur Supabase le 2026-07-30).
- **2026-07-30 — Modèle Claude `claude-sonnet-5` au lieu de `claude-sonnet-4-6`** cité dans le brief (§1.3.1 étape 4) : cet identifiant précis n'existe plus dans l'API Claude actuelle. Le tiers Sonnet reste le bon choix (le brief le justifie par le coût à ce volume, ~0,003-0,005 €/message), seul l'identifiant exact change — même logique que Lemlist/Waalaxy. Colonne `messages_generated.model_used` mise à jour avec la vraie valeur à chaque insertion (pas de migration nécessaire, le défaut de colonne n'est qu'indicatif).
- **2026-07-31 — Item S7 "webhooks Lemlist" implémenté comme un script de synchro manuelle, pas un webhook** : en relisant le brief §1.2.4 avant de coder, le texte précise explicitement que Waalaxy/Lemlist est "synchronisé manuellement... dans un premier temps" (le SDR/Loïc déclenche l'import, contrairement à Smartlead qui est un vrai webhook temps réel, S4). Pas un écart de ma part — une lecture plus attentive du brief avant d'implémenter, qui a évité de construire la mauvaise architecture (webhook Edge Function au lieu d'un script). Implémenté comme `scripts/sync-lemlist.ts`, utilisant la vraie API Lemlist (`GET /activities`) plutôt qu'un format CSV deviné, puisqu'une vraie clé `LEMLIST_API_KEY` existe déjà.

## Incertitudes techniques à lever

- **Bug bloquant réel trouvé pendant le test end-to-end S8** : `generate-messages` a échoué (`stop_reason: max_tokens`, réponse tronquée donc inexploitable) avec `max_tokens: 1024` — une marge trop juste pour 4 champs de sortie structurée, dépendante de la variabilité du modèle. Corrigé (`max_tokens: 2048` dans `packages/claude-messages/src/client.ts`), même précaution appliquée par cohérence à `packages/scoring/src/client.ts` (`512` → `1024`). Aucun des tests précédents n'avait rencontré ce cas — trouvé uniquement parce que le test end-to-end a réutilisé les fonctions en conditions réelles plutôt que de s'arrêter aux tests unitaires.
- **`supabase db advisors --linked` passé pour la première fois (S8)** : a révélé 23 policies RLS + 2 fonctions trigger avec un problème de performance réel (`auth.uid()`/`auth.role()` ré-évalués à chaque ligne au lieu d'une fois par requête) et 13 clés étrangères sans index de couverture — tous corrigés par la migration `009_performance_and_security_hardening.sql`. Restent, en connaissance de cause : `multiple_permissive_policies` (168 avertissements, chaque table a 3 policies additives intentionnelles — `client_isolation`/`staff_full_access`/`client_user_access` — les consolider réduirait la clarté du modèle d'accès pour un gain marginal à l'échelle actuelle, pas fait) et `auth_leaked_password_protection` (à activer dans Auth > Providers du dashboard Supabase, pas modifiable par migration SQL — action manuelle recommandée pour Loïc). À relancer périodiquement (`pnpm exec supabase db advisors --linked --type all`) pour détecter toute nouvelle régression.
- **Bug réel trouvé en testant `scripts/sync-lemlist.ts`** : dans la première version, les activités `linkedinInterested`/`linkedinNotInterested` (les seules porteuses d'un changement de statut candidat) ne produisaient aucune interaction mappée — le code sautait ces activités (`skipped`) avant même d'atteindre la vérification du changement de statut, rendant cette logique inatteignable en pratique. Corrigé en les mappant vers une interaction de type `note` (même principe que `LEAD_CATEGORY_UPDATED` côté Smartlead), ce qui les fait passer par le chemin normal d'insertion + vérification de statut. Détecté uniquement grâce au test fonctionnel avec des scénarios simulés réalistes (voir `TESTING.md`) — un bon rappel que même une logique simple mérite un vrai test bout en bout, pas seulement des tests unitaires sur les fonctions pures isolées.
- **`output_config.format` (sorties structurées Claude) ne supporte pas `minimum`/`maximum` sur un type `integer`** — erreur 400 réelle rencontrée en testant `score-prospect` ("properties maximum, minimum are not supported"). Le sous-ensemble de JSON Schema accepté par cette fonctionnalité est plus restreint que le JSON Schema complet. Corrigé en retirant ces contraintes du schéma (`packages/scoring/src/client.ts`) — la fourchette 1-10 reste imposée uniquement via les instructions du prompt. À garder en tête pour tout futur schéma de sortie structurée avec des contraintes numériques.
- ~~Trigger `calculate_attribution` jamais testé~~ **Testé le 2026-07-31** (`scripts/test-attribution.ts`, 8 scénarios contre le vrai Supabase). Deux bugs réels trouvés et corrigés (migration `008_fix_deal_attribution_trigger.sql`) : (1) le trigger ne se déclenchait que sur `UPDATE`, jamais sur `INSERT` — empêchait le comportement décrit au brief §1.3.3 ("dès la saisie [d'un deal signé], calcule automatiquement"), alors que le code de la fonction (`old.status is null`) suggérait que ce cas était déjà censé être couvert ; (2) `months_between` dans `attribution_report` utilisait `extract(month from age(...))`, qui ne renvoie que la composante mois (0-11) et non le total — faux pour tout écart >12 mois, un champ pourtant documenté "pour litiges éventuels". La vraie règle d'éligibilité (`<=18` mois, basée sur `extract(epoch from ...)`) n'était pas affectée. Détail des 8 scénarios dans `TESTING.md`.
- ~~Champs de réponse de l'API Pappers non vérifiés~~ **Validé le 2026-07-30** contre deux vrais appels (La Poste puis PM MECANIQUE INDUSTRIE). Deux bugs de mapping trouvés et corrigés : `employeeRange` utilisait `tranche_effectif` (un code interne) au lieu de `siege.effectif` (le libellé humain) ; `revenue`/`revenueYear` cherchaient un champ racine `chiffre_affaires` inexistant — le CA vit dans un tableau `finances[]`, on prend l'exercice le plus récent. `website` utilisait `site_web`, corrigé en `website`. Détail dans `packages/pappers/src/mapper.ts`.
- ~~Edge Function `index.ts` jamais exécutée réellement~~ **Exécutée et validée end-to-end le 2026-07-30** (Deno CLI en local, contre le vrai Pappers + le vrai Supabase). A révélé et corrigé un bug de couplage (`loadServerEnv` → `loadPappersFunctionEnv` scopé).
- ~~`SUPABASE_URL` injoignable~~ **Résolu le 2026-07-30** — le projet Supabase était en pause pour inactivité, Loïc l'a réactivé.
- **Déclenchement automatique des Edge Functions** : le brief prévoit un déclenchement automatique sur changement de statut (webhook DB Supabase). Ce n'est pas encore câblé — `enrich-pappers` et `enrich-dropcontact` s'invoquent pour l'instant manuellement via HTTP POST `{ prospect_id }`. Câblage des triggers DB → webhook à faire dans une itération suivante (probablement en même temps pour les deux, plus `generate-messages` une fois écrite).
- ~~API Dropcontact non vérifiée~~ **Validée le 2026-07-30** contre l'API réelle : le flux asynchrone (soumission -> `request_id` -> consultation) fonctionne exactement comme documenté, y compris le message `"Request not ready yet, try again in 30 seconds"` retourné tel quel pendant le traitement. Testé avec un contact fictif (résultat `not_found`, attendu) et avec le vrai dirigeant de PM MECANIQUE INDUSTRIE (Frederic Vaysse Labonde) — également `not_found`, probablement car cette PME n'a pas de site web renseigné (Dropcontact devine moins bien sans domaine). Le mapping `qualification -> email_confidence` ("nominative@pro" -> valid, etc.) est une interprétation raisonnable du vocabulaire Dropcontact, pas explicitée dans le brief — testée unitairement sur tous les cas mais pas observée en conditions réelles faute d'avoir trouvé un email réel pendant les tests. À surveiller sur les premiers vrais prospects clients.
- **Nouvelle colonne `contacts.dropcontact_request_id`** (migration `003_add_dropcontact_request_id.sql`, appliquée le 2026-07-30) : nécessaire car l'API Dropcontact est asynchrone, contrairement à Pappers — pas anticipé dans le schéma initial du brief.
- **Payload Pappers potentiellement volumineux pour de très grandes entreprises** : un test avec La Poste (entité centenaire) a produit un JSON de 16 Mo et fait timeout la requête d'update PostgreSQL — pas un bug de notre code, juste une entreprise extrême et non représentative. Les PME industrielles ciblées par DMH (20-200 salariés, cf. brief) ont des payloads bien plus petits (~25-50 Ko sur le test réel PM MECANIQUE INDUSTRIE). À garder en tête si jamais un client DMH a un très gros groupe dans son ICP : prévoir une limite de taille ou un timeout de requête plus long pour ce cas rare.
- **Noms de colonnes du CSV Pharow non vérifiés contre un vrai export** : aucun compte Pharow n'existe encore, donc `packages/pharow/src/csv.ts` devine les en-têtes probables (prénom/nom/entreprise/etc., plusieurs alias par champ, tolérant à la casse/aux accents) plutôt que de les avoir validés comme pour Pappers. Le test du 2026-07-30 utilisait un CSV fictif écrit à la main avec les en-têtes supposées — donc il valide la logique d'import (parsing, dédup, écriture DB), pas la compatibilité avec un vrai fichier Pharow. **À revalider dès qu'un compte Pharow existe et qu'un vrai export est disponible.**
- **`contacts.appointment_date`/`months_in_role` jamais renseignés par le pipeline actuel** : le prompt Claude sait exploiter "en poste depuis X mois" (signal important brief §1.3.5 pour le scoring aussi), mais rien ne remplit encore ce champ — Pappers renvoie bien les dirigeants (`representants`, avec `date_prise_de_poste`) mais faire correspondre un dirigeant Pappers au contact exact du prospect est une logique métier ambiguë, volontairement pas implémentée (voir décision de scope lors de S2). Pour l'instant ce champ reste toujours `null` en pratique. À trancher avant S7 (scoring).
- **`scripts/deploy-client.ts` référencé dans `package.json` (`pnpm run deploy-client`) mais le fichier n'existe pas** — probablement un placeholder du scaffold initial du monorepo (commit `b89dac3`), jamais implémenté. Repéré en travaillant sur `scripts/test-attribution.ts`. Pourrait être exactement le mécanisme attendu pour la gestion des clients (cf. ta remarque du 2026-07-31 : "si c'est prévu pour la P2 alors on y touche pas") — à clarifier avec toi le moment venu, pas touché pour l'instant.
- **Nouvelle colonne `dmh_clients.offer_description`** (migration `004_add_dmh_clients_offer_description.sql`, appliquée le 2026-07-30) : nécessaire pour personnaliser le prompt Claude (description de l'offre du client DMH), absente du schéma initial du brief.
- **Rattachement webhook Smartlead → prospect par email, pas par ID** : les payloads Smartlead (vérifié par recherche sur `api.smartlead.ai`, pas dans le brief) ne renvoient jamais l'identifiant qu'on espérerait retrouver dans `prospects.smartlead_contact_id` (colonne jamais remplie aujourd'hui, faute d'injection réelle vers Smartlead — le bouton "Marquer prêt pour Smartlead" du CRM ne fait qu'un update en base, pas un vrai appel API). Le seul champ commun à tous les types d'événements est l'email du lead, mis en correspondance avec `contacts.email`. Fonctionne dans le test (voir Journal), mais reste une interprétation du schéma, pas une garantie du brief — à surveiller sur les premiers vrais webhooks (même type de réserve que le mapping qualification Dropcontact).
- **Mapping "catégorie de lead Smartlead" → `prospects.status`** (`mapLeadCategoryToProspectStatus`, `packages/smartlead/src/mapper.ts`) : heuristique sur les catégories par défaut les plus courantes (`"Interested"` → `qualified`, `"Meeting Booked"` → `meeting_booked`, `"Not Interested"`/`"Wrong Person"`/`"Do Not Contact"` → `not_interested`, `"Closed"` → `won`) — les catégories Smartlead sont configurables par compte, cette liste n'est pas garantie par le brief. Catégorie non reconnue → aucun changement de statut (comportement sûr par défaut). À ajuster dès qu'un vrai client pilote utilise Smartlead.
- **Nouvelle table `staff_members` + policies `staff_full_access`** (migration `005_add_staff_members.sql`, appliquée le 2026-07-30) : le brief ne prévoit pas explicitement d'accès interne DMH multi-clients depuis un navigateur (les policies RLS initiales ne couvraient que `service_role` et un client scopé à son propre `client_id`, pensé pour S5). Nécessaire pour que `apps/crm` fonctionne avec la clé anonyme (jamais `service_role` côté navigateur). Voir "Test fonctionnel" S4 dans le Journal pour la limite connue (un seul client de test existe, la preuve d'accès *inter-clients* au sens strict reste à refaire avec un 2e client réel).
- **Nouvelle valeur d'enum `interaction_type.email_bounced`** (migration `006_add_email_bounced_interaction_type.sql`, appliquée le 2026-07-30) : l'enum initial couvrait `email_unsubscribed` mais pas les bounces — nécessaire pour journaliser l'événement `EMAIL_BOUNCE` du webhook Smartlead, absent du schéma initial du brief.
- **Nouvelle table `client_users` + policies `client_user_access`** (migration `007_add_client_users.sql`, appliquée le 2026-07-30) : la policy `client_isolation` originale (`dmh_clients` et les 6 tables scopées `client_id`) suppose que l'UID Supabase Auth d'un client est littéralement égal à `dmh_clients.id` — aucun flux de création de compte ne garantit ça en pratique, et forcer un UID choisi à la création n'est pas un flux standard. Même solution que l'accès staff en S4 (`staff_members`) : une table de rattachement + policy additive, purement en plus de l'existant. Support aussi plusieurs comptes par client (le schéma original ne le permettait pas).

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
- Démarré S4 (item 1, interface CRM). Écart de sécurité trouvé en explorant le schéma : aucune policy RLS ne permet à un compte interne DMH de voir tous les clients depuis un navigateur (seulement `service_role` ou un client scopé à son `client_id`). Décidé avec toi : nouvelle table `staff_members` + policy additive `staff_full_access` (migration `005_add_staff_members.sql`, écrite mais pas encore appliquée à ce stade).
- Scaffoldé `apps/crm` (`@dmh/crm`) : Vite + React 18 + TypeScript + Tailwind, configurés à la main (même esprit que les autres packages). Composants façon shadcn/ui écrits à la main (`Button`/`Badge`/`Card`/`Table`, `class-variance-authority` + `clsx` + `tailwind-merge`) plutôt que leur CLI interactive. Client Supabase construit avec `loadPublicEnv` (`@dmh/config`, déjà testé) — jamais la clé `service_role` côté navigateur.
- Auth : page `/login` (email/mot de passe via `supabase.auth.signInWithPassword`), `ProtectedRoute` (vérifie uniquement la session — la sécurité réelle est RLS côté serveur, pas ce garde côté client), routing `react-router-dom`.
- Logique pure testée : `src/lib/status.ts` (12 statuts `ProspectStatus` → libellé FR + couleur de badge), 4 tests unitaires verts.
- Deux pages : `/` (liste des prospects, filtrable par statut, colonnes entreprise/contact/client DMH/statut) et `/prospects/:id` (détail entreprise/contact enrichis, message généré par Claude affiché intégralement, dropdown de changement de statut, bouton "Marquer prêt pour Smartlead" — pas d'appel API Smartlead réel, aucun client `@dmh/smartlead` n'existe encore, ce bouton documente l'intention et prépare l'injection réelle pour plus tard).
- `pnpm typecheck`/`pnpm test` racine restés verts sur l'ensemble des 7 packages du monorepo après ajout de `@dmh/crm`.
- **Migration 005 appliquée** sur le vrai Supabase après ta confirmation explicite (`supabase db push`).
- **Compte de test créé** : ton compte réel `lrd@dmhassocies.com` (mot de passe que tu as fourni) — n'existait pas encore dans `auth.users`, créé via un script jetable (clé `service_role`, supprimé après usage) et lié à `staff_members`.
- **Test fonctionnel exécuté** dans un vrai navigateur (Chromium headless via Playwright, installé et piloté par un script jetable, aucun outil ajouté au repo — `chromium-cli` recommandé par le skill `run` n'était pas disponible dans cet environnement). Parcours complet validé : page `/login` (rendu correct, aucune erreur console), redirection non-authentifié, connexion réussie, liste des 4 prospects de test visible (accès accordé via `staff_full_access`, cf. limite notée dans "Écarts" — un seul client de test existe donc pas de preuve stricte multi-clients), détail du prospect `1a646013-...` (message Claude affiché intégralement), changement de statut (aller-retour `ready`→`qualified`→`ready`), et "Marquer prêt pour Smartlead" cliqué avec succès (`approved=true`, `injected_at` persistés). Détail complet dans `TESTING.md`.
- Bug mineur trouvé et corrigé en cours de route (pas dans le code du repo) : le script jetable de setup du compte de test parsait mal `.env.local` à cause d'un commentaire en fin de ligne sur `SUPABASE_SERVICE_ROLE_KEY` — sans rapport avec le code applicatif, aucune correction nécessaire dans le repo.
- **S4 (item 1, interface CRM) est maintenant terminé et validé.** Reste dans S4 : l'Edge Function `webhook-smartlead`, explicitement reportée à une itération séparée (décision prise au moment du plan, même logique "une brique à la fois" que pour Pappers/Dropcontact/Claude).
- **Point de reprise** : prochaine tâche dans l'ordre du brief = S4 (item 2, webhooks Smartlead → Supabase), sauf si tu préfères d'abord passer en revue `TESTING.md` ci-dessus.
- Question posée : y a-t-il des tâches dédiées à la navigation/UI dans le brief ? Réponse : non, le sujet est englobé dans les tâches fonctionnelles S4 (CRM) et S5 (dashboard), pas de phase maquettes séparée. Loïc a précisé qu'il pourra donner un avis plus honnête sur l'UX/UI après S5 — pour l'instant, feu vert pour terminer S4.
- Démarré S4 (item 2, webhook Smartlead). Recherche de l'API réelle (`api.smartlead.ai`, doc pas dans le brief) : types d'événements et champs exacts (`EMAIL_SENT`/`FIRST_EMAIL_SENT`, `EMAIL_OPEN`, `EMAIL_LINK_CLICK`, `EMAIL_REPLY`, `EMAIL_BOUNCE`, `LEAD_UNSUBSCRIBED`, `LEAD_CATEGORY_UPDATED`), authentification par header `X-Smartlead-Signature` (`"sha256=" + HMAC-SHA256(secret, corps_brut).hex()`), idempotence par header `X-Request-Id`.
- Migration `006_add_email_bounced_interaction_type.sql` (l'enum `interaction_type` n'avait pas de valeur pour un bounce) — appliquée après ta confirmation explicite.
- Créé `packages/smartlead` (`@dmh/smartlead`) : `signature.ts` (vérification HMAC via Web Crypto, cross-runtime Deno/Node), `mapper.ts` (mapping événement → interaction, mapping catégorie de lead → statut, garde-fou `shouldAdvanceStatus` anti-retour-en-arrière). 32 tests unitaires verts.
- Ajouté `loadWebhookSmartleadFunctionEnv` dans `@dmh/config` (Supabase + `SMARTLEAD_WEBHOOK_SECRET` uniquement, pas besoin de `SMARTLEAD_API_KEY` pour recevoir un webhook).
- Écrit `supabase/functions/webhook-smartlead/index.ts` : vérifie la signature (401 si invalide), résout le prospect par email (`contacts.email`, cf. "Écarts assumés" pour la limite de cette approche), déduplique par `X-Request-Id` (stocké dans `interactions.metadata`, pas de nouvelle colonne), insère l'interaction (déclenche le trigger existant `update_prospect_activity`), et avance `prospects.status` de façon conservatrice pour 3 cas précis (`EMAIL_SENT` séquence 1 → `in_sequence`, `EMAIL_REPLY` → `replied`, `LEAD_CATEGORY_UPDATED` → mapping catégorie), jamais en arrière. `deno check` OK — a de nouveau révélé le même souci d'import interne `.js`/`.ts` que sur `claude-messages` (résolu en important directement `signature.ts`/`mapper.ts` plutôt que le barrel `index.ts` du package, même fix que pour `enrich-dropcontact`).
- **Test fonctionnel exécuté** : Edge Function lancée en local (Deno CLI) contre le vrai Supabase, 11 scénarios simulés avec des payloads conformes au format documenté et des signatures HMAC calculées correctement : signature invalide (401), `event_type` inconnu (200 skip), email sans contact correspondant (200 skip), `EMAIL_SENT` (statut `enriched_contact` → `in_sequence`, saute `ready` — le statut réel du prospect de test avait été changé entre-temps, probablement par toi en explorant le CRM ; comportement correct malgré tout), rejeu du même `X-Request-Id` (dédupliqué, pas de doublon en base), `EMAIL_OPEN`/`EMAIL_LINK_CLICK`/`EMAIL_BOUNCE` (journalisés, `email_bounced` confirme que la migration 006 fonctionne), `EMAIL_REPLY` (`in_sequence` → `replied`), `LEAD_CATEGORY_UPDATED` "Meeting Booked" (`replied` → `meeting_booked`), `LEAD_UNSUBSCRIBED` (journalisé). 7 interactions au total, trigger `update_prospect_activity` vérifié (`first_contact_at`/`last_activity_at` bien renseignés). Détail dans `TESTING.md`.
- **S4 est maintenant intégralement terminé côté code.** Reste hors périmètre dev (cf. "Écarts assumés") : déployer la fonction sur le vrai Supabase et configurer réellement le webhook côté Smartlead (compte + campagne pilote pas encore disponibles).
- **Point de reprise** : prochaine tâche dans l'ordre du brief = S5 (dashboard client React), après validation de `TESTING.md` par toi.
- Tu as validé S4 ("c'est bon, tu peux passer à la S5").
- Démarré S5 (item 1, dashboard client). Exploré `apps/crm` pour réutiliser au maximum les mêmes patterns (config Vite/Tailwind/vitest identique, `lib/supabase.ts`/`cn.ts`/`useSession.ts`/`ProtectedRoute` copiés tels quels, composants `ui/*` identiques). Trouvé le même type d'écart de sécurité qu'en S4 en explorant le schéma : la policy `client_isolation` originale suppose `auth.uid() = dmh_clients.id`, un flux de connexion qui n'existe pas en pratique — même solution que S4 (table `client_users` + policy additive `client_user_access`, migration `007_add_client_users.sql`), validée avec toi avant de coder (tu as confirmé le Kanban en lecture seule plutôt qu'interactif).
- Scaffoldé `apps/dashboard` (`@dmh/dashboard`). Créé `src/lib/pipeline.ts` (regroupement des 12 statuts en 9 colonnes Kanban lisibles pour un client — fusion des 3 statuts internes d'enrichissement en "En préparation", `lost`/`not_interested` en "Perdu" — et calcul des métriques de la vue d'ensemble, dont un taux de réponse `email_replied`/`email_sent`), et `src/lib/interactionLabels.ts` (libellés FR des 13 types d'interaction). 24 tests unitaires verts au total (10 + 4 + 4 côté status.ts repris tel quel).
- Header commun avec branding white-label (`brand_name`/`brand_logo_url`/`brand_primary_color` de `dmh_clients`, via un nouveau hook `useClient` qui n'a besoin d'aucun filtre explicite — RLS `client_user_access` ne laisse déjà voir que la bonne ligne). Pas de branding avant connexion dans cette itération (nécessiterait une policy RLS anonyme ou une vue dédiée, pas fait pour ce MVP).
- 3 pages : vue d'ensemble (cartes de statistiques), pipeline (Kanban lecture seule, décision confirmée avec toi), interactions (liste chronologique).
- `pnpm typecheck`/`pnpm test` racine verts sur les 9 packages du monorepo après ajout de `@dmh/dashboard`.
- **Migration 007 appliquée** sur le vrai Supabase après ta confirmation.
- **Nouveau compte de test créé**, volontairement distinct du compte staff : `client-test-claude@dmhassocies.com`, lié via `client_users` au client de test existant (pas ton compte réel cette fois — je voulais un compte qui ne soit PAS dans `staff_members`, pour prouver que l'accès passe bien par `client_user_access` et pas par un accès staff plus large ; confirmé directement en base).
- **Test fonctionnel exécuté** dans un vrai navigateur (Playwright headless, même outillage jetable que pour le CRM) : connexion, vue d'ensemble affiche les bons chiffres (4 prospects, 0 en séquence active, 100% de taux de réponse, 1 RDV programmé, 0 gagné — cohérent avec l'état de la base après le test du webhook Smartlead), Kanban affiche les 4 prospects dans les bonnes colonnes avec le bon branding, interactions liste les 7 lignes créées pendant le test précédent. Aucune erreur console. Détail dans `TESTING.md`.
- **S5 (item 1, dashboard client) est maintenant terminé côté code.** Reste dans S5 : déploiement Vercel avec domaine personnalisé, reporté (dépend d'un vrai client pilote, même logique que la config réelle du webhook Smartlead).
- **Point de reprise** : prochaine tâche dans l'ordre du brief = S6 (attribution — le trigger existe déjà depuis S1, reste à le tester sur des scénarios simulés et à construire la vue Deals, qui dépend de S5), après validation de `TESTING.md` par toi.
- Tu n'as pas pu tester le dashboard : le CRM (`apps/crm`) n'avait en fait **aucun header/menu de navigation** (juste liste → clic sur une ligne → fiche détail, sans lien retour ni déconnexion) — un vrai manque, pas juste un souci de compréhension. William a répondu "le CRM doit être une app complète" — j'ai donc scopé la correction sur le CRM lui-même (pas de lien croisé vers le Dashboard, les deux servent des publics différents et ça n'a pas été demandé).
- Ajouté `apps/crm/src/components/Header.tsx` (même structure que le Header du Dashboard, adapté : pas de branding client, juste "DMH CRM" + nav "Prospects" + email du staff connecté + bouton Déconnexion). Ajouté un lien "← Retour aux prospects" sur la fiche détail (`ProspectDetail.tsx`) — jusque-là, seul le bouton précédent du navigateur permettait d'y revenir. Câblé via un `ProtectedLayout` dans `App.tsx`, même pattern que le Dashboard.
- `pnpm typecheck`/`pnpm test` racine toujours verts (9 packages). Pas de nouvelle logique pure ici (juste rendu/routing), donc pas de nouveau test unitaire — cohérent avec le reste des pages CRM/Dashboard.
- **Test fonctionnel exécuté** dans un vrai navigateur : header visible sur les deux pages protégées, nav "Prospects" fonctionne, lien retour fonctionne, déconnexion fonctionne (redirige vers `/login`). Aucune erreur console.
- **Point de reprise** : ce correctif est terminé, en attente de ta confirmation que tu peux maintenant naviguer et tester le Dashboard. Ensuite : S6 (attribution).
- Tu as confirmé pouvoir naviguer, validé l'ergonomie CRM/Dashboard ("simple et sobre"), et posé une question sur la gestion des clients (remplissage/ajout) — vérifié dans le brief extrait (`Phase 1` = juillet-août, construction ; `Phase 2` = septembre-octobre, activation commerciale incluant "Déployer les dashboards pour chaque nouveau client" ; le mode self-service n'est prévu qu'en Phase 3 Option B). Confirmé qu'aucune tâche Phase 1 (S1-S8) ne couvre la création de clients — tu as tranché : "si c'est prévu pour la P2 alors on y touche pas", et validé les deux interfaces. Feu vert pour S6 ("tu peux y aller").
- Démarré S6. En relisant `calculate_attribution()` pour préparer les scénarios de test, trouvé 2 bugs réels dans le trigger existant (détail dans "Incertitudes techniques" ci-dessus) : trigger `UPDATE`-only n'ayant jamais pu se déclencher sur un `INSERT` direct en `won`, et `months_between` mal calculé pour les écarts >12 mois. Corrigés dans la migration `008_fix_deal_attribution_trigger.sql`, appliquée après ta confirmation.
- Créé `scripts/test-attribution.ts` (réutilise `loadPharowImportEnv`, forme identique). **8 scénarios exécutés contre le vrai Supabase, tous verts** : INSERT direct en `won` déclenche l'attribution, contact préexistant → non attribué, aucune interaction → non attribué, premier contact >18 mois → non attribué (et `months_between` correctement ~20 au lieu du bug 0-11), deal sans `prospect_id` → non attribué, mise à jour d'un deal déjà `won` → pas de recalcul de `attribution_report`.
- Construit la vue Deals (`apps/dashboard/src/pages/Deals.tsx`, route `/deals`, ajoutée à la nav du Header) : formulaire "Déclarer un deal signé" (entreprise, montant, date de signature, prospect lié optionnel) → insert direct en `status: 'won'` (RLS `client_user_access` de la migration 007 couvrait déjà l'INSERT, aucune nouvelle policy nécessaire), liste des deals déjà déclarés avec statut d'attribution et commission. Logique pure extraite dans `src/lib/deals.ts` (`validateDealForm`, `formatCurrency`), 10 tests unitaires verts.
- `pnpm typecheck`/`pnpm test` racine verts sur les 9 packages.
- **Test fonctionnel exécuté** dans un vrai navigateur (Playwright headless, compte de test client) : déclaration d'un deal via le formulaire, apparition immédiate dans la liste avec le bon statut d'attribution (non attribué, aucun prospect lié — cohérent), les 6 deals de test de `scripts/test-attribution.ts` s'affichent avec les bons montants/badges/commissions formatés. Aucune erreur console.
- En marge : repéré que `scripts/deploy-client.ts` est référencé dans `package.json` mais n'existe pas (probablement un placeholder du scaffold initial, jamais implémenté) — possiblement lié à ta remarque sur la gestion des clients, pas touché pour l'instant (voir "Incertitudes techniques").
- **S6 est maintenant intégralement terminé côté code.**
- **Point de reprise** : prochaine tâche dans l'ordre du brief = S7 (scoring IA — intégrer le scoring Claude API, l'afficher dans le CRM et le dashboard, configurer les webhooks Lemlist → Supabase), après validation de `TESTING.md` par toi.
- Tu as validé la vue Deals ("je viens de regarder la page de deal, elle me semble bonne"). Feu vert pour S7.
- Démarré S7 (items 1-2 : scoring Claude + affichage — item 3, webhooks Lemlist, reporté comme d'habitude, recherche API pas encore faite). Relu le brief §1.3.5 en détail (`scratchpad/brief.txt`, lignes 113-117) : score 1-10 stocké sur `companies` (`ai_score`/`ai_score_reason`, déjà dans le schéma initial), calculé après l'étape Pappers uniquement, à partir de 4 signaux positifs et 4 négatifs précis (dirigeant nommé <12 mois, effectif 20-200, secteur industriel à vente réseau, CA stagnant ; vs. >500 salariés, secteur appels d'offres publics, CA en forte croissance, titre directeur commercial parmi les dirigeants).
- Avant de coder, vérifié le format réel du champ brut `representants` de Pappers (jamais extrait jusqu'ici) directement dans les données déjà en base pour PM MECANIQUE INDUSTRIE : confirmé `nom_complet`, `qualite`, `date_prise_de_poste`, et `finances[].taux_croissance_chiffre_affaires` déjà pré-calculé par Pappers (pas besoin de le recalculer).
- Créé `packages/scoring` (`@dmh/scoring`) : `signals.ts` (extraction dirigeants + historique CA depuis le JSON brut Pappers, réutilise `calculateMonthsInRole` de `@dmh/pappers`), `prompt.ts` (les 4+4 signaux du brief), `client.ts` (réutilise le type `AnthropicMessagesClient` et `DEFAULT_MODEL` de `@dmh/claude-messages`, plutôt que de dupliquer). 21 tests unitaires verts. Nouveau cas d'incompatibilité Deno rencontré (première fois qu'un package dépend d'un AUTRE package workspace, pas juste de lui-même) : les imports `@dmh/pappers`/`@dmh/claude-messages` ne résolvent pas du tout sous Deno (pas un souci d'extension `.js`/`.ts` cette fois, mais "not a dependency and not in import map") — corrigé en ajoutant des entrées dans le `deno.json` de la fonction pointant directement vers les fichiers source concernés (`mapper.ts`/`client.ts`), et en dupliquant structurellement les 2 petits types purement internes (`ScoringPrompt`, le type de `signals`) pour éviter le souci d'import `.js` déjà rencontré plusieurs fois.
- Écrit `supabase/functions/score-prospect/index.ts` : ne dépend pas du statut exact du prospect (seulement de la présence de `companies.pappers_data`), donc rejouable à tout moment. `deno check` OK après les corrections ci-dessus.
- **Bug réel trouvé en testant en conditions réelles** : `output_config.format` (sorties structurées Claude) refuse `minimum`/`maximum` sur un type `integer` (erreur 400) — corrigé en retirant ces contraintes du schéma, la fourchette 1-10 reste imposée par le prompt (détail dans "Incertitudes techniques" ci-dessus).
- **Test fonctionnel exécuté** : scoring réel sur PM MECANIQUE INDUSTRIE (Deno CLI + vraie API Claude + vrai Supabase) → score 5/10, justification cohérente et précise (secteur pertinent + CA stagnant, mais effectif très faible et dirigeant en poste depuis 88 mois — pas de signal fort de nouveauté). Affiché correctement dans le CRM (liste : nouvelle colonne "Score" ; détail : carte "Score IA" avec badge coloré + justification) et dans le Kanban du dashboard (badge sur chaque carte), vérifié dans un vrai navigateur, aucune erreur console.
- `apps/crm/src/lib/score.ts` et `apps/dashboard/src/lib/score.ts` (dupliqués, même principe que `status.ts`) : `getScoreColor` (rouge <4, jaune 4-6, vert >6) + `formatScore`, 6 tests unitaires chacun.
- `pnpm typecheck`/`pnpm test` racine verts sur les 10 packages du monorepo.
- **S7 (items 1-2) est maintenant intégralement terminé côté code.** Reste dans S7 : webhooks Lemlist → Supabase (3e item), reporté.
- **Point de reprise** : prochaine tâche dans l'ordre du brief = S8 (tests complets end-to-end, correction de bugs, documentation technique interne) — sauf si Loïc préfère d'abord traiter l'item Lemlist de S7, après validation de `TESTING.md`.
- Tu as validé le scoring IA ("c'est bon, tu peux passer à la suite"). Dans l'ordre strict du brief, prochain item = S7 (3), pas encore S8.
- Avant de coder, relu le brief §1.2.4 en détail (`scratchpad/brief.txt`, ligne 68) : découverte que "les webhooks Lemlist" n'en sont en réalité pas — le brief décrit explicitement une synchro **manuelle** (export/import déclenché par le SDR/Loïc), le même principe que Pharow, pas un webhook temps réel comme Smartlead. Détail dans "Écarts assumés" ci-dessus. Plutôt que deviner un format CSV (jamais vérifié, comme pour Pharow), utilisé la vraie clé `LEMLIST_API_KEY` déjà en `.env.local` pour appeler la vraie API (`developer.lemlist.com`, vérifiée par recherche) : `GET /activities` (auth Basic, pagination), types d'activité LinkedIn confirmés (`linkedinInviteDone`, `linkedinInviteAccepted`, `linkedinSent`, `linkedinReplied`, `linkedinInterested`/`linkedinNotInterested`).
- Créé `packages/lemlist` (`@dmh/lemlist`) : `client.ts` (appel réel paginé, Basic Auth), `mapper.ts` (mapping activité → interaction + activité → statut candidat). Réutilise `shouldAdvanceStatus` de `@dmh/smartlead` (garde-fou anti-retour-en-arrière déjà écrit, générique — première fois qu'un package `packages/*` dépend directement d'un autre, sans souci Deno cette fois puisque ce package n'est consommé que par un script Node, jamais par une Edge Function). 20 tests unitaires verts.
- Ajouté `loadLemlistSyncEnv` (Supabase + `LEMLIST_API_KEY` uniquement).
- Écrit `scripts/sync-lemlist.ts` (`pnpm run sync-lemlist -- [--campaign-id <id>] [--since <date>]`) : résout le contact par email (même stratégie que le webhook Smartlead), déduplique via l'`_id` Lemlist stocké dans `interactions.metadata`, avance le statut si `shouldAdvanceStatus` l'autorise, renseigne `prospects.lemlist_contact_id` (colonne existante, jamais utilisée jusque-là).
- **Connexion réelle à l'API vérifiée** : `GET /campaigns` et `GET /activities` répondent tous deux `[]` avec la vraie clé (aucune campagne réelle, cohérent — pas de client pilote actif).
- **Bug réel trouvé par le test fonctionnel** (détail dans "Incertitudes techniques" ci-dessus) : `linkedinInterested`/`linkedinNotInterested` ne produisaient aucune interaction, rendant la logique de changement de statut inatteignable. Corrigé en les mappant vers une interaction `note` (même principe que `LEAD_CATEGORY_UPDATED` de Smartlead).
- **Test fonctionnel exécuté** : scénarios simulés (5 activités LinkedIn + 1 doublon + 1 type non-LinkedIn) contre le vrai Supabase, sur le prospect de test (contact `webhook-test-claude@example.com`) : 5 synchronisées, 1 dédupliquée, 1 ignorée (`emailsSent`), statut avancé correctement `meeting_booked` → `qualified` (via `linkedinInterested`), `lemlist_contact_id` renseigné. Aucune erreur.
- `pnpm typecheck`/`pnpm test` racine verts sur les 11 packages du monorepo.
- **S7 est maintenant intégralement terminé côté code** (les 3 items). Reste hors périmètre dev : configurer une vraie synchro régulière une fois un client pilote actif avec de vraies campagnes Lemlist.
- **Point de reprise** : prochaine tâche dans l'ordre du brief = S8 (tests complets end-to-end de la stack, correction de bugs, optimisation, V1 de la documentation technique interne), après validation de `TESTING.md` par Loïc.
- Loïc a validé S7 en intégralité ("tout me semble bon de mon côté, tu peux continuer"). Démarré S8, dernière étape de la Phase 1.
- Nettoyage avant de commencer : supprimé `supabase/functions/webhook-waalaxy/` (dossier vide, jamais suivi par git, reste du scaffold initial, obsolète depuis S7) et la ligne `deploy-client` de `package.json` (référençait un script jamais implémenté, échouait immédiatement — la gestion des clients reste un sujet Phase 2, cf. échange du 2026-07-31 ci-dessus).
- Vérifié les policies RLS (`pg_policies`) sur les 7 tables scopées `client_id` : les 3 familles de policies (`client_isolation`/`staff_full_access`/`client_user_access`) sont bien présentes partout, aucune manquante. Puis lancé `supabase db advisors --linked` (jamais fait jusqu'ici) — détail dans "Incertitudes techniques" ci-dessus : 23 policies + 2 fonctions + 13 index corrigés (migration `009_performance_and_security_hardening.sql`), appliquée après confirmation.
- **Test end-to-end complet** : créé un nouveau prospect (contact "Marie Dubois", entreprise PM MECANIQUE INDUSTRIE — dédupliquée avec l'entreprise de test existante, comportement correct) et l'a fait traverser toute la chaîne dans l'ordre réel : import Pharow → `enrich-pappers` → `score-prospect` (5/10) → `enrich-dropcontact` (email non trouvé) → `generate-messages` (a révélé le bug `max_tokens`, voir ci-dessus, corrigé puis rejoué avec succès) → vérifié dans le CRM (score, message, statut, tout cohérent) → "Marquer prêt pour Smartlead" → simulation webhook Smartlead (`EMAIL_SENT` puis `EMAIL_REPLY`, statut `ready` → `in_sequence` → `replied`) → simulation synchro Lemlist (`linkedinInterested`, statut `replied` → `qualified`) → vérifié dans le Dashboard (pipeline Kanban, interactions) → déclaré un deal réel via `/deals` → **le trigger d'attribution a utilisé le véritable historique d'interactions accumulé pendant ce test** (5 interactions réelles : email envoyé/répondu, LinkedIn envoyé/connecté, note) et calculé `attributed_to_dmh: true`, commission `1 800 €` (9% de `20 000 €`), `months_between: 0` — la première preuve de bout en bout que toutes les briques développées séparément fonctionnent bien ensemble sur un seul prospect réel.
- Écrit `README.md` (documentation technique V1) : architecture, cycle de vie d'un prospect, setup, tests, tableau des scripts/Edge Functions, état du déploiement, modèle RLS.
- `pnpm typecheck`/`pnpm test` racine verts sur l'ensemble du monorepo après tous les correctifs.
- **S8 est terminé.** Loïc a validé `TESTING.md`/`README.md` ("ça m'a l'air bon de mon côté").
- **Correction importante** : j'avais écrit "la Phase 1 est complète côté développement" — Loïc a eu raison de corriger, ce n'est pas exact. **4 lignes du tableau S1-S8 restent `⬜ à faire`**, indépendamment de S8 :
  - **S1** — Souscrire aux outils (Smartlead, Pharow, Dropcontact, Lemlist) : les clés API existent, mais la souscription commerciale réelle (paiement, compte actif) est une action business de Loïc, jamais faite.
  - **S2** — Tester l'enrichissement sur 50 entreprises tests : 1 seule entreprise réelle validée (PM MECANIQUE INDUSTRIE) ; passer à 50 dépend d'un vrai export Pharow avec un vrai client, inexistant à ce stade.
  - **S3** — Tester la génération de messages sur 100 prospects réels : 1 seul message réel validé ; même dépendance qu'au-dessus.
  - **S5** — Déployer sur Vercel avec custom domain (premier client) : dépend d'un vrai client pilote pour avoir un sous-domaine réel.
  Ces 4 items sont bloqués par des dépendances **business/externes** (souscrire un outil, avoir un client pilote réel), pas par du travail de dev restant — mais ça ne fait pas de la Phase 1 une phase "terminée". Formulation correcte : **tout le développement faisable sans dépendance business est fait** (tous les autres items S1-S8 sont ✅) ; les 4 ci-dessus attendent une action de Loïc (souscriptions) ou l'arrivée d'un vrai client pilote (tests à l'échelle, déploiement Vercel).
- **Point de reprise** : en attente de Loïc sur les 4 items ci-dessus (souscriptions aux outils en premier, ça débloquerait potentiellement S2/S3 si un vrai client/export Pharow suit). Pas de tâche de dev supplémentaire à enchaîner dans l'ordre du brief tant que ces dépendances ne sont pas levées.
- **2026-09-01** — Mergé la PR #1 (`feat/crm-redesign` → `master`, refonte UX/UI du CRM interne : Kanban, dashboard par sous-onglets, palette de commandes cmd+K, mode sombre, changement de mot de passe) après validation de Loïc, branche distante supprimée. Inclut la migration `010_add_crm_activity_tracking.sql` (auteur des interactions `interactions.created_by`, assignation `prospects.assigned_to`, historique des statuts `prospect_status_history` + trigger `log_prospect_status_change`, policy `staff_can_read_staff` élargie à toute l'équipe staff).
- **Blocage d'accès rencontré puis résolu** en appliquant cette migration : la CLI Supabase (compte précédemment loggé) n'avait plus les privilèges sur le projet réel `hkonylfpcstbvxswyxyh` (403 sur `link`/`db push`, ne voyait qu'un projet différent créé le jour même). Résolu avec un nouveau token d'accès personnel fourni par Loïc (`supabase login --token ...`). Migration `010` appliquée (`supabase db push`) et vérifiée réellement en base (`prospect_status_history`, `prospects.assigned_to`, `interactions.created_by` tous confirmés existants via une requête PostgREST jetable, pas seulement l'historique de migration de la CLI).
- **Point de reprise** : inchangé — toujours en attente de Loïc sur les 4 items business/externes ci-dessus. La refonte CRM mergée est un ajout hors du tableau S1-S8 (améliorations UX), ne débloque aucun de ces 4 items.

### 2026-09-02
- Loïc prépare une démo : lancé `apps/crm` (port 5174) et `apps/dashboard` (port 5173) en local contre le vrai Supabase (données de test déjà en place). Mot de passe du compte `client-test-claude@dmhassocies.com` oublié → réinitialisé via un script jetable (`auth.admin.updateUserById`, clé `service_role`, supprimé après usage).
- **Bug bloquant réel trouvé en testant la démo** : "infinite recursion detected in policy for relation staff_members" sur quasiment toutes les pages du Dashboard. Cause : la policy `staff_can_read_staff` réécrite par la migration `010_add_crm_activity_tracking.sql` (élargie pour lister toute l'équipe staff) contient `exists (select 1 from staff_members s2 where s2.id = auth.uid())` — une sous-requête sur `staff_members` évaluée **depuis la policy RLS de `staff_members` elle-même**, donc Postgres la réévalue à l'infini (erreur 42P17). Impact plus large que la seule table : toutes les policies `staff_full_access` (companies, contacts, prospects, interactions, messages_generated, deals, dmh_clients, prospect_status_history) font le même `exists (select 1 from staff_members where id = ...)`, donc lire n'importe quelle ligne sur n'importe laquelle de ces tables déclenchait la même récursion — cohérent avec "quasiment toutes les pages" cassées.
- Corrigé avec la migration `011_fix_staff_members_rls_recursion.sql` : fonction `is_staff_member(uuid)` en `security definer` (contourne RLS en interne, pattern standard Postgres pour ce cas de récursion), utilisée à la place de la sous-requête directe dans les 9 policies concernées (y compris celle de `staff_members` elle-même).
- Avant d'appliquer : la CLI Supabase avait de nouveau perdu l'accès au vrai projet (même blocage que le 2026-09-01, `403` sur `projects list`/`db push`, ne voyait qu'un autre projet). Résolu avec un nouveau token d'accès personnel fourni par Loïc (`supabase login --token sbp_...`).
- **Migration 011 appliquée** (`supabase db push`) et **validée fonctionnellement** : reconnexion avec le compte `client-test-claude@dmhassocies.com` + lecture de `prospects` via un script jetable (clé anon, supprimé après usage) → succès, plus d'erreur RLS.
- `pnpm typecheck`/`pnpm test` racine restés verts (aucune logique applicative touchée, uniquement du SQL).
- **Point de reprise** : bug de démo résolu, les deux apps sont utilisables. Prochaine demande de Loïc en cours de cadrage : un formulaire "Ajouter un prospect" dans le CRM pour saisir manuellement un contact identifié sur LinkedIn (au lieu du seul import CSV Pharow, pensé pour du volume) — pas encore construit.
- Loïc a précisé la demande : deux formulaires distincts dans `apps/crm` — "Ajouter une entreprise" et "Ajouter un contact" — plutôt qu'un seul formulaire combiné.
- Créé `apps/crm/src/lib/companyForm.ts`/`contactForm.ts` (validation pure, testée), `apps/crm/src/services/clients.ts`/`companies.ts`/`contacts.ts` (nouveaux wrappers Supabase, testés) et `createProspect` ajouté à `services/prospects.ts` (testé) — même point d'entrée que l'import Pharow (`packages/pharow/src/importer.ts` : entreprise → contact → prospect en statut `to_enrich`). `data_source: "manual"` (déjà prévu dans `@dmh/types`).
- UI : `AddCompanyDialog.tsx` et `AddContactDialog.tsx` (mêmes patterns Dialog/toast que `ChangePasswordDialog.tsx`/`Deals.tsx`), deux boutons "+ Entreprise"/"+ Contact" dans la barre d'outils de `ProspectsList.tsx`. Le dialogue contact compose le dialogue entreprise (bouton "+ Entreprise" imbriqué, client pré-rempli et verrouillé) pour créer l'entreprise sans quitter le formulaire — cas réel visé : un contact LinkedIn dont l'entreprise n'est pas encore en base. Créer un contact crée aussi le prospect associé, pour qu'il entre directement dans le pipeline d'enrichissement.
- 33 nouveaux tests unitaires (validation + services), `pnpm typecheck`/`pnpm test` racine verts sur l'ensemble du monorepo.
- **Bug bloquant réel trouvé en testant dans un vrai navigateur** (Playwright headless, outillage jetable comme les sessions précédentes) : créer un prospect en étant connecté avec un compte non-staff (testé avec `client-test-claude@dmhassocies.com`, autorisé par la policy RLS `client_user_access`) échouait avec une erreur 409 (`23503`, violation de la clé étrangère `prospect_status_history_changed_by_fkey`). Cause : le trigger `log_prospect_status_change()` (migration 010) insère toujours `changed_by = auth.uid()` en supposant que l'utilisateur courant est forcément dans `staff_members` — faux pour un compte client. Corrigé avec la migration `012_fix_status_history_changed_by_fk.sql` (ne renseigne `changed_by` que si l'UID est bien un membre staff, sinon `null` — cohérent avec la sémantique déjà documentée de cette colonne), appliquée et vérifiée (le flux complet passe maintenant, y compris avec un compte client).
- **Test fonctionnel exécuté** dans un vrai navigateur (compte `client-test-claude@dmhassocies.com`, faute d'avoir le mot de passe du compte staff réel de Loïc) : connexion, "Ajouter une entreprise" (avec ville/site web), "Ajouter un contact" (avec poste/URL LinkedIn) rattaché à cette entreprise → prospect visible dans la liste en statut "À enrichir", et le raccourci "+ Entreprise" imbriqué depuis le dialogue contact (client pré-rempli/verrouillé, nouvelle entreprise auto-sélectionnée au retour). Toutes les données de test (préfixées, avec un suffixe unique par run) supprimées après vérification via un script jetable. Aucune erreur console liée à la fonctionnalité (un warning JWT/horloge sans rapport, déjà géré silencieusement par un hook existant).
- **Point de reprise** : formulaires "Ajouter une entreprise"/"Ajouter un contact" terminés et validés. En attente d'une validation de Loïc en conditions réelles (compte staff) avant d'enchaîner sur une éventuelle suite.
- **Nouvelle demande, relayée par Loïc** : Delphine (collaboratrice DMH, future utilisatrice du CRM) veut un CRM plus proche de HubSpot/Brevo — objets **Contacts/Entreprises/Opportunités/Tâches** reliés entre eux. Décisions validées avec Loïc : traité maintenant (Phase 1 terminée), en **coexistence** avec le pipeline `prospects` existant (intact, rien ne change dedans), inspiration UX explicite Brevo/HubSpot. Plan détaillé écrit et validé (voir plan de session).
- Choix d'architecture actés : **Opportunités = extension de la table `deals` existante** (pas d'objet parallèle — HubSpot appelle aussi son objet pipeline "Deals", éviterait de fragmenter la logique d'attribution déjà construite) ; seule vraie relation N:N à modéliser = Contact↔Entreprise (nouvelle table `contact_companies`, `contacts.company_id` reste la référence "principale" utilisée par le pipeline) ; **Tâches** = nouvel objet, 3 liens optionnels (contact/entreprise/opportunité) plutôt qu'une relation polymorphe générique.
- **Migration `013_crm_objects_contacts_companies_opportunities_tasks.sql` appliquée** sur le vrai Supabase (confirmation explicite de Loïc) et vérifiée : table `contact_companies` (+ backfill depuis `contacts.company_id` existant, 10/10 contacts couverts), `deals.contact_id`/`company_id` ajoutés, table `tasks` (+ enum `task_status`), RLS des 3 nouvelles surfaces via `is_staff_member()` (le bon pattern post-migration 011, pas de nouvelle récursion), index de couverture sur toutes les nouvelles FK.
- `@dmh/types` étendu : `Deal` a maintenant `contact_id`/`company_id`, nouveaux types `ContactCompany`/`Task`/`TaskStatus`.
- **Couche backend CRM terminée** (`apps/crm/src`) : `services/contacts.ts`/`companies.ts` étendus (`listContacts`/`getContact`/`updateContact`, `listAllCompanies`/`getCompany`/`updateCompany`), nouveaux `services/contactCompanies.ts` (relations N:N), `services/tasks.ts`, extension de `services/deals.ts` (`createDeal`/`updateDealStatus` + jointures contact/entreprise), `lib/dealForm.ts`/`taskForm.ts` (validation pure). 176 tests unitaires côté `@dmh/crm` (dont tous les nouveaux), `pnpm typecheck`/`pnpm test` racine verts sur l'ensemble du monorepo.
- **Incident interne** : un premier essai de déléguer cette couche backend à un agent en tâche de fond a échoué silencieusement (0 appel d'outil réel, juste une réponse texte prétendant le travail "en cours") — repéré en vérifiant l'état réel des fichiers avant de faire confiance au rapport de l'agent, refait entièrement à la main. Aucun impact sur le résultat final, juste une perte de temps évitée en vérifiant plutôt qu'en supposant.
- **Point de reprise** : backend terminé et poussé. Reste à construire : les 4 pages CRM (Contacts, Entreprises, Opportunités avec bascule liste/Kanban, Tâches) + navigation + test fonctionnel en navigateur réel, dans cet ordre (voir plan de session pour le détail).
- **UI terminée** : `/contacts` (liste + fiche avec entreprises/opportunités/tâches liées, édition inline), `/companies` (liste + fiche symétrique + score IA + données Pappers), `/opportunities` (liste + bascule vue Kanban statique par statut négociation/gagné/perdu — pas de drag-and-drop, changement de statut par menu déroulant, choix assumé pour limiter le risque plutôt que de généraliser `KanbanColumn.tsx` qui est fortement couplé aux prospects), `/tasks` (liste triée par échéance, case de statut, lien optionnel contact/entreprise/opportunité). Navigation ajoutée dans `Header.tsx` (4 nouvelles entrées).
- **Simplification assumée** : pas de bouton "+ Nouveau contact" sur la fiche Entreprise (uniquement "Lier un contact existant") — `AddContactDialog` crée systématiquement un prospect en plus du contact (comportement voulu pour le cas LinkedIn), ce qui aurait mélangé les deux sémantiques. Créer un contact réellement nouveau reste possible uniquement via la page Prospects.
- **Bug réel trouvé et corrigé pendant la construction** (avant même le test navigateur) : `createContact` (service, utilisé par le formulaire "Ajouter un contact") n'insérait jamais la relation `contact_companies` correspondante — un contact créé après la migration 013 n'apparaissait dans aucune relation malgré son `company_id`, contrairement aux contacts backfillés. Corrigé en insérant aussi la relation `is_primary: true` à la création.
- **Test fonctionnel exécuté** dans un vrai navigateur (Playwright headless jetable, compte `client-test-claude@dmhassocies.com` faute du mot de passe staff réel) : création d'une entreprise depuis `/companies`, création d'un contact lié depuis `/` (flux existant), fiche contact confirmant la relation "Principale" puis ajout d'une 2e entreprise via le raccourci imbriqué, création d'une opportunité liée entreprise+contact depuis `/opportunities`, création d'une tâche liée à cette opportunité depuis `/tasks` puis marquée "Terminée", fiche entreprise confirmant les compteurs de relations. Données de test nettoyées après coup (script jetable).
- **2e bug bloquant réel trouvé par ce test** (même famille que celui de la migration 012) : `AddTaskDialog` posait `created_by = session.user.id` sans vérifier que l'utilisateur courant est bien staff — `tasks.created_by` référence `staff_members`, donc un compte client (autorisé par RLS `client_user_access` à créer une tâche) faisait échouer l'insert (409, FK violation). Corrigé côté client (`AddTaskDialog.tsx`) : `created_by` n'est renseigné que si l'uid courant figure dans la liste `staff_members` chargée par `useStaffMembers()`, sinon `null` — pas de trigger ici contrairement au cas `prospect_status_history`, donc correctif applicatif plutôt que SQL.
- `pnpm typecheck`/`pnpm test` racine verts sur l'ensemble du monorepo après cette étape.
- **Point de reprise** : le chantier "objets CRM génériques" (Contacts/Entreprises/Opportunités/Tâches) est fonctionnellement complet et validé en conditions réelles. En attente du retour de Delphine/Loïc en conditions réelles (compte staff) avant d'itérer. Dette technique assumée à date : pas de drag-and-drop sur le Kanban Opportunités, pas de création de contact directement depuis la fiche Entreprise, pas de fiche détail dédiée pour une Opportunité/Tâche (seulement liste/Kanban).
- **Retour UX de Loïc** : le filtre "Statuts" de `/` (Prospects) utilisait un `<select multiple>` natif — nécessite ctrl/cmd+clic pour sélectionner plusieurs statuts, pas intuitif, corrigé ("n'a pas de sens"). Remplacé par un dropdown à cases à cocher (réutilise `DropdownMenu` déjà utilisé pour "Colonnes"), bouton affichant "Tous les statuts" ou "N statut(s)". Vérifié en navigateur réel (le dropdown reste ouvert entre les clics, le libellé se met à jour). `pnpm typecheck`/`pnpm test` verts.
- Loïc a demandé une analyse de Brevo.com (recherche web) pour identifier les écarts restants vers un CRM du marché. Analyse livrée dans le chat : pipelines à étapes personnalisables, Kanban drag-and-drop, propriétés de deal (probabilité/date de clôture), tâches automatiques, RDV/calendrier, segments dynamiques, champs personnalisés, fusion de contacts, moteur d'automatisation, dashboards pipeline, permissions par rôle.
- Loïc a demandé le plan complet pour tout réaliser. Cadrage validé par lui avant d'écrire le plan : **champs personnalisés inclus** (revient sur la dette technique actée dans `TESTING.md`, décision explicite), **RDV/calendrier inclus** (mais bloqué tant que les comptes développeur Google/Microsoft n'existent pas), **moteur d'automatisation générique inclus** (pas seulement le cas ponctuel "tâche auto au changement d'étape"), **permissions par rôle explicitement hors périmètre**. Plan détaillé écrit et validé (8 étapes, S9-S16, tableau ajouté ci-dessus) — voir le plan de session pour le détail technique complet de chaque étape (schémas, fichiers, ordre des dépendances).
- **Point de reprise** : démarrage de S9 (champs personnalisés) à la suite de cette entrée de journal.
- **S9 terminé.** Migration `014_custom_fields.sql` appliquée (confirmation explicite) : `custom_field_definitions`/`custom_field_values` (colonne `value` en jsonb plutôt que 4 colonnes nullable par type), RLS standard via `is_staff_member()`. `@dmh/types` étendu (`CustomFieldDefinition`/`CustomFieldValue`/`CustomFieldEntityType`/`CustomFieldType`). Backend : `services/customFields.ts`, `lib/customFieldForm.ts` (slug de clé, validation, 11 tests). UI : `/settings/custom-fields` (création de définitions par type d'objet, onglets Contacts/Entreprises), composant réutilisable `CustomFieldsCard.tsx` ajouté sur `ContactDetail.tsx`/`CompanyDetail.tsx` (rendu dynamique texte/nombre/date/case à cocher/liste). Opportunités volontairement pas couvertes (pas encore de fiche détail, arrive en S10).
- **Test fonctionnel exécuté** en navigateur réel : création d'un champ texte + d'un champ liste pour Contacts, d'un champ case à cocher pour Entreprises, remplissage sur une fiche contact/entreprise de test, persistance vérifiée après rechargement de page pour les 3 types. Données de test nettoyées après coup.
- `pnpm typecheck`/`pnpm test` racine verts (201 tests côté `@dmh/crm`).
- **Point de reprise** : S9 fait. Prochaine étape dans l'ordre du plan = S10 (pipelines & étapes personnalisables + fiche détail Opportunité).
- **S10 terminé.** Migration `015_deal_pipelines.sql` appliquée (confirmation explicite, sujet sensible car modifie `calculate_attribution()` déjà validé en S6) : tables `pipelines`/`pipeline_stages`, `deals.pipeline_id`/`stage_id`/`probability`/`expected_close_date`, pipeline par défaut + 3 étapes (Négociation/Gagné/Perdu) créées et backfillées pour chaque client existant depuis leur `status` actuel. `calculate_attribution()` étendue pour dériver `status` des drapeaux `is_won`/`is_lost` de l'étape choisie *avant* sa logique existante (une seule fonction modifiée, pas de trigger empilé) — **aucune régression** : `scripts/test-attribution.ts` (8 scénarios) rejoué contre le vrai Supabase après la migration, tous verts, plus un test manuel du nouveau chemin (statut dérivé d'une étape "gagné").
- Migration `016_custom_fields_opportunities.sql` : étend `custom_field_definitions`/`custom_field_values` aux Opportunités (contraintes CHECK retrouvées et recréées dynamiquement via `pg_constraint`, plus sûr qu'un nom de contrainte deviné).
- Backend : `services/pipelines.ts` (nouveau — `listPipelines`/`listStages`/`createStage`/`updateStage`/`reorderStages`), `services/deals.ts` étendu (`getDeal`, `updateDeal`, `updateDealStage` remplace `updateDealStatus` — poser `status` directement sur un deal qui a déjà un `stage_id` serait de toute façon réécrit par le trigger au prochain update), `lib/pipelineForm.ts` (validation nom d'étape). **Bug réel trouvé et corrigé pendant l'écriture des tests** : `reorderStages` n'importait jamais les erreurs Supabase (`Promise.all` sans vérifier `.error` sur chaque résultat) — corrigé avant même le test navigateur.
- UI : nouvelle fiche `/opportunities/:id` (étape, montant, probabilité, date de clôture prévue, champs personnalisés, attribution/commission si gagnée, liens contact/entreprise). `/opportunities` : liste (lien vers la fiche, statut en lecture seule — le changement passe maintenant par l'étape), vue Kanban avec sélecteur de client (les étapes sont propres à chaque client) affichant les vraies colonnes + formulaire "+ Étape" inline. `AddDealDialog` propose désormais un sélecteur d'étape (pré-rempli sur la première étape non terminale).
- **Simplification assumée** : pas d'UI de gestion multi-pipelines (un seul pipeline par défaut par client, le schéma permettrait d'en créer d'autres) ; pas encore de drag-and-drop sur le Kanban (arrive en S11, changement d'étape par menu déroulant pour l'instant).
- **Test fonctionnel exécuté** en navigateur réel : création d'une opportunité avec étape par défaut "Négociation" pré-sélectionnée, fiche détail affichant l'étape/statut, vue Kanban montrant les 3 colonnes par défaut avec l'opportunité de test bien groupée, ajout d'une étape personnalisée (apparaît en 4ᵉ colonne), déplacement vers "Gagné" confirmé sur la fiche détail (statut "Gagnée" + section Attribution affichée). Données de test (opportunité, étape personnalisée, entreprise/contact) nettoyées après coup.
- `pnpm typecheck`/`pnpm test` racine verts (217 tests côté `@dmh/crm`).
- **Point de reprise** : S10 fait. Prochaine étape dans l'ordre du plan = S11 (Kanban drag-and-drop + propriétés de deal enrichies — `probability`/`expected_close_date` déjà en base depuis S10, reste l'indicateur de stagnation et le vrai drag-and-drop).
- **S11 terminé.** `probability`/`expected_close_date` déjà posés en base et exposés dans l'UI depuis S10 (fiche `/opportunities/:id`) — ne restait que l'indicateur de stagnation et le vrai drag-and-drop. `services/deals.ts` : `updateDealStage`/`updateDeal` posent désormais explicitement `updated_at` (aucun trigger générique dans ce schéma pour ça, même convention que le reste du projet) — nécessaire pour que l'indicateur de stagnation ait une date de référence fiable. Réutilise `lib/stagnation.ts` (`isStagnant`) tel quel, sans duplication.
- Nouveaux `components/OpportunityCard.tsx`/`OpportunityKanbanColumn.tsx` (dnd-kit), dupliqués depuis `ProspectCard.tsx`/`KanbanColumn.tsx` plutôt que généralisés — mêmes raisons qu'en S10 (types différents, éviter de risquer de casser le Kanban Prospects déjà validé). `/opportunities` (vue Kanban) : la sélection par menu déroulant devient un vrai glisser-déposer entre colonnes/étapes.
- **Bug évité avant même le test** : première ébauche de `OpportunityCard.tsx` copiait le pattern `backgroundLocation`/panneau latéral de `ProspectCard.tsx` sans qu'une route de superposition existe pour `/opportunities/:id` — aurait rendu le clic sur une carte silencieusement sans effet (changement d'URL sans navigation visible). Repéré en relisant le code avant de tester, corrigé en un lien simple (page pleine largeur, comme Contacts/Entreprises).
- **Test fonctionnel exécuté** en navigateur réel : création d'une opportunité liée à une entreprise de test, glisser-déposer réel (simulation souris bas niveau, pas l'API `dragTo` de Playwright — nécessaire pour dnd-kit) de la colonne "Négociation" vers "Gagné", carte bien déplacée, fiche détail confirmant le statut "Gagnée". Données de test nettoyées après coup.
- `pnpm typecheck`/`pnpm test` racine verts (217 tests côté `@dmh/crm`, inchangé — pas de nouvelle logique pure isolée cette fois, uniquement du rendu/interaction).
- **Point de reprise** : S11 fait. Prochaine étape dans l'ordre du plan = S12 (moteur d'automatisation générique — la plus grosse étape restante).

### 2026-09-03
- **S12 terminé.** Périmètre v1 volontairement réduit par rapport au plan initial (documenté explicitement dans la migration et ici, pas un oubli) :
  - Déclencheurs : `record_created` (INSERT) et `stage_changed` (changement de `deals.stage_id`, opportunités uniquement) — `field_updated` générique écarté (détection fiable d'un changement de champ arbitraire trop complexe/risquée pour une v1).
  - Actions : uniquement `create_task` — `update_field` écarté (aurait nécessité du SQL dynamique sur des noms de colonnes, risque d'injection). La contrainte CHECK ne liste que `create_task`, plus honnête qu'une valeur acceptée en base mais silencieusement ignorée à l'exécution.
  - Conditions combinées en ET uniquement (pas de groupes OU).
- Migration `017_automation_engine.sql` : tables `automation_rules`/`automation_conditions`/`automation_actions` (RLS standard via `is_staff_member()`), fonction `run_automation_rules()` (`security definer`) attachée via 4 triggers `AFTER INSERT [OR UPDATE]` sur `contacts`/`companies`/`deals`/`tasks`. Garde-fou `pg_trigger_depth() > 1` contre toute récursion (une action `create_task` insère dans `tasks`, qui a elle-même un trigger d'automatisation — sans ce garde-fou, une règle sur les tâches créant une tâche boucleraient à l'infini).
- **Bug bloquant réel trouvé dès le premier test** (`scripts/test-attribution.ts`, échec immédiat) : `run_automation_rules()` référençait `new.stage_id`/`old.stage_id` directement dans la requête SQL de sélection des règles — cette requête est partagée par les 4 triggers, or seul `deals` a cette colonne. PL/pgSQL résout les champs d'un RECORD au moment où l'instruction SQL les contenant s'exécute, sans court-circuit possible *à l'intérieur* d'une requête SQL (contrairement à du plpgsql pur) — donc même protégée par `entity_type = 'opportunity'` dans le même AND, la référence cassait **la création de n'importe quel contact ou entreprise**, migration à peine appliquée. Corrigé par la migration `018_fix_automation_stage_field_access.sql` : `v_stage_changed`/`v_stage_id_text` calculés via de simples affectations plpgsql protégées par un bloc `IF` dédié (une instruction plpgsql n'est résolue que si sa branche est réellement empruntée). Rejoué `scripts/test-attribution.ts` (8/8) après coup pour confirmer l'absence de régression sur l'attribution, plus un script de vérification dédié bout en bout (règle réelle créée, déclenchée, tâche auto-créée avec le bon titre/échéance, pas de doublon sur une mise à jour qui ne change pas l'étape).
- Backend : `@dmh/types` étendu (`AutomationRule`/`AutomationCondition`/`AutomationAction` + enums), `services/automations.ts` (nouveau), `lib/automationForm.ts` (validation : le déclencheur "changement d'étape" n'est proposé que pour les opportunités).
- UI : nouvelle page `/automations` — sélection du client, formulaire de création (nom, type d'objet, déclencheur, étape cible si pertinent, conditions dynamiques, action "créer une tâche"), liste des règles existantes avec case active/inactive et suppression. **Simplification assumée** : pas d'édition des conditions/actions d'une règle existante après création (seulement activer/désactiver/supprimer) — cohérent avec le volume d'usage attendu pour une v1.
- **Test fonctionnel exécuté** en navigateur réel : création d'une règle complète (opportunité → étape "Gagné", condition `deal_value > 500`, action "créer une tâche" avec échéance) via le formulaire, création d'une opportunité de test (montant 1200 €, donc condition remplie), glisser-déposer vers "Gagné", tâche automatique bien apparue dans `/tasks` avec le bon titre, suppression de la règle confirmée dans la liste. Données de test nettoyées après coup.
- `pnpm typecheck`/`pnpm test` racine verts (232 tests côté `@dmh/crm`).
- **Point de reprise** : S12 fait — c'était la plus grosse étape restante du plan. Prochaine étape dans l'ordre = S13 (segments dynamiques sur Contacts, réutilise le composant de conditions construit ici).
- **S13 terminé.** Migration `019_contact_segments.sql` (table isolée, aucun trigger sur l'existant, RLS standard) — la moins risquée du plan.
- Extrait `components/ConditionRowsEditor.tsx` depuis `Automations.tsx` (S12) pour le réutiliser tel quel dans `Contacts.tsx`, exactement comme prévu au plan. `lib/segmentEvaluator.ts` (`matchesSegment`, pure, 8 tests) réimplémente en TS la même logique de comparaison que le trigger SQL (S12) — nécessaire car l'évaluation se fait côté client sur des objets JS, pas dans Postgres.
- Backend : `@dmh/types` (`ContactSegment`/`SegmentRule`), `services/contactSegments.ts`, `hooks/useContactSegments.ts`.
- UI : `/contacts` gagne un filtre "Client DMH" (n'existait pas jusqu'ici — la liste montrait tous les contacts de tous les clients mélangés) et, une fois un client choisi, un sélecteur de segment + "+ Nouveau segment" (réutilise `ConditionRowsEditor`). Évaluation des règles à la volée côté client sur les contacts déjà chargés (pas de requête serveur dédiée par segment), cohérent avec le volume actuel.
- **Test fonctionnel exécuté** en navigateur réel : création d'une entreprise + 2 contacts (un "Directeur Commercial", un "Assistante"), création d'un segment avec la condition `job_title contains "Directeur"`, sélection du segment → seul le bon contact reste affiché, retour à "Tous les contacts" → les deux réapparaissent. Données de test nettoyées après coup.
- `pnpm typecheck`/`pnpm test` racine verts (245 tests côté `@dmh/crm`).
- **Point de reprise** : S13 fait. Prochaine étape dans l'ordre du plan = S14 (fusion/dédoublonnage de contacts).
- **S14 terminé.** Fonction Postgres `merge_contacts(keep_id, remove_id)` (`security definer`, migration `020_merge_contacts.sql`) plutôt qu'une séquence d'updates séparés depuis le navigateur — garantit l'atomicité. Réassigne `contact_companies`/`custom_field_values` (avec dédoublonnage explicite sur leurs contraintes uniques avant réassignation, sinon violation de contrainte) puis `deals`/`tasks`/`prospects.contact_id` (pas de contrainte unique, réassignation directe), supprime le contact fusionné. Garde-fou : refuse de fusionner deux contacts de clients DMH différents.
- **Bug réel trouvé en testant la fonction avec un script jetable** (avant même l'UI) : la vérification `is_staff_member(auth.uid())` ne prenait pas en compte le rôle `service_role` (`auth.uid()` vaut `null` pour ce rôle) — incohérent avec le reste du schéma où chaque contrôle d'accès autorise explicitement `service_role` en plus. Corrigé par la migration `021_merge_contacts_allow_service_role.sql`.
- Backend : `services/mergeContacts.ts` (wrapper `.rpc()`). UI sur `/contacts/:id` : carte "Fusionner avec un autre contact" (liste des contacts du même client, confirmation en 2 étapes avant l'appel — action destructive).
- **Test fonctionnel exécuté** en deux temps : (1) script jetable contre le vrai Supabase confirmant dédoublonnage correct des relations + réassignation deals/tasks + rejet cross-client ; (2) navigateur réel — la première tentative avec le compte client de test a été **correctement rejetée** (`merge_contacts` est réservée au staff, comportement voulu, pas un bug), donc un compte staff jetable a été créé spécifiquement pour valider le flux UI complet (sélection du doublon → confirmation → fusion → redirection vers `/contacts` → contact fusionné absent de la liste). Compte staff jetable et données de test supprimés après coup.
- `pnpm typecheck`/`pnpm test` racine verts (247 tests côté `@dmh/crm`).
- **Point de reprise** : S14 fait. Reste S15 (dashboards pipeline Opportunités/Tâches) et S16 (RDV/calendrier — **bloqué** tant que les comptes développeur Google/Microsoft n'existent pas).
- **S15 terminé.** Aucune migration nécessaire (données déjà en base depuis S9-S14) — l'étape la plus légère du plan. Nouvel onglet "Opportunités & Tâches" dans `Dashboard.tsx` (`apps/crm`, le dashboard interne staff multi-clients) : pipeline par statut (négociation/gagné/perdu, nombre + valeur cumulée) avec taux de conversion, tâches par statut (réutilise `StatusBarList`, déjà construit pour les statuts prospects), liste des tâches en retard.
- `lib/opportunityStats.ts`/`lib/taskStats.ts` (logique pure, testée, même esprit que `lib/dashboardStats.ts`). `StatusCount.status` élargi de `ProspectStatus` à `string` (changement mineur rétrocompatible) pour que `StatusBarList` accepte aussi des statuts de tâches.
- **Réutilisation trouvée en cours de route** : `hooks/useDeals.ts` (existant depuis S8) utilise déjà `services/deals.ts` — le même fichier étendu tout au long de S10-S11 — donc `deals` disponible dans `Dashboard.tsx` a déjà tous les champs nécessaires (`status`, `deal_value`). Pas eu besoin d'un second hook/fetch dédié aux opportunités pour cette vue.
- **Test fonctionnel exécuté** en navigateur réel : onglet "Opportunités & Tâches" affiche les 3 lignes de statut (négociation/gagné/perdu) avec leur valeur, le taux de conversion, la répartition des tâches par statut, la liste des tâches en retard — aucune erreur console.
- `pnpm typecheck`/`pnpm test` racine verts (256 tests côté `@dmh/crm`).
- **Point de reprise** : S9 à S15 sont tous terminés et validés. Seul S16 (RDV/synchro calendrier) reste — **bloqué** tant que Loïc n'a pas créé les comptes développeur Google Cloud (Calendar API) et Microsoft Entra (Graph API/Outlook). Rien à faire côté dev tant que ces comptes n'existent pas.
- Loïc a créé les comptes développeur Google Cloud et Microsoft Entra, fourni les 5 identifiants (`GOOGLE_CALENDAR_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET/TENANT_ID`), confirmés présents dans `.env.local`. Feu vert pour S16, périmètre complet retenu (page publique de prise de RDV incluse, pas seulement la connexion calendrier).
- **Découverte importante avant de commencer** : `supabase functions list` a révélé qu'**aucune Edge Function n'avait jamais été déployée** sur le vrai projet Supabase de tout ce projet — toutes testées jusqu'ici uniquement en local via Deno CLI (cf. tout le journal précédent). S16 est donc la première fois qu'un vrai déploiement est nécessaire, un vrai callback OAuth public devant être joignable par Google/Microsoft.
- Nouveau package `packages/calendar` (`@dmh/calendar`) : `availability.ts` (`computeAvailableSlots`, pure, déplacé depuis un brouillon initial dans `apps/crm`), `googleCalendar.ts`/`microsoftCalendar.ts` (construction des URLs d'autorisation OAuth, échange/rafraîchissement de token, appels Calendar API/Graph API, mapping des événements bruts en intervalles occupés — parties pures testées avec un `fetchImpl` injecté, même convention que `packages/pappers`). 17 tests.
- `@dmh/config` étendu : `GOOGLE_CALENDAR_CLIENT_ID`/`MICROSOFT_CLIENT_ID`/`MICROSOFT_TENANT_ID` publics (safe à exposer, ce sont des identifiants publics par nature en OAuth) ; `GOOGLE_CALENDAR_CLIENT_SECRET`/`MICROSOFT_CLIENT_SECRET` secrets, nouveau loader scopé `loadCalendarFunctionEnv`.
- Migration `022_calendar_meetings.sql` : `meetings` (RLS standard) et `staff_calendar_connections` (tokens OAuth — **aucun accès direct depuis le navigateur**, policy `service_role` uniquement ; le staff consulte son statut via `get_my_calendar_connections()` `security definer`, qui ne renvoie jamais les colonnes de tokens — même famille de pattern que `is_staff_member()`/`merge_contacts()`). Limite assumée : pas de chiffrement applicatif des tokens au-delà du chiffrement au repos de Supabase, et `state` OAuth non signé (juste le `staff_id` en clair) — acceptable pour une v1 à quelques utilisateurs internes de confiance.
- 4 Edge Functions déployées pour la première fois sur le vrai Supabase (`--no-verify-jwt`, appelées par Google/Microsoft ou un prospect anonyme, jamais par un utilisateur Supabase authentifié) : `google-calendar-oauth-callback`, `microsoft-calendar-oauth-callback` (échangent le code contre des tokens, upsert dans `staff_calendar_connections`, page HTML de confirmation — pas de redirection automatique vers le CRM, qui n'est pas déployé publiquement), `calendar-freebusy` (calcule les créneaux libres des 14 prochains jours via `computeAvailableSlots`), `calendar-book-meeting` (re-vérifie que le créneau est encore libre — garde-fou anti-concurrence — crée l'événement chez le fournisseur, insère dans `meetings`).
- Secrets Supabase poussés via `supabase secrets set --env-file .env.local` (toutes les clés de `.env.local`, pas seulement les 5 du calendrier — sans conséquence : les secrets Supabase sont par nature globaux au projet, pas scopés par fonction, donc le résultat aurait été identique en ne poussant que les 5).
- UI : `/settings/calendar` (connecter/déconnecter Google et Outlook, lien de réservation copiable par fournisseur) et `/book/:token` (page **publique**, non authentifiée, hors `ProtectedLayout` — affiche les créneaux réels groupés par jour via `lib/groupSlotsByDay.ts`, formulaire de réservation). Limite UX assumée : le lien de réservation ne porte que le membre staff, pas le client DMH concerné — il faut ajouter manuellement `?client=<id>` avant de le partager (pas de sélecteur de client dans l'UI de partage en v1).
- **Test réalisé, avec une vraie limite assumée** : je ne peux pas simuler un vrai clic de consentement sur l'écran Google/Microsoft (interaction humaine sur un service tiers). Tout le reste a été vérifié contre les fonctions réellement déployées : tests de fumée en HTTP direct (paramètres manquants/invalides → erreurs propres, pas de crash 500, confirmant que les variables d'environnement et l'accès `service_role` fonctionnent), puis un test navigateur bout en bout confirmant que `/settings/calendar` génère des liens d'autorisation corrects (bon `client_id`, bon `redirect_uri` vers les fonctions déployées) et que `/book/:token` appelle bien la vraie fonction déployée et affiche sa réponse.
- `pnpm typecheck`/`pnpm test` racine verts (265 tests côté `@dmh/crm`, 17 côté `@dmh/calendar`, 12 packages au total).
- **Point de reprise — action Loïc nécessaire pour clore S16** : dans le Google Cloud Console, ajouter l'URI de redirection `https://hkonylfpcstbvxswyxyh.supabase.co/functions/v1/google-calendar-oauth-callback` aux identifiants OAuth ; dans Azure/Entra, ajouter `https://hkonylfpcstbvxswyxyh.supabase.co/functions/v1/microsoft-calendar-oauth-callback`. Puis se connecter sur `/settings/calendar` et cliquer "Connecter Google Calendar"/"Connecter Outlook" une fois chacun, pour valider le seul maillon que je ne peux pas tester moi-même. **La roadmap S9-S16 est maintenant intégralement terminée côté développement.**
- **Premier vrai test de Loïc** : écran de consentement Google OAuth bloqué par une "Configuration incomplète" (page "Branding" de l'écran de consentement pas remplie — nom de l'app/email d'assistance/coordonnées développeur manquants) — corrigé côté Google Cloud Console par Loïc. **Connexion Google réussie** : `loic.rob@gmail.com` bien enregistré dans `staff_calendar_connections`, confirmant que tout le circuit OAuth (autorisation → callback → échange de code → stockage token) fonctionne réellement de bout en bout, pas seulement en test de fumée.
- **Bug réel côté configuration Microsoft** (pas un bug de code) : `AADSTS7000215: Invalid client secret provided` — Loïc avait copié le "Secret ID" (identifiant technique du secret, pas sensible) au lieu de la "Value" (la vraie clé, affichée une seule fois à la création) dans Azure Portal. Guidé pour recréer un secret et récupérer la bonne valeur — en attente de la clé corrigée pour repousser `MICROSOFT_CLIENT_SECRET`.
- **Retour de Loïc après connexion Google réussie** : attente de voir le calendrier connecté + une liste des événements/tâches à venir directement dans le CRM — pas prévu au périmètre initial de S16 (qui ne couvrait que la connexion + le lien de réservation), ajouté maintenant.
- Nouvelle Edge Function **`calendar-my-events`** — différente des 4 précédentes : appelée par un utilisateur Supabase **authentifié** (JWT vérifié par la plateforme, déployée SANS `--no-verify-jwt`), l'identité du staff vient du JWT lui-même (jamais d'un paramètre fourni par l'appelant, pour ne jamais pouvoir demander les événements d'un autre membre staff). Réutilise `_shared/calendarConnection.ts`, généralisé avec `resolveConnectionsByStaffId` (en plus de `resolveConnectionByBookingToken` déjà existant) — la logique de rafraîchissement de token est factorisée entre les deux plutôt que dupliquée.
- Nouvelles fonctions pures `mapGoogleEventsToSummaries`/`mapMicrosoftEventsToSummaries` (`@dmh/calendar`, titre + horaires d'un événement, testées). **Bug de conception évité avant même de tester** : une première tentative factorisait le type `EventSummary` dans un fichier `types.ts` partagé entre `googleCalendar.ts`/`microsoftCalendar.ts` — cassait la résolution Deno (`deno check` a immédiatement échoué : "Cannot find module .../types.js"), exactement la même limite déjà rencontrée et documentée pour `packages/scoring` en S7 (un import interne entre deux fichiers d'un même package `packages/*` ne résout pas sous Deno). Corrigé en dupliquant structurellement le petit type plutôt qu'en le partageant, comme la fois précédente.
- **Bug réel trouvé en écrivant les tests** (avant déploiement) : `services/calendarEvents.ts` importait `calendarOAuthConfig` depuis `lib/supabase.ts` au niveau module — casse la convention déjà établie partout ailleurs (les services ne dépendent jamais du singleton Supabase concret, seulement de paramètres injectés), et fait planter `loadEnv()` à l'import dans l'environnement de test (Vitest n'a pas les `import.meta.env.*` que Vite injecte normalement). Corrigé en passant `functionsBaseUrl` en paramètre (comme `fetchImpl` déjà) plutôt qu'en l'import direct — seul le hook (`useUpcomingCalendarEvents.ts`) importe le singleton, cohérent avec le reste du CRM.
- UI : `/settings/calendar` affiche désormais une carte "Prochains événements (14 prochains jours)" une fois au moins un fournisseur connecté, agrégeant Google + Microsoft, triée chronologiquement.
- Fonction déployée (avec vérification JWT active, contrairement aux 4 précédentes) et testée par un test de fumée confirmant le rejet correct d'une requête sans authentification (401 posé par la plateforme elle-même, avant même que le code de la fonction ne s'exécute).
- `pnpm typecheck`/`pnpm test` racine verts (267 tests côté `@dmh/crm`, 21 côté `@dmh/calendar`).
- **Secret Microsoft corrigé par Loïc** (avait collé le "Secret ID" au lieu de la "Value" dans Azure Portal — colonnes faciles à confondre) : nouveau secret généré, repoussé vers les secrets Supabase (`supabase secrets set`), **connexion Outlook confirmée réussie par Loïc**. Les 2 fournisseurs (Google + Microsoft) sont donc maintenant validés en conditions réelles.
- **Retour de Loïc après connexion Microsoft réussie** : ne voit toujours pas la liste "Prochains événements" sur `/settings/calendar`, et signale que la page de callback OAuth (hébergée sur l'URL brute de la Edge Function) reste inutilement affichée après connexion au lieu de revenir sur le CRM.
- **Cause probable identifiée** : les callbacks `google-calendar-oauth-callback`/`microsoft-calendar-oauth-callback` n'ont jamais redirigé vers le CRM (choix d'origine documenté dans leur commentaire d'en-tête, à l'époque où l'app n'était pas testée en continu) — le staff devait revenir manuellement sur un onglet CRM déjà ouvert, potentiellement resté sur un état JS obsolète (session/hooks montés avant la connexion), ce qui peut expliquer que la nouvelle carte "Prochains événements" ne se réaffiche pas sans un rechargement complet de la page.
- **Correctif** : le `state` OAuth porte désormais `<staff_id>::<origine du CRM>` (calculée côté client via `window.location.origin`, cf. `lib/calendarOAuthLinks.ts`) au lieu du seul `staff_id`. Les deux Edge Functions de callback redirigent maintenant (302) vers `/settings/calendar?calendar_connected=<provider>` (ou `?calendar_error=1`) sur cette origine plutôt que d'afficher leur page HTML statique — ce qui garantit une navigation fraîche (nouvelle page chargée, pas d'état React obsolète) ET répond à la demande de ne plus garder l'URL de la fonction affichée. Repli sur l'ancienne page HTML statique si l'origine est absente/invalide (compatibilité). `CalendarSettings.tsx` lit ces paramètres au montage, affiche un toast de confirmation/échec, puis nettoie l'URL (`history.replaceState`).
- Vérifié : `pnpm --filter @dmh/crm typecheck`/`test` verts (267 tests, dont le test de `calendarOAuthLinks` mis à jour pour le nouveau format de `state`), `deno check` propre sur les deux fonctions modifiées.
- Les 2 fonctions de callback redéployées (confirmé avec Loïc). Connexion Microsoft ensuite corrigée et confirmée réussie par Loïc (secret Azure régénéré, colonne "Value" cette fois) — **les 2 fournisseurs sont validés en conditions réelles**.
- **Nouveau bug réel signalé par Loïc** : `calendar-my-events` renvoyait "NetworkError when attempting to fetch resource" côté navigateur. **Cause** : c'était la seule fonction du projet déployée avec la vérification JWT au niveau plateforme active (`verify_jwt: true`, contrairement aux 4 autres) — le navigateur envoie un preflight CORS (`OPTIONS`, sans en-tête d'autorisation) avant tout appel avec un en-tête `Authorization` personnalisé, et la plateforme rejetait ce preflight avant même d'atteindre le code de la fonction (donc avant que les en-têtes CORS, absents au départ, n'aient pu s'appliquer). Invisible avec `curl` (pas de preflight), d'où le test de fumée initial faussement rassurant.
- **Corrigé en 2 temps** : (1) ajout des en-têtes CORS + gestion explicite de `OPTIONS` dans le code, comme les 4 autres fonctions calendrier ; (2) redéploiement avec `--no-verify-jwt` pour désactiver la vérification JWT *plateforme* — la fonction garde sa propre vérification (`auth.getUser()` sur le token transmis), donc aucune régression de sécurité, juste un déplacement du contrôle du niveau plateforme vers le niveau applicatif (nécessaire pour tout endpoint authentifié appelé en CORS depuis un navigateur). Vérifié par test réel : preflight `OPTIONS` → 204 avec bons en-têtes CORS, `GET` sans token → toujours 401 (`"Non authentifié"`, posé par le code cette fois).
- **Confirmé par Loïc** : la liste "Prochains événements" s'affiche correctement après rechargement. **S16 est maintenant intégralement terminé et validé en conditions réelles** (Google + Microsoft connectés, redirection automatique, liste d'événements) — plus aucun point de reprise ouvert sur ce chantier. La roadmap S9-S16 (parité Brevo/HubSpot) est donc entièrement livrée, testée et déployée.
- **S17 (nouvelle demande de Loïc, hors roadmap initiale)** : "afficher un vrai calendrier avec les tâches marquées dessus, ainsi que la possibilité de modifier une tâche" — jusqu'ici `/tasks` n'avait qu'une vue tableau, et seul le statut d'une tâche était modifiable après création (pas le titre/l'échéance/les liens). Aucune migration nécessaire (aucune évolution de schéma, uniquement `tasks` déjà existante).
- `lib/taskCalendar.ts` (pur, testé — 7 tests) : `buildMonthGrid` construit une grille de 6 semaines pleines (lundi en premier, jours des mois adjacents inclus pour compléter les semaines de bordure) ; `groupTasksByDueDate` regroupe les tâches par échéance.
- `services/tasks.ts` : nouvelle fonction `updateTask` (patch partiel — titre, description, échéance, assignation, contact/entreprise/opportunité liés, statut) en complément de `updateTaskStatus` (conservée telle quelle, toujours utilisée par le sélecteur inline de la vue liste). `hooks/useTasks.ts` étendu avec `update`.
- UI : `components/TaskCalendarView.tsx` (grille mensuelle, navigation mois précédent/suivant/aujourd'hui, tâches affichées en badges colorés par statut, clic sur une tâche = édition), `components/EditTaskDialog.tsx` (formulaire complet pré-rempli, même structure que `AddTaskDialog` mais sans sélection de client — dupliqué plutôt que fusionné avec `AddTaskDialog`, cohérent avec la convention déjà suivie pour `OpportunityCard`/`ProspectCard`). `pages/Tasks.tsx` gagne un bascule "Liste"/"Calendrier" (même pattern que `/opportunities`) ; le titre d'une tâche dans la vue liste est aussi devenu cliquable pour ouvrir l'édition.
- **Découverte annexe, non bloquante pour cette tâche** : `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local` est rejetée par l'API REST (`401 Invalid API key`) alors que `SUPABASE_ANON_KEY` du même fichier fonctionne — vérifié par appel direct à l'API. La clé service_role a donc probablement été régénérée côté dashboard Supabase à un moment sans mise à jour de `.env.local` (les Edge Functions n'ont pas été affectées : Supabase leur fournit ses propres clés `SUPABASE_*` internes, indépendamment de ce qui est poussé via `secrets set`, qui les ignore explicitement). Sans impact sur l'app ou les fonctions déployées, mais bloque tout script d'admin local utilisant cette clé (ex. création de comptes de test jetables) — **à corriger quand un script en aura besoin** : Loïc peut récupérer la valeur à jour dans Supabase Dashboard → Project Settings → API Keys → `service_role`.
- Vérifié : `pnpm --filter @dmh/crm typecheck`/`test` verts (276 tests, +9 vs avant), `pnpm typecheck`/`pnpm test` racine verts (11 packages). Pas de test navigateur réel exécuté par Claude cette fois (bloqué par la clé service_role périmée ci-dessus, qui empêchait de créer un compte de test jetable) — **à valider par Loïc en conditions réelles**.
- **Point de reprise** : demander à Loïc de tester `/tasks` → bascule "Calendrier", vérifier qu'une tâche avec échéance apparaît au bon jour, cliquer dessus, modifier un champ, enregistrer, confirmer la mise à jour.
- **Malentendu clarifié** : Loïc ne parlait pas du calendrier des tâches internes (S17 ci-dessus) mais de la page **"Mon calendrier"** (`/settings/calendar`, Google/Outlook) — il voulait un vrai calendrier visuel sur SES événements externes, avec la possibilité de les modifier (édition avec écriture retour chez Google/Microsoft). Confirmé explicitement avant de coder, pour ne pas se tromper une deuxième fois.
- **S18** : `lib/monthGrid.ts` extrait de `taskCalendar.ts` (grille générique, réutilisée telle quelle par le nouveau calendrier d'événements — `taskCalendar.ts` ré-exporte `buildMonthGrid` pour ne pas casser son import existant). `lib/calendarEventGrid.ts` (regroupement des événements par jour **local** — important : l'API renvoie de l'UTC, le regroupement doit utiliser le fuseau du navigateur sinon un événement de 23h peut apparaître le mauvais jour). `lib/datetimeLocal.ts` (conversions ISO ↔ `<input type="datetime-local">`, pures, testées).
- `@dmh/calendar` étendu : `id` ajouté à `GoogleCalendarEvent`/`MicrosoftCalendarEvent`/`EventSummary` (nécessaire pour cibler l'événement à modifier — absent jusqu'ici, la liste "Prochains événements" n'affichait que titre/horaires) ; nouvelles fonctions `updateGoogleEvent`/`updateMicrosoftEvent` (PATCH, ne touchent que les champs fournis).
- `_shared/calendarConnection.ts` étendu avec `resolveConnectionByStaffIdAndProvider` (résout la connexion d'UN fournisseur précis, complémentaire à `resolveConnectionsByStaffId`).
- Nouvelle Edge Function **`calendar-update-event`** (POST, authentifiée) : reçoit `{provider, eventId, title?, startIso?, endIso?}`, valide avec zod, résout la connexion du staff appelant pour ce fournisseur, appelle Google/Microsoft. **En-têtes CORS + gestion `OPTIONS` codés dès le départ, déployée directement avec `--no-verify-jwt`** — la leçon du bug `calendar-my-events` (`verify_jwt` plateforme qui bloque le preflight) appliquée immédiatement plutôt que découverte à nouveau.
- UI : `components/CalendarEventGrid.tsx` (grille mensuelle réutilisant `buildMonthGrid`, badges colorés par fournisseur), `components/EditCalendarEventDialog.tsx` (titre + horaires en `datetime-local`, validation fin > début). `pages/CalendarSettings.tsx` : la carte "Prochains événements" (liste texte) est **remplacée** par la grille ; `hooks/useUpcomingCalendarEvents.ts` étendu avec `updateEvent`/`reload`. Conteneur élargi (`max-w-2xl` → `max-w-4xl`) pour laisser respirer la grille.
- Vérifié : `pnpm --filter @dmh/calendar typecheck`/`test` verts (27 tests, +6), `pnpm --filter @dmh/crm typecheck`/`test` verts (284 tests, +6), `deno check` propre sur les 6 fonctions calendrier (les 5 existantes + la nouvelle).
- **Point de reprise** : déploiement de `calendar-update-event` sur le vrai projet Supabase nécessaire avant que Loïc puisse tester (confirmation à demander avant le `functions deploy`, comme pour toute action sur un système distant). Puis lui demander de recharger `/settings/calendar`, vérifier que la grille affiche ses événements Google/Outlook au bon jour, cliquer sur un événement, modifier le titre ou l'horaire, enregistrer, et confirmer que le changement apparaît bien dans son vrai Google Calendar / Outlook.
- **Confirmé par Loïc** : le calendrier fonctionne (grille affichée, redirection OK, événements Google/Outlook visibles).

### 2026-09-03 (suite) — S19 à S22, planifiés en mode Plan puis exécutés

Loïc a demandé 4 choses en une fois après validation de S18 : (1) créer un
événement + le lier à un contact/entreprise/opportunité, (2) une
fonctionnalité de "liste" — recherchée dans tout le repo/PROGRESS.md/le
code, introuvable, ni construite ni planifiée ; confirmé avec Loïc qu'il
s'agit d'une **liste statique de contacts** (différent des segments,
dynamiques), (3) un rappel des tâches du jour **toujours visible dans
l'en-tête** (pas caché dans un onglet Dashboard), (4) compacter les blocs
de connexion calendrier (trop de place à l'écran une fois connecté).
Passage en mode Plan (3 agents Explore en parallèle sur le schéma
`meetings`/le flux `calendar-book-meeting`, la recherche de "liste" dans
le repo, et les patterns Dashboard/Header) avant d'écrire un plan détaillé
(`bubbly-watching-crescent.md`), approuvé par Loïc.

**S19 — créer/lier un événement** :
- Constat clé de l'exploration : la table `meetings` (migration 022,
  jusqu'ici écrite seulement par `calendar-book-meeting`, jamais lue par
  le CRM) avait déjà toutes les colonnes nécessaires
  (`contact_id`/`company_id`/`deal_id`/`external_calendar_provider`/
  `external_event_id`) — pas de refonte de schéma nécessaire, juste
  l'exploiter.
- Migration `023_meetings_unique_external_event.sql` : index unique
  partiel `(external_calendar_provider, external_event_id) where
  external_event_id is not null`, nécessaire pour un upsert propre lors
  de la liaison d'un événement déjà existant.
- Nouvelle Edge Function **`calendar-create-event`** (même structure que
  `calendar-update-event` : CORS + `OPTIONS` gérés dès le départ,
  `--no-verify-jwt` prévu au déploiement dès l'écriture — la leçon du bug
  `calendar-my-events` appliquée directement, pas redécouverte). Ne crée
  que l'événement côté fournisseur externe ; contrairement à
  `calendar-book-meeting` (accès anonyme, doit passer par service_role),
  l'insertion de la ligne `meetings` se fait **côté client** — RLS
  `staff_full_access` l'autorise déjà pour un membre staff authentifié.
- `services/meetings.ts` (nouveau) : `createMeeting`, `upsertMeetingLink`
  (upsert sur `(provider, external_event_id)`), `getMeetingLink`,
  `listMeetings`. `hooks/useMeetings.ts` + `hooks/useUpcomingCalendarEvents.ts`
  étendu avec `addEvent` (orchestration : crée côté externe puis insère
  `meetings`).
- UI : `components/AddCalendarEventDialog.tsx` (nouveau, pattern cascade
  façon `AddDealDialog` : client → contact/entreprise/opportunité filtrés
  côté client), `EditCalendarEventDialog.tsx` étendu avec une section
  "Lier à" (pré-remplie via `getMeetingLink` à l'ouverture si un lien
  existe déjà), `components/MeetingsCard.tsx` (carte "Rendez-vous"
  réutilisée sur `ContactDetail.tsx`/`CompanyDetail.tsx`/
  `OpportunityDetail.tsx` — ces fiches n'affichaient jusqu'ici aucun
  rendez-vous, lecture seule, l'édition reste sur le calendrier pour ne
  pas dupliquer la logique de synchro).

**S20 — listes statiques de contacts** : migration `024_contact_lists.sql`
(`contact_lists` + `contact_list_members`, RLS identique au template
`contact_segments` — `client_id` dupliqué sur la table de jointure comme
`contact_companies`, migration 013, pour garder la RLS à 3 politiques
simples plutôt qu'une sous-requête jointe). `ContactList` ajouté à
`@dmh/types`. `services/contactLists.ts` + `hooks/useContactLists.ts`
(même structure que segments). UI sur `/contacts` : sélecteur "Liste" à
côté du sélecteur "Segment" existant, "+ Nouvelle liste", **sélection
multiple de lignes** (état local `Set<string>`, pas de nouvelle
dépendance react-table pour un simple besoin de sélection) + barre
d'action "N sélectionné(s) → Ajouter à une liste". `ContactDetail.tsx` :
action "Ajouter à une liste" pour un contact à la fois.

**S21 — rappel des tâches du jour** : `lib/taskStats.ts` étendu avec
`computeTasksDueToday` (même forme que `computeOverdueTasks` déjà
existant, égalité avec la date du jour au lieu de `<`). `Header.tsx` :
nouveau bouton cloche (même style que le bouton de thème existant) avec
badge numérique si des tâches sont dues aujourd'hui, `DropdownMenu` (déjà
utilisé pour le menu utilisateur) listant les tâches du jour + lien vers
`/tasks` — toujours visible, sur toutes les pages protégées.

**S22 — compacter les blocs de connexion calendrier** : `CalendarSettings.tsx`
— une fois connecté, le badge + lien de réservation toujours affiché +
bouton copier + bouton déconnecter (empilés) sont remplacés par une seule
ligne compacte (badge + email + "Copier le lien" + "Déconnecter"). Le
lien de réservation n'est plus affiché en clair, seulement copiable.

Vérifié : `pnpm typecheck`/`pnpm test` racine verts (12 packages, 305
tests côté `@dmh/crm`, +21 depuis S18), `deno check` propre sur les 7
fonctions calendrier (5 existantes + `calendar-update-event` +
`calendar-create-event`).

Migrations `023`/`024` appliquées et `calendar-create-event` déployée
(confirmé avec Loïc avant exécution) — testé par un preflight CORS (204 +
bons en-têtes) et un appel sans authentification (401 posé par le code),
même méthode de vérification que les fonctions calendrier précédentes.

**Point de reprise** : demander à Loïc de tester en conditions réelles —
créer un événement lié à un contact (vérifier qu'il apparaît sur la fiche
contact ET dans son vrai calendrier externe), créer une liste et y
ajouter des contacts, vérifier le badge de tâches du jour dans l'en-tête,
et confirmer que les blocs de connexion calendrier sont bien compacts.

### 2026-09-04 — S23 : Loïc précise "listes" (S20 insuffisant)

Retour de Loïc sur S20 : "je crois que tu n'as toujours pas compris...
l'utilisateur doit pouvoir faire des listes custom de : contacts /
entreprises / opportunités [...] pouvoir assigner une liste de contacts
ou d'entreprises à une opportunité, ou une liste de contact pour une
entreprise, ou une liste d'entreprises pour un contact". Passage en mode
Plan pour cadrer précisément avant de recoder (deuxième malentendu
consécutif sur ce sujet, éviter un troisième).

**Décision de conception** : plutôt qu'une relation polymorphe générique
(`entity_type`/`entity_id` libres), garder la convention déjà établie
dans tout ce schéma — `deals.contact_id`/`company_id`,
`tasks.contact_id`/`company_id`/`deal_id` ("trois liens optionnels plutôt
qu'une relation polymorphe générique", migration 013) : chaque
combinaison liste→fiche est une **colonne FK nullable explicite**, une
seule liste assignée par type et par fiche (pas une relation
many-to-many).

- Migrations `025_company_lists.sql`/`026_opportunity_lists.sql` : copie
  exacte du template `contact_lists`/`contact_list_members` (S20) pour
  les entreprises et les opportunités (`opportunity_list_members.deal_id`
  — "opportunité" = table `deals` dans ce schéma).
- Migration `027_list_assignments.sql` : 4 colonnes FK nullables —
  `deals.contact_list_id`/`company_list_id`, `companies.contact_list_id`,
  `contacts.company_list_id`.
- Backend : `services/companyLists.ts`/`dealLists.ts` +
  `hooks/useCompanyLists.ts`/`useDealLists.ts` (copie exacte de
  `contactLists.ts`/`useContactLists.ts`, S20). `CompanyList`/
  `OpportunityList` ajoutés à `@dmh/types`. **L'assignation ne crée aucune
  fonction dédiée** : simple extension des `DealUpdate`/`CompanyUpdate`/
  `ContactUpdate` déjà existants (`+contactListId`/`+companyListId`) — les
  hooks `useOpportunityDetail`/`useCompanyDetail`/`useContactDetail`
  exposent déjà `save(patch)`, aucun changement de hook nécessaire.
- UI : `Companies.tsx` n'avait **aucun sélecteur de client** jusqu'ici —
  ajouté comme prérequis (mirroring `Contacts.tsx`), puis le bloc liste
  complet (sélecteur "Liste", "+ Nouvelle liste", sélection multiple +
  bulk "Ajouter à une liste"). `Opportunities.tsx` (vue "Liste"
  uniquement) : même bloc, avec un `listViewClientId` **indépendant** de
  `kanbanClientId` pour ne pas toucher au Kanban déjà validé.
  `components/AssignedListCard.tsx` (nouveau, réutilisé 4 fois) :
  sélecteur de liste existante + affichage en lecture seule de ses
  membres. Câblé sur `OpportunityDetail.tsx` (2 cartes : contacts ET
  entreprises), `CompanyDetail.tsx` (1 carte : contacts),
  `ContactDetail.tsx` (1 carte : entreprises).
- Vérifié : `pnpm typecheck`/`pnpm test` racine verts (12 packages, 323
  tests côté `@dmh/crm`, +18 depuis S22).
- Migrations `025`-`027` appliquées sur le vrai projet Supabase (confirmé
  avec Loïc avant exécution). Aucune Edge Function à redéployer pour
  cette étape.
- **Point de reprise** : demander à Loïc de tester en conditions réelles
  — créer une liste d'entreprises, l'assigner à un contact, vérifier
  l'affichage des entreprises membres sur la fiche contact ; créer une
  liste de contacts, l'assigner à une opportunité, vérifier l'affichage ;
  vérifier aussi que `/companies` et `/opportunities` (vue Liste)
  affichent bien le nouveau sélecteur de liste.
- **Retour de Loïc** : "je ne vois pas les listes" — le sélecteur "Liste"
  (comme "Segment" avant lui) reste caché tant qu'aucun client DMH n'est
  choisi, sans aucun indice visuel. Corrigé par un texte d'aide sur
  `/contacts`, `/companies`, `/opportunities` (vue Liste) quand aucun
  client n'est sélectionné. Serveur de dev vérifié à jour au passage
  (un seul processus, code servi confirmé identique au dépôt).

### 2026-09-04 — S24 à S28 : bouton contact, tags, listes dynamiques (booléens), dropdowns cherchables, nav latérale

Nouvelle demande de Loïc en une fois : (1) bouton "+ Nouveau contact" sur
`/contacts` (absent), (2) des tags ("aka attributs, aka propriété"), (3)
un système de création de segments/listes sur la base de critères de
filtrage avec opérateurs booléens ("cf HubSpot"), (4) un champ de
recherche sur les dropdowns, (5, ajoutée pendant la planification) :
déplacer la navigation en barre latérale gauche avec menus/sous-menus
comme HubSpot/Brevo. Passage en mode Plan (3 agents Explore en parallèle)
avant d'écrire un plan détaillé, approuvé par Loïc (dont une confirmation
explicite sur la décision de fusionner Segments et Listes).

**Décisions de conception actées dans le plan** :
- **Tags = extension des champs personnalisés**, pas un système séparé —
  Loïc les nomme lui-même "aka attributs, aka propriété", exactement ce
  que les champs personnalisés (S9) sont déjà. Nouveau `field_type`
  `'multiselect'` plutôt qu'un nouveau système parallèle.
- **Segments et Listes fusionnent** en un seul concept ("Listes",
  statiques ou dynamiques) — confirmé explicitement par Loïc avant
  exécution, pour éviter la redondance déjà présente sur `/contacts`
  (deux sélecteurs côte à côte) et coller à HubSpot qui n'a qu'un concept.
- **Booléens = modèle HubSpot à 2 niveaux** (groupes en OU, conditions
  d'un groupe en ET) plutôt qu'un arbre récursif — plus simple à
  construire, couvre le besoin réel.
- **Recherche dans les dropdowns** : réutilise `cmdk`, déjà une
  dépendance (jusqu'ici seulement `CommandPalette.tsx`) — pas de
  nouvelle lib, cohérent avec le refus déjà documenté de Radix.

**S24** : trivial — `AddContactDialog.tsx` existait déjà (utilisé par
`ProspectsList.tsx`) mais n'était jamais câblé sur `/contacts`. Même
pattern que `Companies.tsx` (`+ Entreprise`).

**S25** : migration `028_custom_field_multiselect.sql` — contrainte CHECK
sur `field_type` étendue avec `'multiselect'` (retrouvée/recréée
dynamiquement via `pg_constraint`, comme déjà fait en migration 016).
`CustomFieldsCard.tsx` gagne une branche cases à cocher (valeur stockée
comme tableau JSON dans la même colonne `value`) ; `CustomFieldSettings.tsx`
propose la saisie d'options pour ce type aussi. **Note** : l'exploration
avait signalé une incohérence supposée sur `entity_type` (CHECK limité à
contact/company) — vérification directe du fichier a montré qu'elle était
déjà corrigée depuis la migration 016 (l'exploration avait lu une version
non à jour) ; rien à changer de ce côté.

**S26** (le plus gros morceau) : migration `029_dynamic_lists.sql` —
colonne `rules jsonb` nullable ajoutée à `contact_lists`/`company_lists`/
`opportunity_lists` (`null` = statique, tableau de groupes = dynamique) ;
les segments existants sont migrés en DONNÉES vers `contact_lists` (une
liste dynamique à un seul groupe par segment, équivalent exact,
`contact_segments` reste en base mais n'est plus utilisée par le code).
`@dmh/types` : `RuleCondition` (= `SegmentRule`, réutilisé), `RuleGroup`.
`lib/segmentEvaluator.ts` : `matchesRuleGroups` (OU entre groupes, ET dans
un groupe). `services/customFields.ts` : `listValuesByEntityForClient`
(gap réel comblé — les listes/segments ne pouvaient filtrer que sur les
colonnes déjà chargées, jamais sur les valeurs de champs personnalisés/
tags, qui vivent dans une table séparée). Nouveau
`components/RuleGroupsEditor.tsx` (éditeur à 2 niveaux, champ en menu
déroulant plutôt qu'en saisie libre — distinct de `ConditionRowsEditor`
pour ne pas casser les Automatisations, qui restent ET-uniquement côté
serveur en plpgsql). `Contacts.tsx`/`Companies.tsx`/`Opportunities.tsx` :
formulaire "+ Nouvelle liste" gagne un choix Statique/Dynamique ; le
sélecteur bulk "Ajouter à la liste" est filtré aux listes statiques
uniquement (une liste dynamique n'a pas d'adhésion à modifier
manuellement).

**S27** : `components/ui/searchable-select.tsx` (nouveau, sur `cmdk`) —
remplacement 1:1 d'un `<select>`. Appliqué aux dropdowns qui grandissent
avec le volume de données : `AddDealDialog.tsx` (contact/entreprise),
`AddContactDialog.tsx` (entreprise), `ContactDetail.tsx` (lier entreprise,
fusionner, ajouter à une liste), `CompanyDetail.tsx` (lier contact),
`AssignedListCard.tsx` (sélecteur de liste, réutilisé 4 fois).

**S28** : `components/Sidebar.tsx` (nouveau) — navigation regroupée
(Dashboard seul ; groupes "Prospection" et "CRM" repliables, ouverts
automatiquement si une route enfant est active sans jamais se refermer
seuls ; Automatisations/Mon calendrier/Réglages seuls). `Header.tsx`
allégé — ne garde que compte/notifications (thème, cloche tâches du
jour, menu utilisateur), la nav de page part dans `Sidebar.tsx`.
`App.tsx` : `ProtectedLayout` passe d'un empilement vertical à une
disposition `flex` (sidebar à gauche, colonne Header+contenu à droite) —
aucune page modifiée, leurs conteneurs `mx-auto max-w-*` se recentrent
naturellement dans la zone réduite.

Vérifié : `pnpm typecheck`/`pnpm test` racine verts (12 packages, 335
tests côté `@dmh/crm`, +12 depuis S23), build du serveur de dev confirmé
propre sur tous les fichiers touchés (compilation curl).

Migrations `028`/`029` appliquées sur le vrai projet Supabase (confirmé
avec Loïc avant exécution). Aucune Edge Function à redéployer pour ces
étapes.

**Point de reprise** : demander à Loïc de tester en conditions réelles —
bouton "+ Nouveau contact", ajouter un tag multiselect sur un contact,
créer une liste dynamique avec 2 groupes (OU) filtrant sur un tag,
confirmer qu'un ancien segment apparaît maintenant comme liste dynamique
équivalente, chercher dans un dropdown contact/entreprise, naviguer via
la nouvelle barre latérale.
