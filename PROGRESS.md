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
| `PROGRESS.md` (ce fichier) | ✅ fait |
| `TESTING.md` (process de test fonctionnel) | 🔄 v1 en attente de validation |

## Planning détaillé Phase 1 (8 semaines) — Tâches Loïc

| Sem. | Priorité | Tâche | Statut |
|---|---|---|---|
| S1 | Infrastructure | Créer le projet Supabase (DB, auth, RLS) | ✅ fait |
| S1 | Infrastructure | Définir et implémenter le schéma complet des tables | ✅ fait (`supabase/migrations/001_initial_schema.sql`) |
| S1 | Infrastructure | Souscrire aux outils (Smartlead, Pharow, Dropcontact, Lemlist) | ⬜ à faire — voir checklist ci-dessous |
| S1 | Infrastructure | Configurer les variables d'environnement | ✅ toutes les clés bloquantes réunies (Anthropic, Pappers, Dropcontact, Smartlead, Lemlist) ; il ne manque que `SMARTLEAD_WEBHOOK_SECRET` (non bloquant, généré à la config du webhook S4) |
| S2 | Pipeline Pappers | Intégrer l'API Pappers (Edge Function Supabase) | ⬜ à faire |
| S2 | Pipeline Pappers | Tester l'enrichissement sur 50 entreprises tests | ⬜ à faire |
| S2 | Pipeline Pappers | Développer le script d'import CSV Pharow → Supabase | ⬜ à faire |
| S3 | Email + Claude | Intégrer l'API Dropcontact | ⬜ à faire |
| S3 | Email + Claude | Développer le pipeline complet Pappers → Dropcontact → Claude API | ⬜ à faire |
| S3 | Email + Claude | Tester la génération de messages sur 100 prospects réels | ⬜ à faire |
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

## Écarts assumés par rapport au brief original

> Le brief (`DMH Plan Execution Strategique Juillet Decembre 2026.docx`) reste la référence historique et **n'est jamais modifié** — les décisions qui s'en écartent sont tracées ici, pas rétro-appliquées au document.

- **2026-07-30 — Lemlist remplace Waalaxy** pour l'automatisation LinkedIn/cold outreach (le brief §1.2.4 documente Waalaxy en détail, ce n'est plus l'outil retenu). Impact code : variable d'environnement `LEMLIST_API_KEY` (ex-`WAALAXY_API_KEY`), colonne `prospects.lemlist_contact_id` (migration `002_rename_waalaxy_to_lemlist.sql`, pas encore appliquée sur Supabase).

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
