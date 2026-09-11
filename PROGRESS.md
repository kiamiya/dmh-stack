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
| S2 | Pipeline Pappers | Intégrer l'API Pappers (Edge Function Supabase) | ✅ fait — validée end-to-end le 2026-07-30 contre le vrai Supabase + la vraie API Pappers (voir Journal) ; **redéployée le 2026-09-07** après avoir constaté qu'elle avait disparu du projet distant, voir Journal |
| S2 | Pipeline Pappers | Tester l'enrichissement sur 50 entreprises tests | ⬜ à faire — 1 entreprise réelle validée (PM MECANIQUE INDUSTRIE, SIREN 481838852) ; passage à l'échelle (50) reste à faire, dépend d'un vrai export Pharow avec un vrai client |
| S2 | Pipeline Pappers | Développer le script d'import CSV Pharow → Supabase | ✅ fait — validé end-to-end le 2026-07-30 (voir Journal), y compris la déduplication d'entreprise |
| S3 | Email + Claude | Intégrer l'API Dropcontact | ✅ fait — validée end-to-end le 2026-07-30 (API asynchrone, voir Journal) |
| S3 | Email + Claude | Développer le pipeline complet Pappers → Dropcontact → Claude API | ✅ fait — **pipeline complet validé end-to-end le 2026-07-30** (to_enrich → enriched_pappers → enriched_contact → ready), voir Journal ; **`enrich-dropcontact` et `generate-messages` redéployées le 2026-09-07** après avoir disparu du projet distant, voir Journal |
| S3 | Email + Claude | Tester la génération de messages sur 100 prospects réels | ⬜ à faire — 1 message réel généré et conforme aux contraintes du brief ; passage à l'échelle dépend d'un vrai export Pharow avec un vrai client |
| S4 | CRM v1 | Interface CRM basique (liste prospects, statut, messages, export Smartlead) | ✅ fait — validée end-to-end le 2026-07-30 (voir Journal), `apps/crm` |
| S4 | CRM v1 | Configurer les webhooks Smartlead → Supabase | ✅ fait côté code — validé end-to-end le 2026-07-30 (voir Journal) ; reste la config réelle côté Smartlead (compte + campagne pilote), hors périmètre dev ; **`webhook-smartlead` redéployée le 2026-09-07** après avoir disparu du projet distant, voir Journal |
| S5 | Dashboard v1 | Dashboard client React (vue d'ensemble, pipeline Kanban, interactions) | ✅ fait — validé end-to-end le 2026-07-30 (voir Journal), `apps/dashboard` |
| S5 | Dashboard v1 | Déployer sur Vercel avec custom domain (premier client) | ⬜ à faire — reporté, dépend d'un vrai client pilote (même logique que le déploiement réel du webhook Smartlead) |
| S6 | Attribution | Implémenter le module d'attribution (trigger PostgreSQL) | ✅ fait en avance — trigger `calculate_attribution` livré avec le schéma initial (S1), 2 bugs corrigés le 2026-07-31 (voir Journal) |
| S6 | Attribution | Tester le trigger sur des scénarios simulés | ✅ fait — 8 scénarios validés le 2026-07-31 contre le vrai Supabase (`scripts/test-attribution.ts`), voir Journal |
| S6 | Attribution | Développer la vue Deals dans le dashboard | ✅ fait — validée end-to-end le 2026-07-31 (voir Journal), `apps/dashboard/src/pages/Deals.tsx` |
| S7 | Scoring IA | Intégrer le scoring Claude API | ✅ fait — validé end-to-end le 2026-07-31 (voir Journal), `packages/scoring` + `supabase/functions/score-prospect` ; **redéployée le 2026-09-07** après avoir disparu du projet distant, voir Journal |
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
| S29-1 | Design "Relais" — système de design (tokens, typo, blueprint, nav) | ✅ fait — validé visuellement par Loïc le 2026-09-07 |
| S29-2 | Design "Relais" — page Reporting | ✅ fait — validé visuellement par Loïc le 2026-09-07 |
| S29-3 | Design "Relais" — page Intégrations | ✅ fait — validé visuellement par Loïc le 2026-09-07 |
| S29-4 | Design "Relais" — Mapping enrichissement (lecture seule) | ✅ fait — validé visuellement par Loïc le 2026-09-07 |
| S29-5 | Design "Relais" — Automatisations (chaîne visuelle) | ✅ fait — validé visuellement par Loïc le 2026-09-07 |
| S29-6 | Design "Relais" — Campagnes (tableau de bord Lemlist) | ✅ fait — validé visuellement par Loïc le 2026-09-07 |
| S30 | Audit design "Relais" v2 (re-fetch mockup) — combler les écarts + layout Pipeline | ✅ fait — validation visuelle réelle en attente de Loïc |
| S31 | Audit design "Relais" v3 (fondations CSS + layout partagé) — cartes transparentes, icônes Lucide, badges menu, recherche Header | ✅ fait — validation visuelle réelle en attente de Loïc |
| S32 | Analyse détaillée écran par écran (design "Relais") + lot "chrome" + 8/11 écrans | ✅ fait — 4 derniers écrans recadrés avec Loïc : Campagnes/Mapping/Paramètres restent en périmètre réduit, Automatisations étendu (voir S32-auto) |
| S32-auto | Automatisations — moteur étendu (branches Oui/Non + action "Enrichir") + canvas UI | 🔄 code + tests verts, migration 030 appliquée en production (confirmée par Loïc le 2026-09-07) — reste le remplissage du secret Vault + validation manuelle (voir TESTING.md) |
| S32-segments | Segments (/lists) — combler les écarts avec le mockup (comparaison demandée par Loïc) | 🔄 Lot A + Lot B en production (validation manuelle en attente, voir TESTING.md) ; Lot C (Dossiers) code+tests verts, **migration 032 appliquée en production le 2026-09-10** (confirmée par Loïc) — validation navigateur en attente |
| S33-0 | Revue dev CRM (08/09) — audit champs personnalisés globaux vs par contact | ✅ fait — pas de code à écrire, voir Journal |
| S33-1 | Revue dev CRM (08/09) — masquer Contacts/Entreprises/Pipeline de la sidebar (doublon avec Prospect) | ✅ fait côté code — routes `/contacts`, `/companies`, `/pipeline` conservées en deep-link, en attente de validation navigateur |
| S33-2 | Revue dev CRM (08/09) — vue Kanban fusionnée dans l'onglet Prospect (toggle Liste/Kanban) | ✅ fait côté code — en attente de validation navigateur (toggle, drag-and-drop, clic carte) |
| S33-3 | Revue dev CRM (08/09) — panneau de sélection Contact/Entreprise/Opportunité ("+ Nouveau" du Header) | ✅ fait côté code — en attente de validation navigateur (3 chemins de création) |
| S33-4 | Revue dev CRM (08/09) — import CSV Contacts/Entreprises avec enrichissement automatique | ✅ fait côté code — en attente de validation navigateur (voir TESTING.md) |
| S33-5 | Revue dev CRM (08/09) — sous-navigation Vue globale/Kanban/Contacts/Entreprises (retour de Loïc après test) | ✅ fait côté code — en attente de validation navigateur |
| S33-6 | Revue dev CRM (08/09) — séparer le Kanban Prospection du pipeline Opportunités (confirmé par Loïc) | ✅ fait côté code — en attente de validation navigateur |
| S33-7 | Revue dev CRM (08/09) — pipeline Opportunités à 5 étapes (nouveau/qualifié/proposition envoyée/négociation/gagné-perdu) | ✅ fait — **migration 033 appliquée et vérifiée en production le 2026-09-10** |
| S33-8 | Revue dev CRM (08/09) — opportunité liée à plusieurs contacts (achat/juridique/comptable) | ✅ fait — **migration 034 appliquée et vérifiée en production le 2026-09-10** |
| S33-9 | Revue dev CRM (08/09) — opérateur "n'est pas renseigné" (inconnu) + comparaison de dates correcte pour avant/après | ✅ fait (partiel, voir note) — **migration 035 appliquée et vérifiée en production le 2026-09-10** |
| S33-10 | Revue dev CRM (08/09) — logs/activités filtrables dans les vues | ✅ fait côté code (confirmé par Loïc malgré l'ambiguïté du CR) — aucune migration nécessaire, en attente de validation navigateur |
| S34-1 | Revue dev CRM (11/09) — formulaire Contact : téléphone + réordonnancement des champs | ✅ fait côté code — en attente de validation navigateur |
| S34-2 | Revue dev CRM (11/09) — formulaire Opportunité : nom libre + tâche de relance à la création | ✅ fait — **migration 036 appliquée et vérifiée en production le 2026-09-11** |
| S34-C0 | Revue dev CRM (11/09) — relations hiérarchiques entreprises (maison mère/filiale, demande explicite de Loïc) | ✅ fait — **migration 037 appliquée et vérifiée en production le 2026-09-11** |
| S34-3 | Revue dev CRM (11/09) — Opportunités en vue Kanban par défaut | ✅ fait — en attente de validation navigateur |
| S34-4/5 | Revue dev CRM (11/09) — menu de vue (Enregistrer/Dupliquer/Renommer/Supprimer/Partager le lien) sur Prospects + filtres synchronisés dans l'URL | ✅ fait côté code (Prospects uniquement pour l'instant, pas encore Segments/Tâches) — en attente de validation navigateur |
| S34-6 | Revue dev CRM (11/09) — sélecteur de client DMH global (Header) | ✅ fait côté code — Contacts/Entreprises/Opportunités branchés (Prospects non branché, voir note) — en attente de validation navigateur |
| S34-7 | Revue dev CRM (11/09) — alerte de doublons (email contact / nom entreprise) à la création manuelle | ✅ fait côté code — en attente de validation navigateur |
| S34-8 | Revue dev CRM (11/09) — bouton "Enrichir" à la demande (Contact/Entreprise) | ✅ fait — **Edge Functions `enrich-pappers`/`enrich-dropcontact` redéployées le 2026-09-11** (confirmation explicite de Loïc) — en attente de validation fonctionnelle réelle (clic bouton) |
| S34-9 | Revue dev CRM (11/09) — dossiers de segments : renommer/dupliquer/déplacer | ✅ fait côté code — en attente de validation navigateur |
| S34-10 | Revue dev CRM (11/09) — partage d'un dossier avec un compte client | ❌ non fait — dépend de l'architecture clients DMH/finaux (Phase G, bloquée sur William) |
| S34-11 | Revue dev CRM (11/09) — analyse de chevauchement entre segments | ✅ fait côté code (limité aux listes statiques) — en attente de validation navigateur |
| S34-12 | Revue dev CRM (11/09) — lien cliquable réel entre une tâche et sa fiche contact/entreprise/opportunité | ✅ fait côté code — en attente de validation navigateur |
| S34-13 | Revue dev CRM (11/09) — mode "dépiler les tâches une à une" (inspiration HubSpot) | ✅ fait côté code — en attente de validation navigateur |
| S34-14 | Revue dev CRM (11/09) — widget "Charge de l'équipe" (mockup Claude Design) | ⬜ non fait — signalé "bonus, pas urgent" dans le découpage, reporté |
| S34-15 | Revue dev CRM (11/09) — dashboards nommés personnels (créer/switcher/gérer, blocs fixes) | ✅ fait — **migration 038 appliquée et vérifiée en production le 2026-09-11** — en attente de validation navigateur |
| S34-16 | Revue dev CRM (11/09) — export PDF du dashboard | ✅ fait côté code (export navigateur via `window.print()`) — en attente de validation navigateur |
| S34-16bis | Revue dev CRM (11/09) — partage par email récurrent du dashboard (`pg_cron`) | ❌ non fait — bloqué : aucun fournisseur d'envoi transactionnel (Resend/SMTP/etc.) dans la stack ni clé API dans `.env.local`, cf. règle 4 de `CLAUDE.md` |
| S34-17 | Revue dev CRM (11/09) — dashboard dédié par client DMH (portail client) | ❌ non fait — dépend de l'architecture clients DMH/finaux (Phase G, bloquée sur William) |
| S34-18 | Correction — écran Prospects réaligné sur l'architecture réelle du mockup Claude Design (bascule Contacts/Entreprises, menu de vue consolidé, filtres rapides, fraîcheur réelle) | ✅ fait — **migration 039 + redéploiement `enrich-pappers`/`enrich-dropcontact` appliqués et vérifiés en production le 2026-09-11** — en attente de validation navigateur |
| S35-0 | Audit complet des 12 écrans Claude Design vs prod (demande de Loïc : "faire le tour de toutes les pages") | ✅ fait — 4 rapports d'écart détaillés, voir Journal ; priorisation discutée avec Loïc (Nature A mécanique d'abord, Nature B documentée/reportée) |
| S35-1 | Composants partagés (`SavedViewTabs`, `QuickFilterChips`, `CompletenessBar`, `savedViews.ts` généralisé) — base de la Nature A | ✅ fait — `ProspectsList.tsx` migré dessus sans régression |
| S35-2 | Entreprises : bandeau de vues + menu "..." (aligné avec Contacts), colonnes Source/Statut, libellés dynamiques | ✅ fait côté code — en attente de validation navigateur |
| S35-3 | Dashboard : bascule en menu déroulant, "actualisé il y a X min" + rafraîchir, filtres Propriétaire/Plage de dates, menus Partager/Actions consolidés, bloc "File d'enrichissement" | ✅ fait côté code — en attente de validation navigateur |
| S35-4 | Segments : bandeau de vues + menu "..." + filtres rapides (chips) + colonnes paramétrables | ✅ fait côté code — en attente de validation navigateur |
| S35-5 | Tâches : onglets système (À faire/En retard/Aujourd'hui/Mes tâches/Terminées) + vues perso + menu "..." + filtres rapides + colonnes Type/Priorité/Origine + widgets "Charge de l'équipe"/"Génération automatique" | ✅ fait — **migration 040 appliquée et vérifiée en production le 2026-09-11** — en attente de validation navigateur |
| S35-6 | Pipeline : chrome commun Liste/Kanban (onglets système + filtres rapides + menu "..." partagés), colonnes Commercial/Pondéré, "Regrouper par" (client/commercial) | ✅ fait — **migration 041 appliquée et vérifiée en production le 2026-09-11** — en attente de validation navigateur |
| S35-7 | Fiche Contact : bloc "Champs enrichis" (Source/Confiance/Âge par champ + détection de conflit multi-fournisseur) | ✅ fait — **migration 042 + redéploiement `enrich-pappers`/`enrich-dropcontact` appliqués et vérifiés en production le 2026-09-11** — en attente de validation navigateur |
| S35-N | Nature B — écarts documentés, non implémentés (voir section dédiée du Journal) : Campagne Email (éditeur WYSIWYG), Paramètres (équipe/rôles/portail/RGPD), Automatisation (canvas + cascade + garde-fous), Mapping (cascade configurable), Reporting (bibliothèque de rapports + diffusion client) | ❌ non fait — reportés/à cadrer, décision explicite de Loïc |

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

### 2026-09-04 (suite) — S29 : design "Relais" importé via Claude Design

Loïc a partagé un lien `claude.ai/design/p/...` (pas un artifact
classique — accès direct impossible). Import fait via le MCP
`claude_design` (`DesignSync`, autorisation `/design-login`) : projet
"Application SaaS CRM Brevo", fichier `Relais CRM.dc.html` + ses imports
(`ds-industry.css`, `support.js`) lus intégralement (10 écrans : Dashboard,
Contacts, Fiche contact, Pipeline, Campagnes, Automatisations,
Intégrations, Mapping enrichissement, Reporting, Paramètres).

Le mockup n'est pas qu'un thème de couleurs : identité "blueprint"
(cartes/boutons à coins carrés + repères d'angle façon plan technique),
typographie Barlow/Barlow Condensed, palette ardoise/bleu acier, ET 5
écrans absents de notre app. Confirmé avec Loïc (AskUserQuestion) :
relooker l'existant **et** construire les nouveaux écrans — traité comme
une roadmap à étapes (plan écrit, `bubbly-watching-crescent.md`),
**principe non négociable acté dans le plan** : jamais de chiffres
fabriqués (le mockup a des données d'exemple inventées — crédits,
quotas — qui ne doivent jamais apparaître comme réelles dans le produit).

**S29 étape 1 (système de design) — fait** :
- `index.css` : couleurs hex du mockup converties en HSL et réinjectées
  dans les tokens existants (mêmes rôles, `--background`/`--foreground`/
  `--accent`/`--border`/etc. — aucun changement de `tailwind.config.ts`
  pour ces rôles). Nouveaux tokens additifs `--sidebar-bg`/`--sidebar-fg`
  (panneau latéral "encre", ne suit pas le thème clair/sombre — non
  redéfinis dans le bloc `:root[data-theme="dark"]`, exprès).
  `--radius: 0` (esthétique carrée, se propage automatiquement partout
  où les composants utilisent déjà `rounded-md`/`rounded-lg`).
- Typographie : Google Fonts Barlow/Barlow Condensed ajoutées à
  `index.html`, `fontFamily.heading`/`.body` dans `tailwind.config.ts`,
  `h1-h6` stylés globalement dans `index.css`.
- `components/ui/blueprint-corners.tsx` (nouveau) : les 4 repères
  d'angle du mockup, traduits en classes CSS `.blueprint-corner-*`
  (noms non génériques pour éviter toute collision) plutôt que
  `color-mix()` (moins sûr côté support navigateur que les tokens HSL
  déjà utilisés partout ailleurs). `Card`/`Button` gagnent une prop
  `blueprint?: boolean`.
- `components/ui/page-header.tsx` (nouveau) : motif "kicker + titre"
  du mockup, remplace le `<h1>` sur les 10 pages existantes
  (`ProspectsList`, `Pipeline` — qui n'avait jusqu'ici aucun titre du
  tout —, `Dashboard`, `Contacts`, `Companies`, `Opportunities`, `Tasks`,
  `Automations`, `CalendarSettings`, `CustomFieldSettings`).
- `components/Sidebar.tsx` (S28) restylée : fond "encre" fixe
  (`bg-sidebar`), regroupement des routes sous les intitulés du mockup
  (Pilotage/Prospection/Marketing/Données & réglages) — notre CRM a des
  objets que le mockup n'a pas (Entreprises/Opportunités/Tâches), tous
  rejoignent "Prospection" faute d'équivalent plus précis dans le
  mockup ; mapping ajustable si Loïc préfère un autre découpage une fois
  vu en réel.
- `ui/badge.tsx` : `rounded-full` → `rounded-md` (tags carrés, pas des
  pastilles). `ui/table.tsx` : en-têtes en majuscules espacées, survol
  de ligne teinté avec l'accent.
- Vérifié : `pnpm typecheck`/`pnpm test` racine verts (12 packages, 335
  tests côté `@dmh/crm`, inchangé — étape 100% visuelle, aucune nouvelle
  logique testable). Compilation confirmée sur tous les fichiers touchés
  (dev server), présence des nouvelles classes/tokens vérifiée dans le
  CSS transformé servi par Vite. **Pas de vérification visuelle en
  navigateur réel possible côté Claude** (pas d'accès à un compte staff
  réel ni possibilité d'en créer un jetable — `SUPABASE_SERVICE_ROLE_KEY`
  de `.env.local` toujours périmée, cf. note S17) — à valider par Loïc.

**Point de reprise (étape 1)** : demander à Loïc de recharger le CRM et
donner un retour visuel (couleurs, typographie, coins carrés/repères
d'angle, regroupement de la nav) — pas bloquant, la roadmap a continué
sur l'étape 2 pendant l'attente de ce retour (CLAUDE.md règle 6 : ne
jamais s'arrêter entre étapes déjà ordonnées).

**S29 étape 2 (page Reporting) — fait** :
- `lib/reportingStats.ts` (nouveau) : `computeClientPerformance` — pure,
  regroupe opportunités (`useDeals`) et RDV (`useMeetings`, S19) par
  client DMH (`useClients`), un client sans donnée apparaît quand même à
  0 plutôt que d'être absent. Uniquement des chiffres réels (nombre
  d'opportunités, gagnées, valeur de pipeline, RDV) — pas de "coût/RDV"
  ni d'"apport enrichissement" comme dans le mockup, faute de suivi
  existant en base (conforme au principe non négociable du plan).
  3 tests vitest (`reportingStats.test.ts`).
- `pages/Reporting.tsx` (nouveau) : `PageHeader kicker="Pilotage ·
  performance"`, 4 cartes KPI `blueprint` (total prospects, deals
  gagnés, taux de conversion, RDV planifiés — toutes déjà calculées par
  `opportunityStats.ts`/déjà chargées via les hooks existants, aucune
  nouvelle requête), entonnoir (`FunnelChart`, même fonction que
  Dashboard), pipeline par statut (réutilise
  `computePipelineValueByStatus`), tableau "Performance par client"
  (nouveau, alimenté par `computeClientPerformance`).
- Route `/reporting` ajoutée dans `App.tsx`, entrée nav sous "Pilotage"
  dans `Sidebar.tsx` (à côté de Dashboard, comme dans le mockup).
- Vérifié : `pnpm --filter @dmh/crm typecheck`/`test` verts (338 tests,
  +3 nouveaux), `pnpm typecheck`/`pnpm test` racine verts (12 packages).
  Compilation confirmée via le dev server (200 sur `Reporting.tsx` et
  `/`). **Pas de vérification visuelle en navigateur réel possible côté
  Claude** (même limitation qu'étape 1, cf. note S17 sur la clé service
  role périmée) — à valider par Loïc, en même temps que l'étape 1.

**Point de reprise (étape 2)** : demander à Loïc de valider visuellement
`/reporting` (KPI, entonnoir, tableau par client) en même temps que le
reskin général. Aucune migration ni déploiement nécessaire pour cette
étape (lecture seule via hooks/RLS existants).

**S29 étape 3 (page Intégrations) — code fait, déploiement en attente** :
- `packages/config/src/integrations.ts` (nouveau) : `computeIntegrationStatuses`
  — pure, statut "configuré" par fournisseur dérivé de la présence
  réelle de sa clé d'API dans l'environnement (`PAPPERS_API_KEY`,
  `DROPCONTACT_API_KEY`, `SMARTLEAD_API_KEY`, `LEMLIST_API_KEY`) — les
  4 fournisseurs réellement utilisés par le pipeline (brief §1.2.1), pas
  "Kaspr"/"Hunter"/"Brevo SMTP" du mockup qui ne font pas partie de notre
  stack. Jamais de chiffre d'usage/quota (pas de suivi réel en base) —
  conforme au principe non négociable du plan. 4 tests vitest.
- Nouvelle Edge Function `supabase/functions/integrations-status`
  (même convention d'auth que `calendar-my-events` : JWT vérifié via
  client anon, pas de distinction de rôle nécessaire — statut DMH, pas
  une donnée par client) — renvoie uniquement les booléens `configured`,
  jamais les clés elles-mêmes.
- `services/integrations.ts` + `hooks/useIntegrations.ts` +
  `pages/Integrations.tsx` (nouveau) : liste des 4 fournisseurs, badge
  "Connecté"/"Non configuré".
- Route `/integrations` ajoutée dans `App.tsx`, entrée nav sous
  "Données & réglages" dans `Sidebar.tsx`.
- Vérifié : `pnpm --filter @dmh/config typecheck`/`test` verts (31
  tests, +4), `pnpm --filter @dmh/crm typecheck`/`test` verts (340
  tests, +2), `pnpm typecheck`/`pnpm test` racine verts (12 packages).
  Compilation confirmée via le dev server (200 sur `Integrations.tsx`).
- **Déployée** (confirmation explicite de Loïc obtenue) : première
  tentative bloquée par le classificateur de permissions auto (action
  distante), puis échouée pour de vrai (`deno.json` manquant pour cette
  fonction — import `@supabase/supabase-js` non résolu, même souci
  qu'anticipé pour les autres fonctions calendrier/enrichissement,
  juste oublié ici). Ajouté `supabase/functions/integrations-status/deno.json`
  (mêmes imports que `calendar-my-events`), redéployé avec succès.
  Vérifié : `curl` sans en-tête `Authorization` renvoie bien `401`
  (fonction live, auth appliquée). Pas de vérification avec une vraie
  session staff possible côté Claude (même limitation que d'habitude,
  cf. note S17) — à valider par Loïc en rechargeant `/integrations`.

**Point de reprise (étape 3)** : demander à Loïc de valider
visuellement `/integrations` (statut réel des 4 clés déjà dans
`.env.local`/Supabase Vault — toutes attendues "Connecté" puisque
`pnpm run check-env` est vert).

**S29 étape 4 (Mapping enrichissement) — fait, périmètre réduit avec
Loïc** : la cascade réelle (`enrich-pappers` → `enrich-dropcontact`) est
un pipeline FIXE à 2 étapes codé en dur, pas un mapping par champ/
fournisseur configurable comme le mockup le suggère. Demandé à Loïc
(AskUserQuestion) le niveau de profondeur voulu : **vue en lecture
seule choisie** (pas de vraie configurabilité) — évite de toucher au
pipeline de prod sans besoin exprimé.
- `lib/enrichmentCascade.ts` (nouveau) : `ENRICHMENT_CASCADE` (constante
  documentant les 2 étapes réelles — fournisseur, déclencheur, champs
  écrits, statut atteint, un miroir exact du code des 2 Edge Functions,
  pas une liste indicative) + `computeCascadeStepCounts` (pure, compte
  les prospects par statut réel de chaque étape). 3 tests vitest.
- `pages/EnrichmentMapping.tsx` (nouveau) : KPI "en attente
  d'enrichissement" (compte réel `to_enrich`) + une carte par étape de
  la cascade (fournisseur, déclencheur, champs cibles, nombre réel de
  prospects à ce statut) — aucun chiffre inventé.
- Route `/enrichment-mapping` ajoutée dans `App.tsx`, entrée nav sous
  "Données & réglages" dans `Sidebar.tsx`.
- Vérifié : `pnpm --filter @dmh/crm typecheck`/`test` verts (343 tests,
  +3), `pnpm typecheck`/`pnpm test` racine verts (12 packages).
  Compilation confirmée via le dev server. Pas de vérification visuelle
  en navigateur réel possible côté Claude (même limitation qu'aux
  étapes 1-3) — à valider par Loïc.

**Point de reprise (étape 4)** : demander à Loïc de valider
visuellement `/enrichment-mapping` en même temps que les étapes 1-3.
Aucune migration ni déploiement nécessaire (lecture seule, aucune
modification des Edge Functions d'enrichissement existantes).

**S29 étape 5 (Automatisations en canvas) — fait, périmètre réduit avec
Loïc** : même type de décision qu'à l'étape 4 — demandé à Loïc
(AskUserQuestion) le niveau voulu, **habillage visuel du moteur actuel
choisi** (pas d'extension du moteur avec de nouveaux types d'étapes
"enrichir"/"filtrer") : `/automations` pilote exactement le même schéma
`automation_rules`/`conditions`/`actions` (S12) qu'avant, aucun risque
sur les règles existantes.
- `lib/automationChain.ts` (nouveau) : `summarizeTrigger`/
  `summarizeConditions`/`summarizeAction` — pure, traduisent
  trigger_type/conditions/action_config en libellés FR pour la chaîne
  visuelle. 5 tests vitest.
- `services/automations.ts` : `listRules` enrichi avec un embedding
  PostgREST (`automation_conditions(...)`, `automation_actions(...)`
  via les FK `rule_id` déjà en place, migration 017) — un seul aller-
  retour au lieu d'un fetch séparé par règle. Nouveau type
  `AutomationRuleWithChain`.
- `pages/Automations.tsx` : formulaire de création restylé en 3 blocs
  connectés (Déclencheur → Conditions → Action, `ChainBlock`/
  `ChainArrow`) ; la liste des règles existantes passe d'un `<Table>` à
  des cartes affichant la même chaîne à 3 blocs avec le résumé réel de
  chaque règle (via `automationChain.ts`), plus le statut actif/inactif
  et les actions supprimer/activer inchangées.
- Vérifié : `pnpm --filter @dmh/crm typecheck`/`test` verts (348 tests,
  +5), `pnpm typecheck`/`pnpm test` racine verts (12 packages).
  Compilation confirmée via le dev server. Pas de vérification visuelle
  en navigateur réel possible côté Claude (même limitation qu'aux
  étapes précédentes) — à valider par Loïc.

**Point de reprise (étape 5)** : demander à Loïc de valider
visuellement `/automations` (chaîne de blocs, création d'une règle,
liste des règles existantes) en même temps que les étapes précédentes.
Aucune migration ni déploiement nécessaire (requête en lecture
supplémentaire uniquement).

**S29 étape 6 (Campagnes) — fait, périmètre réduit avec Loïc** : fait
avant de planifier en détail un constat important — notre intégration
Lemlist (`packages/lemlist`) est **lecture seule** (`fetchLemlistActivities`
uniquement, aucun appel de création de campagne/ajout de lead), et
Lemlist a déjà son propre éditeur de séquence. Reconstruire l'éditeur de
campagne par blocs du mockup aurait dupliqué l'outil Lemlist et
nécessité de nouveaux appels API non vérifiés. Demandé à Loïc
(AskUserQuestion) : **tableau de bord en lecture seule choisi** (pas
d'éditeur de séquence, pas d'envoi depuis le CRM) — la création/l'envoi
restent dans Lemlist, le CRM affiche les vraies statistiques déjà
synchronisées.
- `services/interactions.ts` : nouvelle `listLinkedinInteractions`
  (channel='linkedin' + `metadata` brute — colonne déjà alimentée par
  `scripts/sync-lemlist.ts`, jamais exposée avant dans le frontend). 3
  tests vitest.
- `lib/campaignStats.ts` (nouveau) : `computeCampaignStats` — pure,
  regroupe les interactions LinkedIn par `metadata.campaignId` réel,
  compte les leads/connexions/réponses distincts par prospect ; libellé
  via `metadata.campaignName` si présent dans la charge Lemlist brute,
  sinon repli sur l'id (jamais un nom inventé). Volontairement PAS de
  "RDV pris" par campagne : `meetings` n'a aucun lien avec un
  `campaignId` Lemlist, l'inventer aurait violé le principe non
  négociable. 4 tests vitest.
- `pages/Campaigns.tsx` (nouveau) + `hooks/useLinkedinInteractions.ts` :
  une carte par campagne (nom, leads/connectés/réponses réels).
- Route `/campaigns` ajoutée dans `App.tsx`, entrée nav sous
  "Marketing" dans `Sidebar.tsx` (à côté d'Automatisations).
- Vérifié : `pnpm --filter @dmh/crm typecheck`/`test` verts (355 tests,
  +7), `pnpm typecheck`/`pnpm test` racine verts (12 packages).
  Compilation confirmée via le dev server. Pas de vérification visuelle
  en navigateur réel possible côté Claude (même limitation qu'aux
  étapes précédentes) — à valider par Loïc.

**Point de reprise (étape 6, fin de la roadmap S29)** : demander à
Loïc de valider visuellement les 6 étapes ensemble (`/dashboard`,
`/reporting`, `/integrations`, `/enrichment-mapping`, `/automations`,
`/campaigns`) — un seul retour global plutôt que 6 validations
séparées. Aucune migration ni déploiement nécessaire pour cette
dernière étape. La roadmap "design Relais" (plan de session
`bubbly-watching-crescent.md`) est maintenant complète ; prochaine
tâche à définir avec Loïc une fois son retour visuel obtenu.

### 2026-09-07 (suite) — Bug de production découvert et corrigé : 5 Edge Functions du pipeline Phase 1 absentes du projet distant

En réponse à "quel est la suite ?", vérification de l'état réel du
projet Supabase distant (`hkonylfpcstbvxswyxyh`) plutôt que de se fier
au tableau ci-dessus : `supabase migration list --linked` confirme les
migrations 001-029 à jour, mais `supabase functions list` ne renvoyait
que 8 fonctions sur les 13 attendues. **`enrich-pappers`,
`enrich-dropcontact`, `generate-messages`, `score-prospect` et
`webhook-smartlead` — le cœur du pipeline d'enrichissement + le webhook
de réponse Smartlead — étaient absentes du projet distant**, malgré un
statut "✅ fait — validé end-to-end" dans ce fichier depuis fin juillet.
Confirmé par `curl` : `404` brut sur les 5 (passerelle Supabase, aucune
fonction à ce nom), alors qu'une fonction réellement déployée répond
toujours avec un corps JSON même en erreur (comparaison faite avec
`calendar-freebusy`/`integrations-status`, bien déployées). Cause
probable, non confirmée : le projet a été mis en pause pour inactivité
puis réactivé le 2026-07-30 (note S1) — les Edge Functions n'ont
apparemment pas survécu à ce cycle, contrairement à la base de données.

**Corrigé** : les 5 fonctions redéployées avec `--no-verify-jwt` (aucune
n'est appelée par un utilisateur Supabase authentifié — `webhook-smartlead`
vérifie sa propre signature HMAC, les 4 autres sont déclenchées
manuellement/par script avec la clé service role, pas de webhook DB
automatique dans les migrations) — même leçon que le bug
`calendar-my-events` documenté plus haut. Tous les secrets nécessaires
étaient déjà présents côté Supabase (`supabase secrets list`) — aucun
changement de code ni de secret requis, un problème de déploiement pur.
Chaque redéploiement vérifié par `curl` : réponse applicative (400
"prospect_id requis" pour les 4 premières, 401 "Signature invalide" pour
`webhook-smartlead`), plus de `404`. `supabase functions list` confirme
les 13 fonctions désormais toutes en ligne.

**Point de reprise** : le pipeline d'enrichissement et le webhook
Smartlead sont de nouveau opérationnels en production. Pas de test de
bout en bout avec un vrai prospect fait à ce stade (aurait modifié de
vraies données sans demande explicite) — à faire si Loïc veut confirmer
le pipeline complet sur un prospect réel. Sinon, reprendre la
validation visuelle de la roadmap S29 (design "Relais") ou une autre
tâche du planning Phase 1 encore ouverte (S1 "souscrire aux outils",
tests à l'échelle S2/S3, déploiement Vercel S5 — toutes dépendent d'un
client pilote réel, hors périmètre dev pur).

**Retour de Loïc (2026-09-07)** : (1) validation visuelle des 6 écrans
du design "Relais" — bon, tableau S29 mis à jour ci-dessus ; (2) test
du pipeline d'enrichissement redéployé reporté à plus tard (pas fait
aujourd'hui) ; (3) **aucun client pilote réel pour l'instant** — bloque
toujours S1 ("souscrire aux outils"), les tests à l'échelle S2/S3
(50/100 prospects réels) et le déploiement Vercel S5. Tant qu'un client
pilote n'existe pas, ces tâches restent `⬜` sans action possible côté
dev.

### 2026-09-07 (suite) — S30 : audit design "Relais" v2 + 6 correctifs

Loïc a demandé de re-vérifier le mockup Claude Design contre le code
réel. Re-fetch via `DesignSync` : le fichier avait grossi (92 Ko → 118
Ko, 10 → 11 écrans, nouvel écran "Segments") depuis la dernière lecture
— comparé écran par écran contre le code réel. 5 écarts réels identifiés
(hors Campagnes/Automatisations/Mapping/Intégrations/Paramètres, déjà
tranchés). Loïc a demandé de tous les traiter + refondre `/pipeline`
pour que les 12 colonnes tiennent à l'écran sans scroll de fenêtre. Plan
écrit et approuvé (`bubbly-watching-crescent.md`), exécuté en 6 commits :

1. **Layout `/pipeline`** — `ProtectedLayout` (`App.tsx`) borne
   désormais `main` à la hauteur réelle du viewport (`h-screen
   overflow-hidden` + `main overflow-y-auto`, au lieu de `min-h-screen`
   qui laissait la fenêtre entière scroller) — comportement inchangé
   pour toutes les autres pages (leur contenu scrolle dans `main` au
   lieu de la fenêtre). `KanbanBoardShell`/`KanbanColumn`
   (`components/KanbanColumn.tsx`) passent d'un flex à largeur fixe
   (`w-72`, `overflow-x-auto`) à une grille à colonnes égales
   (`grid-flow-col auto-cols-fr`) — les 12 statuts tiennent sans scroll
   horizontal, chaque colonne scrolle verticalement en interne si
   besoin. `ProspectCard.tsx` compacté (padding, troncature + `title`)
   pour rester lisible à largeur réduite.
2. **Fiches détail** — `ContactDetail`/`CompanyDetail`/`OpportunityDetail`
   gagnent `PageHeader` (oubliées à l'étape 1 de S29). Affichage de la
   confiance email Dropcontact (`contact.email_confidence`, déjà
   stockée mais jamais montrée) sur la fiche contact.
3. **Page `/lists`** (nouveau) — vue d'ensemble de toutes les listes
   (Contacts/Entreprises/Opportunités, tous clients), remplace l'écran
   "Segments" du mockup **en périmètre réduit** : pas de dossiers/
   corbeille/colonnes "Origine"/"Propriétaire" (aucune donnée réelle
   derrière ces concepts dans `contact_lists`/`company_lists`/
   `opportunity_lists`, qui n'ont que `id, client_id, name, rules,
   created_at`) — juste nom/type/mode/client/effectif réel (calculé via
   `matchesRuleGroups` pour les dynamiques, comptage direct pour les
   statiques).
4. **Reporting** — nouvelle colonne "Commercial" dans "Performance par
   client" : le commercial ayant posé le plus de RDV pour ce client
   (agrégat réel sur `meetings.staff_id`, `dmh_clients` n'a pas de
   champ "propriétaire" assigné).
5. **Opportunités** — bandeau "Pipe pondéré" (`deal_value × probability`,
   opportunités en négociation uniquement) + bascule "Grouper par
   client". Pas de regroupement "par commercial" : `deals` n'a aucun
   champ owner/staff_id réel, contrairement au Reporting où l'agrégat
   RDV-par-client est défendable.

Vérifié à chaque étape : `pnpm --filter @dmh/crm typecheck`/`test`
verts (364 tests, +21 sur ce lot), `pnpm typecheck`/`pnpm test` racine
verts (12 packages). Compilation confirmée via le dev server sur
plusieurs pages (Dashboard, Contacts, Pipeline, Opportunités) pour
valider l'absence de régression du changement de layout transverse
(`ProtectedLayout`). Pas de vérification visuelle en navigateur réel
possible côté Claude (même limitation que d'habitude) — à valider par
Loïc. Aucune migration ni déploiement nécessaire (uniquement des
lectures via des hooks/tables déjà existants).

**Point de reprise** : demander à Loïc de valider visuellement les 6
correctifs (`/pipeline` sans scroll, fiches détail restylées, `/lists`,
"Commercial" sur `/reporting`, pipe pondéré + regroupement sur
`/opportunities`). Prochaine tâche à redéfinir avec Loïc une fois son
retour obtenu — le planning Phase 1 reste bloqué sur l'absence de
client pilote réel (S1/S2/S3/S5).

### 2026-09-07 (suite) — S31 : audit design "Relais" v3 — fondations CSS + layout partagé

Loïc a redemandé un check complet ("il manque des éléments... menu...
pages"), en citant explicitement `_ds_bundle.js`. Le mockup principal
n'avait pas changé (118 471 octets, identique au dernier audit) — donc
cette fois, lecture complète de `ds-industry.css` **et** de
`_ds/.../readme.md` (jamais lu avant), qui énonce des règles qu'on ne
respectait pas :

> "Do not round cards, figures or buttons, and do not give cards or
> figures a surface fill — they are line drawings."
> "Use Lucide icons (…), at stroke-width 1.5."

**4 écarts réels trouvés et corrigés** :
1. **Cartes toujours remplies + ombrées** — `Card` (`ui/card.tsx`)
   appliquait `bg-card shadow-sm` partout, contrairement à l'intention
   "line drawing transparente". Un seul fichier changé
   (`bg-card shadow-sm` → `bg-transparent`), impact visuel sur
   littéralement toutes les pages — **le correctif le plus visible de
   cet audit**.
2. **Icônes en emoji au lieu de Lucide** — ajout de `lucide-react`,
   remplacement dans 7 fichiers (`Header.tsx` — cloche/thème,
   `ProspectCard`/`ProspectsList`/`OpportunityCard`/`ProspectDetailPanel`
   — avertissement stagnation, `RuleGroupsEditor`/`ConditionRowsEditor`
   — supprimer une ligne).
3. **Aucun badge de comptage dans le menu** — ajouté
   (`hooks/useSidebarCounts.ts` + `useListsCount.ts`), mais nécessitait
   un préalable : `Sidebar`/`Header` remontaient à chaque navigation
   (chaque route enveloppait sa page dans son propre
   `<ProtectedLayout>`) — `Header` refaisait déjà `useTasks()` à chaque
   clic. **Refactor `App.tsx` en layout de route parent React Router
   (`<Outlet/>`)** — Sidebar/Header ne montent plus qu'une fois par
   session, gain de perf général en plus de rendre les badges
   raisonnables. Badges ajoutés uniquement là où un compte réel bon
   marché existe (Prospects/Contacts/Entreprises/Opportunités/Tâches
   ouvertes/Listes/Intégrations) — pas sur Pipeline/Automatisations/
   Campagnes/Mapping (ferait doublon ou nécessiterait une nouvelle
   requête "tous clients" non justifiée pour un simple badge).
4. **Aucune barre de recherche visible dans le Header** — on avait déjà
   une vraie recherche (`CommandPalette`, Cmd+K) mais invisible sans
   connaître le raccourci, et limitée aux prospects. Ajouté un champ
   visible dans le Header, état de la palette levé dans
   `ProtectedLayout` (`useCommandPaletteState`) pour être piloté par les
   deux. Recherche élargie aux contacts (nom/email) et entreprises
   (nom/SIREN, comme le placeholder du mockup le promet) — `siren`
   ajouté à `CompanyListRow`/`listAllCompanies` (absent du select liste
   jusqu'ici).

Vérifié à chaque étape : `pnpm --filter @dmh/crm typecheck`/`test`
verts (370 tests, +6 sur ce lot), `pnpm typecheck`/`pnpm test` racine
verts (12 packages). Compilation confirmée via le dev server sur de
nombreuses routes après le refactor `<Outlet/>` (y compris le routing
modal `backgroundLocation` du panneau prospect). Pas de vérification
visuelle en navigateur réel possible côté Claude — à valider par Loïc,
en particulier l'item 1 (cartes transparentes) qui se voit sur toute
l'app d'un coup.

**Point de reprise** : demander à Loïc de valider visuellement ces 4
correctifs. Prochaine tâche à redéfinir une fois son retour obtenu.

### 2026-09-07 (suite) — S32 : analyse détaillée écran par écran + lot "chrome"

Loïc conteste les réductions de périmètre décidées en S29-S31 sans les
lui redemander (bascule Portail client jugée "couverte par
apps/dashboard", bouton Nouvel enrichissement omis, appellations pas
fidèles). Demande explicite : **analyse exhaustive écran par écran
avant tout nouveau code**. Plan écrit et approuvé
(`bubbly-watching-crescent.md`) — comparaison mot pour mot (texte
statique extrait directement du mockup, pas paraphrasé) pour le chrome
partagé (Sidebar/Header) et les 11 écrans, avec les métriques
fabriquées du mockup explicitement marquées plutôt que silencieusement
omises. Volume : ~40 écarts recensés.

Loïc a choisi de traiter le **chrome d'abord**. 4 questions de cadrage
posées et tranchées :
- Bouton "Nouvel enrichissement" → ouvre le flux existant "+ Nouvelle
  entreprise" (`AddCompanyDialog`).
- Bascule "Force de vente / Portail client" → **vrai mode masqué dans
  le CRM** (pas un lien vers `apps/dashboard` comme jugé en S30).
- Widget "Crédits d'enrichissement" (chiffres fabriqués dans le
  mockup) → affiché avec un état honnête ("Suivi non disponible")
  plutôt qu'omis ou avec un vrai chiffre (pas de chantier de suivi de
  quota pour l'instant).
- Renommage "Listes" → "Segments" (mot exact du mockup) ; la fusion
  "Réglages"/"Mon calendrier" en "Paramètres" n'a **pas** été retenue.

**Livré** :
- `lib/viewMode.tsx` (nouveau) : contexte React `ViewModeProvider`/
  `useViewMode` ("sales"/"client_portal", état en mémoire, non
  persisté), posé dans `App.tsx` (`ProtectedLayout`) — lisible par
  n'importe quelle page sans prop-drilling.
- `Header.tsx` : bascule segmentée "Force de vente"/"Portail client" ;
  bouton "+ Nouvel enrichissement" (blueprint) ouvrant `AddCompanyDialog`,
  navigue vers la fiche créée ; avatar carré à initiales
  (`getInitials`, réutilisé de `lib/avatar.ts`) au lieu du texte email ;
  recherche "une entreprise" → "une société" (mot exact du mockup).
- `App.tsx` : bannière "Portail client — Vue en lecture seule..."
  affichée sur toutes les pages (au-dessus de `<Outlet/>`) quand le
  mode est actif — adaptée sans nommer un client précis (pas de notion
  de "client courant" globale dans notre modèle, contrairement au
  mockup).
- `ContactDetail.tsx` : email/téléphone masqués (`•••••••••`) en mode
  Portail client (champs deviennent en lecture seule). `Contacts.tsx` :
  colonne Email masquée dans le tableau. **Portée volontairement
  limitée à ces deux endroits** pour ce lot — pas un balayage exhaustif
  de toutes les pages montrant une coordonnée brute.
- `Sidebar.tsx` : "Listes" → "Segments", "Intégrations" → "Intégrations
  API", widget crédits réaffiché en pied de sidebar avec l'état honnête
  décrit ci-dessus.

Vérifié : `pnpm --filter @dmh/crm typecheck`/`test` verts (370 tests,
inchangé — lot purement UI, aucune nouvelle logique pure), `pnpm
typecheck`/`pnpm test` racine verts (12 packages). Compilation
confirmée via le dev server sur plusieurs pages. Pas de vérification
visuelle en navigateur réel possible côté Claude — à valider par Loïc.

**Point de reprise** : le reste de l'analyse (11 écrans, dont plusieurs
concernent des chantiers déjà réduits en périmètre — Campagnes,
Automatisations, Mapping — que Loïc pourrait vouloir rouvrir en parité
totale) reste à cadrer écran par écran ou par lot avec Loïc, comme pour
le chrome. Voir la liste complète dans le plan de session
(`bubbly-watching-crescent.md`) pour la prochaine priorisation.

Loïc a dit "on peut passer à la suite" — poursuite directe dans l'ordre
du plan (règle CLAUDE.md §6, pas de choix à redemander), sans nouvelle
question de cadrage tant que les écarts restent comblables avec des
données 100% réelles.

**Écran 2/11 — Dashboard, fait** : voir commit dédié — "Activité de la
force de vente" (graphique empilé Appels/Séquences email/RDV posés),
"En attente d'enrichissement" (compte réel), "Comptes clients suivis"
(réutilise `computeClientPerformance`).

**Écran 3/11 — Contacts/Entreprises, fait** :
- `Companies.tsx` : colonnes SIREN, Effectif, CA, **Contacts** (compte
  réel via `useContacts()`, cross-référencé par `company_id`),
  **Complétude** (nouveau `lib/companyCompleteness.ts` — pure, % de
  champs Pappers réellement renseignés, jamais une estimation) ;
  bouton "Exporter" (réutilise `toCsv`, absent jusqu'ici sur cette
  page). `services/companies.ts` : `CompanyListRow` gagne
  `employee_range`/`revenue`.
- `Contacts.tsx` : colonnes **Confiance** (`email_confidence`, déjà en
  base) et **Source** (`data_source` — champ réel jamais exposé avant,
  'pharow'/'dropcontact'/'linkedin'/'manual') ; bouton "Exporter".
  `services/contacts.ts` : `ContactListRow` gagne `email_confidence`/
  `data_source`.
- Volontairement pas de "Fraîcheur" (aucune colonne `updated_at` sur
  `companies`/`contacts`, seulement `created_at` — pas de proxy fiable)
  ni de chips de filtre façon mockup (les filtres existants sont
  fonctionnellement équivalents, juste une UI différente — jugé
  cosmétique, pas un écart fonctionnel prioritaire).

Vérifié à chaque écran : `pnpm --filter @dmh/crm typecheck`/`test`
verts (374 tests, +3 sur les 2 écrans), `pnpm typecheck`/`pnpm test`
racine verts (12 packages). Pas de vérification visuelle en navigateur
réel possible côté Claude — à valider par Loïc.

**Point de reprise** : continuer dans l'ordre du plan — écran 4/11
"Segments" (`Lists.tsx`), puis Fiche contact, Pipeline/Opportunités,
etc. (voir `bubbly-watching-crescent.md`).

**Écrans 4-8/11 faits** (voir commits dédiés) : Segments (création de
liste depuis `/lists`, export, date de création réelle), Fiche contact
(carte Société, Historique via interactions réelles, Source, bouton
Appeler), Pipeline/Opportunités (Proba./Ancienneté/Prochaine action,
cycle moyen), Intégrations (grille de cartes avec description réelle
par fournisseur), Reporting (colonne "Contacts travaillés" réelle via
`computeClientPerformance` étendu).

**Reste 4/11 écrans, tous déjà en périmètre réduit par décision
antérieure de Loïc, à reconfirmer avant d'y toucher** : Campagnes
(éditeur de blocs complet vs tableau de bord Lemlist actuel),
Automatisations (canvas de nœuds vs chaîne visuelle actuelle), Mapping
enrichissement (cascade configurable vs vue lecture seule actuelle),
Paramètres (gestion équipe/rôles — explicitement hors périmètre dans le
roadmap S9-S16). Rebâtir ces 4 en parité totale serait un chantier bien
plus lourd que les 8 précédents (nouveau schéma, nouvelles Edge
Functions pour Campagnes, nouveau paradigme d'UI pour Automatisations,
architecture de rôles pour Paramètres) — question de cadrage posée à
Loïc avant d'exécuter, pas de décision prise seul cette fois.

### 2026-09-07 (suite) — S32-auto : Automatisations, moteur étendu (branches + Enrichir)

Décision de Loïc sur les 4 derniers écrans : Campagnes/Mapping/
Paramètres restent en périmètre réduit (options "Recommandé"), mais
**Automatisations** doit aller jusqu'au bout — "Étendre le moteur +
canvas" (option non recommandée, choisie explicitement).

Recherche préalable (lecture complète de la migration 017, requêtes en
lecture seule sur le vrai projet Supabase via `supabase db query
--linked`) : moteur 100% synchrone (trigger PL/pgSQL dans la même
transaction), conditions combinées en ET seulement, une seule règle
`continue`-ait entièrement si une condition échouait (pas de "sinon"),
un seul type d'action (`create_task`), pas d'`entity_type` "prospect".
Vérifié : `supabase_vault` déjà actif, `pg_net` absent.

**Migration `030_automation_branching_and_enrichment.sql` écrite**
(pas encore appliquée) :
- Colonne `automation_actions.branch` (`always`/`if_true`/`if_false`,
  défaut `always`) — réécriture de `run_automation_rules()` pour
  exécuter les actions par branche au lieu de sauter toute la règle ;
  strictement rétro-compatible (aucune règle existante n'a d'action
  `if_true`/`if_false`, donc comportement identique à avant pour elles
  — **à valider manuellement en priorité avant tout autre test**, voir
  TESTING.md).
- `create extension if not exists pg_net;` + `action_type` étendu avec
  `trigger_enrichment` + `entity_type` étendu avec `prospect` + nouveau
  trigger `prospects_automation` (déclenchement enfin possible sur
  "nouveau prospect créé").
- Action `trigger_enrichment` : appel `net.http_post` vers l'Edge
  Function `enrich-<provider>`, clé service lue dans
  `vault.decrypted_secrets` (jamais en dur). **Point de blocage réel,
  documenté explicitement** : je n'ai accès qu'à la version masquée de
  `SUPABASE_SERVICE_ROLE_KEY` — la migration crée l'emplacement de
  secret vide (`vault.create_secret('', 'app_service_role_key')`),
  **Loïc doit remplacer la valeur lui-même** après application, hors
  commit (requête SQL fournie séparément).
- **Limite architecturale assumée** : le moteur reste synchrone, donc
  impossible de brancher dans la MÊME règle sur le résultat de
  l'enrichissement déclenché (asynchrone, ex. Dropcontact) — seulement
  sur des conditions déjà connues au moment du déclenchement. Un futur
  enchaînement complet demanderait une deuxième règle réagissant à un
  changement de statut (pas construit ici).

Frontend : `packages/types` (`AutomationEntityType`+`prospect`,
`AutomationActionType`+`trigger_enrichment`, nouveau
`AutomationActionBranch`, `AutomationAction.branch`) ;
`services/automations.ts` (select/insert `branch`) ;
`lib/automationChain.ts` (`summarizeAction` gère `trigger_enrichment`,
nouvelle fonction pure `splitActionsByBranch`, testée) ;
`pages/Automations.tsx` réécrit : case à cocher "Brancher l'action
selon les conditions (Oui/Non)" qui bascule entre le bloc Action unique
(comportement identique à avant si non cochée — rétro-compatible) et
deux colonnes Oui/Non ; sélecteur d'action gagne "Enrichir" (choix
Pappers/Dropcontact), visible uniquement pour l'entité "Prospect" (seul
cas géré côté moteur) ; affichage des règles existantes ajoute les
blocs "Si Oui"/"Si Non" uniquement quand la règle en a (sinon rendu
linéaire identique à avant, via `splitActionsByBranch`).

Vérifié : `pnpm --filter @dmh/crm typecheck`/`test` verts (385 tests,
+13 sur ce lot), `pnpm typecheck`/`pnpm test` racine verts (12
packages), dev server + curl 200 sur `/automations`.

**Point de reprise** : la migration 030 est écrite mais **non
appliquée** — attendre la confirmation explicite de Loïc avant
`supabase db push` (règle CLAUDE.md §5, modifie le moteur d'exécution
en production). `TESTING.md` à rédiger avec le protocole de validation
manuelle (non-régression d'une règle simple existante en priorité,
puis branche Oui/Non, puis `trigger_enrichment` une fois le secret
Vault rempli par Loïc) avant de considérer cette tâche terminée.

### 2026-09-07 (suite) — S32-auto : migration 030 appliquée en production

Loïc a confirmé ("tu peux y aller") — `supabase db push --linked` exécuté.
Vérifié en lecture seule après coup : `pg_net` actif, colonne
`automation_actions.branch` présente, contraintes `entity_type` (+
`prospect`) et `action_type` (+ `trigger_enrichment`) à jour, trigger
`prospects_automation` créé, secret Vault `app_service_role_key` créé
(vide, comme prévu). `automation_rules` est vide en production (0 règle
existante) — le test de non-régression n'a donc rien à régresser
aujourd'hui ; il se confondra avec le premier test réel de Loïc.

**Point de reprise** : reste à faire de la part de Loïc — remplir la
vraie valeur du secret Vault (`vault.update_secret`, requête fournie
dans `TESTING.md`, jamais commitée) puis dérouler le protocole de test
manuel en 2 étapes désormais (branche Oui/Non, puis Enrichir réel).
`TESTING.md` mis à jour en conséquence — en attente de sa validation
avant de considérer S32-auto terminé.

### 2026-09-07 (suite) — S32-segments : Lot A (comparaison + filtres/enrichissement réels)

Loïc a demandé une comparaison stricte entre l'écran "Segments" du
mockup et `/lists` (voir plan `bubbly-watching-crescent.md`). Recherche
faite (2 agents parallèles : extraction littérale du mockup, audit du
code actuel) — écart réel et important confirmé : le mockup a des
dossiers, une corbeille, des filtres, des colonnes configurables et 4
colonnes en plus (Enrichis/Propriétaire/Origine/Mise à jour) qui
n'existaient pas. Décision de Loïc : tout le Lot A + tout le Lot B
maintenant, Lot C (Dossiers) reporté.

**Lot A fait** :
- Filtres réels sur `/lists` (client/type d'entité/mode) —
  `lib/listsFilters.ts` (nouveau, testé), remplace les 6 chips fabriqués
  du mockup par des filtres qui collent aux données déjà chargées.
- `lib/listsOverview.ts` gagne `criteriaCount` (somme des conditions,
  tous groupes, null si statique) et `enrichmentRate` (moyenne réelle de
  `computeCompanyCompleteness`/nouvelle `computeContactCompleteness` sur
  les membres résolus, null pour les listes d'opportunités — pas de
  notion d'enrichissement pertinente pour un deal). `useListsOverview.ts`
  garde désormais les vrais ids de membres statiques (`Map<string,
  string[]>`, avant juste leur longueur) pour pouvoir résoudre les
  entités complètes et calculer ce taux.
- **"Voir" scopé aux membres réels** : découverte en implémentant que
  Contacts.tsx/Companies.tsx/Opportunities.tsx avaient déjà tout le
  filtrage par liste (client + liste statique/dynamique via
  `matchesRuleGroups`), juste piloté par un `<select>` local, pas
  accessible en lien profond. Solution beaucoup plus simple que prévu au
  plan : les 3 pages lisent maintenant `useSearchParams()` (`client`,
  `list`) pour initialiser leur état existant, `Lists.tsx` construit le
  lien `?client=...&list=...` — aucune nouvelle fonction de filtrage
  nécessaire, 100% de code déjà là et déjà testé indirectement.
- `lib/contactCompleteness.ts` (nouveau, testé) : même principe que
  `companyCompleteness.ts`, sur poste/email/URL LinkedIn (seuls champs
  disponibles dans `ContactListRow`).

Vérifié : `pnpm --filter @dmh/crm typecheck`/`test` verts (399 tests,
+11), `pnpm typecheck`/`pnpm test` racine verts (12 packages), dev
server + curl 200 sur `/lists` et les 3 pages avec `?client=&list=`.

**Point de reprise** : enchaîner sur le Lot B — migration 031
(`created_by`, `updated_at` + triggers, `deleted_at` + `pg_cron` pour la
purge auto 30j, cf. plan) à présenter à Loïc avant `supabase db push`
(règle CLAUDE.md §5), puis Import CSV + Corbeille côté frontend.

### 2026-09-07 (suite) — S32-segments : Lot B (Propriétaire/Mise à jour/Import CSV/Corbeille)

**Migration `031_lists_metadata.sql` écrite** (pas encore appliquée) :
- `created_by` (référence `staff_members`, même pattern que
  `tasks.created_by`/`AddTaskDialog.tsx` — jamais l'uid d'un compte
  client).
- `updated_at` : trigger direct (modif nom/règles) + trigger indirect
  via les 3 tables `*_list_members` (ajout/retrait de membre) — sinon
  resterait figé sur la date de création pour une liste statique dont
  on ne fait qu'ajouter des membres.
- `deleted_at` : soft-delete. `pg_cron` (vérifié absent avant cette
  migration, `default_version 1.6.4` disponible) activé + job quotidien
  `purge_old_deleted_lists()` — purge réelle après 30 jours, pas une
  simulation.

**Frontend** : `packages/types` (3 champs ajoutés aux types
`ContactList`/`CompanyList`/`OpportunityList`) ; les 3 services
`*Lists.ts` gagnent `created_by` en insert, `deleteList` passe en
soft-delete (`update deleted_at`), + `listDeletedXLists`/`restoreXList` ;
`Lists.tsx` gagne un bouton Supprimer par ligne (confirmation, message
explicite "récupérable 30 jours"), un panneau Corbeille (Restaurer),
et attribue `created_by` au staff connecté à la création (même pattern
réutilisé sur Contacts.tsx/Companies.tsx/Opportunities.tsx pour leurs
propres formulaires de création de liste).

**Import CSV** : `lib/csv.ts` gagne `parseCsv` (RFC 4180, testé,
symétrique de `toCsv`) ; `lib/csvImportMatch.ts` (nouveau, testé) fait
la correspondance CSV→entité existante (email pour un contact, SIREN ou
nom — au choix — pour une entreprise), insensible casse/espaces ;
`ImportListDialog.tsx` (nouveau) : upload → aperçu des colonnes
détectées → choix de la colonne de correspondance → crée une liste
statique avec uniquement les entités **déjà existantes** trouvées,
rapporte le nombre de lignes non reconnues (jamais de création
d'entité depuis le fichier). Import CSV limité à Contacts/Entreprises
(Opportunités jugé peu naturel dans le plan, pas construit).

Vérifié : `pnpm --filter @dmh/crm typecheck`/`test` verts (428 tests,
+29 sur ce lot), `pnpm typecheck`/`pnpm test` racine verts (12
packages), dev server + curl 200 sur `/lists`.

**Point de reprise** : migration 031 écrite mais **non appliquée** —
attendre la confirmation explicite de Loïc avant `supabase db push`
(règle CLAUDE.md §5, ajoute des colonnes + active `pg_cron` sur des
tables déjà en production). Une fois appliquée : vérifier en lecture
seule (colonnes présentes, job cron programmé), puis tester
manuellement Supprimer/Restaurer et un import CSV réel (voir
`TESTING.md` à mettre à jour).

### 2026-09-08 — S32-segments : migration 031 appliquée en production

Loïc a confirmé ("je confirme, tu peux faire la migration") —
`supabase db push --linked` exécuté. Vérifié en lecture seule après
coup : les 9 colonnes (`created_by`/`updated_at`/`deleted_at` × 3
tables) ont le bon type/nullabilité, `pg_cron` actif (1.6.4), le job
`purge-old-deleted-lists` est programmé (`0 3 * * *`, actif). 0 liste en
production à ce jour — rien à régresser, comme pour l'automatisation.

**Point de reprise** : `TESTING.md` mis à jour — reste le protocole de
test manuel en 6 étapes (non-régression, Propriétaire réel, Mise à jour
sur changement de membres, Supprimer→Corbeille, Restaurer, Import CSV
réel) à dérouler par Loïc avant de considérer S32-segments Lot B
terminé.

### 2026-09-08 (suite) — S32-segments : Lot C (Dossiers)

Après validation du Lot B, Loïc a dit "je ferais les tests plus tard,
passe à la suite" — question posée pour clarifier ce que "la suite"
signifiait (le reste du roadmap S1-S32 étant soit fait, soit bloqué
business) : Loïc a confirmé vouloir reprendre le Lot C (Dossiers),
explicitement reporté la veille. Cadrage posé avant d'exécuter :
dossiers **rattachés à un client DMH** (comme les listes elles-mêmes),
pas de dossier transversal multi-clients.

**Migration `032_list_folders.sql` écrite** (pas encore appliquée) :
- Nouvelle table `list_folders(id, client_id, parent_id, name,
  created_by, created_at)` — même pattern RLS à 3 policies que
  `contact_lists` (`client_isolation`/`staff_full_access`/
  `client_user_access`). Arbre à 2 niveaux (`parent_id` null = racine).
- `folder_id` (nullable, `on delete set null`) ajouté sur les 3 tables
  `*_lists` — supprimer un dossier ne supprime jamais les listes qu'il
  contenait, juste les déclasse.

**Frontend** :
- `packages/types` : nouveau `ListFolder`, `folder_id` ajouté aux 3
  types de liste.
- Nouveau service `listFolders.ts` + hook `useListFolders.ts` (même
  forme que `contactLists.ts`/`useContactLists.ts`).
- `lib/folderTree.ts` (nouveau, testé) : `buildFolderTree` (arbre à 2
  niveaux pour l'affichage), `listsUnderFolder` (dossier sélectionné +
  ses enfants directs, pour que sélectionner un dossier parent
  agrège aussi les listes de ses sous-dossiers, comme le mockup).
- `lib/listsOverview.ts` : `ListOverviewRow` gagne `folderId`/
  `folderName`, résolus réellement (même principe que `clientName`).
- `lib/listsFilters.ts` : `ListsFilters` gagne `folderIds`.
- Les 3 services `*Lists.ts` gagnent `folder_id` en select/insert et
  une fonction `moveListToFolder` (remplace le glisser-déposer du
  mockup — non câblé même dans le mockup source — par un `<select>`
  par ligne, aussi fonctionnel mais honnête).
- `Lists.tsx` : le layout passe à 2 colonnes **uniquement quand un seul
  client est sélectionné** dans le filtre (les dossiers n'ont de sens
  que pour un client précis) — colonne de gauche = arbre de dossiers
  (création, sélection = filtre, suppression avec confirmation
  explicite "les listes seront déclassées, pas supprimées"). Formulaire
  de création et `ImportListDialog.tsx` gagnent un select "Dossier
  (optionnel)" une fois le client choisi.

Vérifié : `pnpm --filter @dmh/crm typecheck`/`test` verts (454 tests,
+26 sur ce lot), `pnpm typecheck`/`pnpm test` racine verts (12
packages), dev server + curl 200 sur `/lists`.

**Point de reprise** : migration 032 écrite mais **non appliquée** —
attendre la confirmation explicite de Loïc avant `supabase db push`
(règle CLAUDE.md §5). Une fois appliquée : vérifier en lecture seule
(table + colonnes + policies), puis test manuel (créer un dossier, y
classer une liste, filtrer dessus, créer un sous-dossier, vérifier
l'agrégation parent, supprimer un dossier et confirmer que ses listes
sont déclassées et non supprimées) — voir `TESTING.md`.

### 2026-09-08 (suite) — pleine largeur sur toutes les pages du CRM

Retour de Loïc : "toutes tes pages sont centrées, peux tu utiliser tout
l'espace des pages ?". Retiré `mx-auto max-w-*` du conteneur racine des
17 pages internes de `apps/crm` (Dashboard, Reporting, Contacts,
Companies, Opportunities, Tasks, Lists, Automations, Campaigns,
Integrations, EnrichmentMapping, CalendarSettings,
CustomFieldSettings, ContactDetail, CompanyDetail, OpportunityDetail,
ProspectDetail/ProspectsList) — gardent leur `p-6`/`space-y-*`, juste
plus de contrainte de largeur.

**Exclus délibérément** (pages publiques/non authentifiées, un
formulaire centré reste le bon choix visuel) : `Login.tsx` (déjà
`min-h-screen items-center justify-center`) et `PublicBooking.tsx`
(prise de RDV client externe, `max-w-md`/`max-w-lg`). `Pipeline.tsx`
n'avait déjà aucune contrainte de largeur — rien à faire.

Vérifié : `pnpm typecheck`/`pnpm test` racine verts (12 packages, 454
tests côté CRM, changement CSS pur donc aucune régression de test
attendue ni constatée), dev server + curl 200 sur les 13 routes
principales. Pas de vérification visuelle en navigateur réel possible
côté Claude — à valider par Loïc.

### 2026-09-08 (suite) — bug Kanban Pipeline : clic sur une carte impossible

Retour de Loïc : "on peut déplacer mais il est impossible de voir le
détail ou de lire son intitulé" sur `/pipeline`. Cause identifiée : le
`DndContext` (Pipeline.tsx et, même code dupliqué, la vue Kanban
d'Opportunités) n'avait pas de distance d'activation — dnd-kit
intercepte alors le moindre clic comme un début de glisser-déposer
(`pointerdown` capturé avant que le clic natif sur le `<Link>` de la
carte ne puisse se déclencher), rendant la fiche détail totalement
inaccessible par clic — d'où l'impression de ne "rien pouvoir lire" (le
seul moyen de voir le nom complet, non tronqué, était ce lien).

**Corrigé** : `PointerSensor` configuré avec
`activationConstraint: { distance: 8 }` (+ `KeyboardSensor` conservé
pour l'accessibilité) sur les 2 `DndContext` (`Pipeline.tsx` et
`Opportunities.tsx` vue Kanban, bug identique — corrigé au passage
sans que Loïc l'ait signalé séparément, même cause exacte). Un clic
sans déplacement fonctionne désormais normalement ; un vrai glisser
(> 8px) déclenche toujours le changement de statut/étape.

Vérifié : `pnpm typecheck`/`pnpm test` racine verts (12 packages, 454
tests, changement de configuration pur donc pas de nouveau test
unitaire pertinent), dev server relancé + curl 200 sur `/pipeline` et
`/opportunities`. Pas de vérification visuelle en navigateur réel
possible côté Claude — à valider par Loïc.

### 2026-09-08 (suite) — nouvelle page "Aide" (Données & réglages)

Demande de Loïc : une page expliquant comment se servir du CRM, le
remplir, et comment fonctionnent les API intégrées. Recherche faite
avant rédaction (relecture de `README.md`, `enrichmentCascade.ts`,
`Integrations.tsx`/`EnrichmentMapping.tsx`/`Campaigns.tsx`/
`CalendarSettings.tsx`/`CustomFieldSettings.tsx`, grep sur les appels
aux Edge Functions depuis l'UI) pour ne décrire que ce qui existe
réellement — un principe explicite du contenu écrit : "si une
fonctionnalité n'existe pas encore (ex. un bouton Enrichir cliquable),
c'est dit explicitement plutôt que laissé de côté."

**Découverte notable en écrivant la page** : aucune Edge Function
d'enrichissement/génération/scoring n'est aujourd'hui déclenchable
depuis un bouton du CRM sur une fiche existante — seuls l'import
Pharow (traité par un développeur) et une règle d'Automatisation
"Enrichir" sur les nouveaux prospects le font. Rendu explicite dans la
page plutôt que tu déduises un flux qui n'existe pas en testant.

`Help.tsx` (nouveau, route `/settings/help`, entrée "Aide" ajoutée en
dernier dans le groupe "Données & réglages" de `Sidebar.tsx`) : page de
contenu statique (pas de logique testable), sections Navigation/
Remplir la base (Entreprises, Contacts, Prospects, pipeline,
Opportunités, Tâches, Segments/Dossiers)/Automatiser/Suivre
l'activité/Mon calendrier/Réglages/Intégrations API (détail par
fournisseur : Pappers, Dropcontact, Claude, Smartlead, Lemlist,
Google/Outlook).

**Écart assumé par rapport à la demande précédente** ("utiliser tout
l'espace") : cette page garde un `max-w-4xl` — du texte de
documentation en pleine largeur nuit à la lisibilité (lignes trop
longues), contrairement aux pages de données/tableaux. Signalé
explicitement à Loïc, pas décidé silencieusement.

Vérifié : `pnpm typecheck`/`pnpm test` racine verts (12 packages, 454
tests — page de contenu statique, rien à tester unitairement), dev
server + curl 200 sur `/settings/help`. Pas de vérification visuelle
en navigateur réel possible côté Claude — à valider par Loïc (contenu
et mise en page).

### 2026-09-10 — Revue dev CRM DMH (08/09) : lot S33

Réunion Delphine/Loïc du 08/09/2026 (`D:\DL\Revue dev CRM DMH.docx`),
prochaine réunion le 11/09/2026 10h. Plan découpé et validé avec Loïc
avant codage (voir `.claude/plans` de la session), tracé ici comme lot
S33. 3 agents d'exploration lancés avant tout code pour cartographier
précisément les doublons/fonctionnalités visées.

**S33-0 (audit champs personnalisés)** : vérifié que le modèle actuel
(`custom_field_definitions` + `custom_field_values`, migration
`014_custom_fields.sql`, écran global `/settings/custom-fields`) est
déjà structuré au niveau du client, jamais par fiche — le point du CR
("champ personnalisé... pas associé à un contact spécifique") était
déjà résolu, aucune ligne de code à écrire.

**S33-1 (navigation)** : retiré "Contacts", "Entreprises" et "Pipeline"
du groupe "Prospection" de `Sidebar.tsx`. Les routes `/contacts`,
`/companies`, `/pipeline` restent actives dans `App.tsx` (deep-links
depuis les fiches liées) — décision explicite de Loïc de masquer
seulement la sidebar, pas de supprimer l'accès direct.

**S33-2 (Kanban dans Prospect)** : `ProspectsList.tsx` gagne un toggle
Liste/Kanban (même pattern que `Opportunities.tsx`), lisant/écrivant
`?view=kanban` dans l'URL. La vue Kanban réutilise telle quelle
`KanbanColumn`/`KanbanBoardShell`/`lib/kanban.ts` (plus de nouveau
composant), et le changement de statut par glisser-déposer réutilise
`useProspects().bulkUpdateStatus` (pas besoin du hook séparé
`useKanbanProspects`, supprimé — devenu mort). `pages/Pipeline.tsx`
devient une redirection vers `/?view=kanban` (garde les favoris/le
raccourci CommandPalette valides). Le correctif du bug "clic
impossible sur les cartes Kanban" (`activationConstraint: { distance:
8 }`, voir entrée du 2026-09-08) était dupliqué à l'identique entre
`Pipeline.tsx` et `Opportunities.tsx` — factorisé dans un nouveau hook
partagé `hooks/useKanbanDndSensors.ts`, réutilisé par les deux Kanban
(Prospects et Opportunités) pour ne pas le tripler.

**S33-3 (panneau de création)** : nouveau `components/CreateEntityDialog.tsx`
— panneau à 3 choix (Contact/Entreprise/Opportunité) qui ouvre ensuite
le dialogue existant correspondant (`AddContactDialog`,
`AddCompanyDialog`, `AddDealDialog` — aucun dupliqué). Remplace le
bouton du Header "+ Nouvel enrichissement", qui était mal nommé : il
n'ouvrait en réalité que la création d'entreprise (`AddCompanyDialog`),
exactement le doublon signalé dans le CR. Les boutons contextuels "+
Contact"/"+ Entreprise" sur `Contacts.tsx`/`ProspectsList.tsx` ne sont
pas touchés (le CR visait spécifiquement le bouton du Header mal
étiqueté).

Vérifié après chaque étape : `pnpm --filter crm typecheck` et
`pnpm --filter crm test` (64 fichiers, 454 tests) verts. Aucune
migration nécessaire pour S33-0 à S33-3 (réutilisation du schéma et
des services existants). Validation navigateur réelle en attente de
Loïc pour S33-1/2/3 (voir `TESTING.md`).

**S33-4 (import CSV Contacts/Entreprises, avec enrichissement
automatique pour les contacts)** : décision prise avec Loïc de viser
l'enrichissement automatique complet (pas un import brut). En
recherchant comment l'invoquer, découverte importante en relisant
`supabase/migrations/030_automation_branching_and_enrichment.sql` :
l'enrichissement automatique **existe déjà**, câblé au niveau base —
le trigger `prospects_automation` (après chaque `insert` sur
`prospects`) appelle `run_automation_rules('prospect')`, qui, si le
client a une automatisation active (`entity_type = 'prospect'`,
déclencheur "à la création") avec une action `trigger_enrichment`,
fait un vrai appel HTTP (`pg_net`) vers `enrich-pappers`/
`enrich-dropcontact`. Donc créer un contact + prospect `to_enrich` —
exactement ce que fait déjà `AddContactDialog` pour une création
manuelle — suffit à déclencher l'enrichissement réel, **sans appeler
aucune Edge Function depuis le nouveau code d'import** : le CSV
d'import reproduit fidèlement ce chemin existant plutôt que d'inventer
un second mécanisme.

Nouveaux fichiers, tous testés :
- `lib/importColumnMapping.ts` (+ test) : suggestion automatique de
  colonne CSV → champ cible (ex. "Prénom" → `firstName`), en 2 passes
  (correspondance exacte d'abord, puis sous-chaîne) pour éviter qu'un
  alias générique comme "nom" ne matche à tort "Nom de l'entreprise"
  au lieu de "Nom" — bug réel trouvé en écrivant le premier jet, corrigé
  avant de committer.
- `lib/contactImportPlan.ts` / `lib/companyImportPlan.ts` (+ tests) :
  validation et dédup pures (ligne invalide, email/nom déjà utilisé —
  en base ou en double dans le même fichier), séparées de l'exécution
  pour rester testables sans Supabase, même principe que
  `packages/pharow/src/importer.ts`.
- `services/entityImport.ts` (+ test, client Supabase stub par table) :
  exécute le plan — `importContacts` crée l'entreprise (réutilisée si
  le nom correspond déjà, insensible à la casse), le contact, puis le
  prospect `to_enrich` ; `importCompanies` crée uniquement l'entreprise.
  Une ligne en erreur n'interrompt pas les suivantes (erreurs collectées).
- `services/contacts.ts` : nouvelle fonction
  `listContactEmailsForClient` (+ test) pour dédupliquer par email au
  sein d'un client avant import.
- `components/ImportEntitiesDialog.tsx` : dialogue générique
  (`entityType: "contact" | "company"`), upload CSV + correspondance de
  colonnes (auto-détectée, corrigible) + aperçu (lignes prêtes/ignorées
  avec raison) avant de confirmer. Bouton "Importer" ajouté sur
  `Contacts.tsx` et `Companies.tsx`, à côté des boutons "+ Nouveau
  contact"/"+ Entreprise" existants (non touchés).

**Limite assumée, documentée à Loïc plutôt que masquée** : un import
"Entreprises" seul (sans données de contact) ne peut déclencher aucun
enrichissement automatique — le mécanisme `trigger_enrichment` ne se
déclenche que sur la création d'un **prospect**, qui exige toujours à
la fois un `contact_id` et un `company_id` (`services/prospects.ts`).
Une entreprise importée seule reste donc dans le même état qu'une
entreprise créée manuellement via "+ Entreprise" : pas de prospect, pas
d'enrichissement tant qu'aucun contact ne lui est rattaché. Pas une
limite que j'ai choisi de contourner par un hack (ex. un faux contact
vide juste pour déclencher l'enrichissement) — cohérent avec la
préoccupation de qualité de données soulevée dans la même réunion.

Vérifié : `pnpm --filter crm typecheck`/`test` (68 fichiers, 475 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts (12 packages). Aucune
migration nécessaire (réutilise `custom_field_definitions`,
`companies`, `contacts`, `prospects` et le moteur d'automatisation
existants). Validation fonctionnelle réelle (upload d'un vrai CSV,
vérification que l'enrichissement se déclenche si une automatisation
est configurée) en attente de Loïc — voir `TESTING.md`.

**S33-5 (sous-navigation Prospect/Contacts/Entreprises)** : après avoir
testé S33-1 en navigateur, Loïc a demandé un moyen d'atteindre les vues
Contacts/Entreprises depuis l'onglet Prospect, en plus du toggle Liste/
Kanban déjà en place — cohérent avec la décision du CR de garder ces
écrans accessibles sans les remettre dans la sidebar. Nouveau composant
partagé `components/ProspectSubNav.tsx` : 4 entrées (Vue globale/
Kanban/Contacts/Entreprises), utilisé sur les 3 pages concernées
(`ProspectsList.tsx`, `Contacts.tsx`, `Companies.tsx`). "Vue globale"/
"Kanban" restent une bascule d'état locale sur `ProspectsList.tsx` (pas
de navigation, cohérent avec S33-2) ; depuis `Contacts.tsx`/
`Companies.tsx`, ces deux mêmes entrées redeviennent de vrais liens
vers `/` et `/?view=kanban` (la page courante n'a pas cet état local).
"Contacts"/"Entreprises" sont toujours de vrais liens. Remplace le
toggle Liste/Kanban codé en dur dans `ProspectsList.tsx` (même rendu,
juste factorisé). Vérifié : `pnpm --filter crm typecheck`/`test` verts
(mêmes 475 tests, aucun nouveau test unitaire nécessaire — composant de
navigation pure, pas de logique à isoler). Testé en HMR pendant la
session (rechargement à chaud sans erreur), validation navigateur
complète en attente de Loïc.

**S33-6 à S33-9 (backlog du CR, confirmés par Loïc) :**

- **S33-6 — séparation Kanban Prospection/Opportunités** : confirmé
  avec Loïc (le CR décrit bien 2 pipelines distincts : "Pipeline de
  prospection... jusqu'au rendez-vous pris" et "Pipeline
  opportunités..."). `lib/kanban.ts` : `KANBAN_COLUMNS` (utilisé
  uniquement par le Kanban Prospects) restreint à 8 statuts (arrêt à
  `meeting_booked`), au lieu des 12 statuts de `ALL_PROSPECT_STATUSES`
  (inchangé, toujours utilisé pour les filtres/l'export/le changement de
  statut en masse de la vue Liste). Un prospect dont Smartlead
  positionnerait le statut sur `qualified`/`proposal_sent`/`won`/`lost`
  (`mapLeadCategoryToProspectStatus`, `packages/smartlead`, inchangé)
  reste visible dans la vue Liste, juste plus dans ce Kanban — décision
  volontaire pour ne pas toucher au schéma ni à l'intégration Smartlead
  déjà validée en production. Tests `lib/kanban.test.ts` mis à jour.
- **S33-7 — pipeline Opportunités à 5 étapes** : le seed de la migration
  015 ne posait que Négociation/Gagné/Perdu. Migration
  `033_pipeline_five_stages.sql` : insère Nouveau/Qualifié/Proposition
  envoyée avant Négociation sur le pipeline par défaut de chaque client
  existant (idempotente, ne touche à aucun deal déjà classé). Écrite,
  **pas appliquée**.
- **S33-8 — opportunité liée à plusieurs contacts** : nouvelle table
  `deal_contacts` (migration `034_deal_contacts.sql`), même pattern que
  `contact_companies` (migration 013) — `deals.contact_id` reste le
  contact "principal" (aucune rupture), la table ajoute les contacts
  additionnels avec un rôle libre (achat/juridique/comptable...).
  Nouveau service `services/dealContacts.ts` (+ test), hook
  `useOpportunityDetail` étendu (`contacts`, `linkContact`,
  `unlinkContact`), nouvelle carte "Contacts liés" sur
  `OpportunityDetail.tsx` (lier un contact existant + rôle, créer un
  nouveau contact directement depuis la fiche — `AddContactDialog`
  retourne désormais le contact créé via `onCreated`, changement
  rétrocompatible). Migration écrite, **pas appliquée**.
- **S33-9 — opérateurs de filtre "connu/inconnu" + dates** : ajout de
  l'opérateur `is_not_set` (symétrique de `is_set` déjà existant) —
  `packages/types`, `lib/segmentEvaluator.ts`, les 2 éditeurs de
  conditions (`ConditionRowsEditor.tsx`, `RuleGroupsEditor.tsx`,
  `lib/automationChain.ts` pour le libellé dans la chaîne visuelle), et
  la contrainte SQL `automation_conditions.operator` (migration
  `035_operator_is_not_set.sql`, qui recrée aussi `run_automation_rules()`
  pour gérer ce nouvel opérateur). **Bug réel trouvé en creusant ce
  sujet** : `gt`/`lt` comparaient `Number(fieldValue) > Number(rule.value)`
  côté client — ne fonctionnait jamais pour un champ date (une date ISO
  n'est pas un nombre). Corrigé dans `lib/segmentEvaluator.ts`
  (comparaison numérique en priorité, sinon `Date.parse`, sinon aucune
  correspondance — jamais d'exception). **Pas corrigé côté SQL** : le
  trigger `run_automation_rules()` fait `::numeric` sur `gt`/`lt`, ce qui
  lèverait une exception Postgres sur une valeur non numérique — un vrai
  bug, mais cette fonction est déjà en production et sensible (voir
  S32-auto, "rétro-compatibilité stricte... à valider manuellement") ;
  décision de ne pas la retoucher sous la pression du soir sans un
  protocole de test dédié (comme `scripts/test-attribution.ts` en son
  temps) — à traiter dans une session dédiée. **Limite assumée** :
  l'ensemble des opérateurs proposés reste le même pour tous les types de
  champ (texte/date/liste) — un vrai système d'opérateurs *restreints
  par type* (ex. masquer "contient" pour un champ date) n'a pas été
  construit ce soir, seuls les 2 manques concrets cités par le CR
  (opérateur "inconnu", comparaison de dates) sont traités.

**S33-10 — logs/activités filtrables : fait, après arbitrage de Loïc.**
Signalé l'ambiguïté du CR (la section "Système de filtres" dit
"se concentrer sur les propriétés, pas les événements marketing
complexes", la section "Logs et activités" dit "nécessité de rendre
ces logs filtrables") — Loïc a tranché en faveur de la seconde.

- `services/interactions.ts` : nouvelle fonction
  `listActivityFlagsByContactForClient` (+ test) — regroupe les
  `interactions` par contact (via `prospects.contact_id`, les
  interactions étant rattachées au prospect, pas directement au
  contact) en indicateurs `activity_<type>` ("cet événement s'est-il
  déjà produit"), un par type d'interaction (13 types, réutilise les
  libellés déjà écrits dans `lib/interactionLabels.ts`, dont un nouvel
  export `ALL_INTERACTION_TYPES` ajouté au passage).
- `Contacts.tsx` : ces indicateurs sont chargés par client et fusionnés
  dans l'enregistrement évalué par `matchesRuleGroups`, même pattern
  que `customFieldValuesById` pour les champs personnalisés.
- `RuleGroupsEditor.tsx` : nouvel optgroup "Activité" dans le menu
  déroulant de champ, uniquement pour `entityType === "contact"`
  (Entreprises/Opportunités n'ont pas d'interactions directement
  rattachées). Se filtre naturellement via `is_set`/`is_not_set`
  ("connu"/"inconnu" — l'événement s'est produit ou non), pas de valeur
  à saisir.
- Champs/Entreprises/Opportunités non concernés par cette carte
  "Activité" — aucune migration nécessaire (la table `interactions`
  existe déjà depuis S1).

Vérifié : `pnpm --filter crm typecheck`/`test` (70 fichiers, 492 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts. Validation navigateur
réelle (créer une liste dynamique avec une condition "Activité", vérifier
qu'elle filtre correctement) en attente de Loïc.

**Audit demandé par Loïc — autres écarts identifiés par rapport au CR :**

- **Opérateurs de filtre pleinement spécifiques par type de propriété**
  (S33-9) : le CR dit littéralement "chaque type de propriété (texte,
  date, liste déroulante) doit avoir SES PROPRES opérateurs de filtre".
  Ce qui a été fait : ajouter l'opérateur manquant (`is_not_set`) et
  corriger un vrai bug de comparaison de dates. Ce qui n'a **pas** été
  fait : restreindre la liste d'opérateurs proposée selon le type réel
  du champ (aujourd'hui, les 7 mêmes opérateurs sont toujours proposés,
  qu'il s'agisse d'un champ texte, date ou liste déroulante) — un vrai
  système d'opérateurs par type nécessiterait de connaître le type de
  chaque champ natif (pas seulement les champs personnalisés, qui l'ont
  déjà via `custom_field_definitions.field_type`) dans
  `RuleGroupsEditor`/`ConditionRowsEditor`, une refonte plus large des 2
  éditeurs. Pas fait ce soir faute de temps, signalé comme limite
  ouverte.
- **Campagnes multicanal (email/social paid/Google Ads) + actualisation
  automatique (ex. toutes les 4h)** : décrit dans le CR
  ("Fonctionnalités marketing... à visualiser"), mais `Campaigns.tsx`
  reste aujourd'hui un tableau de bord LinkedIn/Lemlist en lecture
  seule, sans actualisation automatique. **Pas un oubli de cette
  session** : le périmètre réduit de cet écran a déjà été explicitement
  acté avec Loïc lors d'une session précédente (voir section "S32",
  "Campagnes/Mapping/Paramètres restent en périmètre réduit") — non
  retouché ce soir, à confirmer si Loïc veut l'étendre.
- Tout le reste du CR (licence Lemlist, échange avec William, étude
  HubSpot par Delphine/Loïc, pilotage de projet) reste hors périmètre
  code — pas des tâches de développement.

**Migrations 032/033/034/035 appliquées en production.** Bloqué un
moment par un token d'accès CLI Supabase expiré (même type de blocage
que le 2026-07-31) — résolu avec un nouveau token personnel fourni par
Loïc (`supabase login --token ...`, jamais écrit dans un fichier du
repo). Loïc a confirmé explicitement l'application des 4 migrations en
attente, y compris la 032 (Lot C Dossiers, en attente depuis une
session précédente, forcément incluse car les migrations s'appliquent
dans l'ordre — signalé et confirmé avant de lancer `supabase db push`).
`supabase db push --linked` exécuté avec succès. Vérifié en lecture
seule directement en base (`supabase db query --linked`) :
`pipeline_stages` du pipeline par défaut a bien les 6 étapes dans
l'ordre (Nouveau/Qualifié/Proposition envoyée/Négociation/Gagné/Perdu),
tables `deal_contacts` et `list_folders` existent, contrainte CHECK de
`automation_conditions.operator` inclut bien `is_not_set`. Reste la
validation fonctionnelle en navigateur réel (voir `TESTING.md`).

### 2026-09-11 — Nouveau CR (revue dev CRM du 11/09), lot S34

Nouveau CR (`D:\DL\Revue dev CRM DMH(3).docx`), prochaine réunion le
15/09/2026 10h-12h. Directives explicites de Loïc pour ce lot :
1. **Ne pas traiter la création de clients DMH** — directive de William,
   malgré sa présence dans le CR comme action assignée à Loïc.
2. Analyser les modifications de Delphine sur Claude Design (tableaux de
   bord, segments, tâches) et les faire remonter en prod + workflows.
3. Traiter le reste du CR, **y compris les relations hiérarchiques
   entreprises** (maison mère/filiale) — initialement mis de côté par
   erreur d'interprétation d'un refus de plan, corrigé après clarification
   explicite de Loïc ("tu dois traiter la relation hiérarchiques
   entreprise !").

Recherche avant plan : 3 agents d'exploration (formulaires/doublons/
enrichissement, vues/filtres/client global, tâches/dashboards) + re-fetch
du fichier Claude Design "Relais CRM.dc.html" (projet "Application SaaS
CRM Brevo", via `DesignSync`) — grossi de 118 Ko (07/09) à 242 Ko,
sections Dashboard/Tâches/Segments lues en détail. Constat principal : un
**menu de vue standardisé** (Enregistrer/Cloner/Renommer/Supprimer/
Partager le lien) revient sur les 3 écrans que Delphine a travaillés,
absent aujourd'hui de notre code — cadré comme Phase B du plan
(`.claude/plans` de la session). Plusieurs points du CR (dépiler les
tâches, sélecteur client DMH global, alerte de doublons, chevauchement de
segments, agents IA de veille marché) ne sont **pas** dans le mockup —
conception à faire à partir du texte du CR seul.

**S34-1 (formulaire Contact)** — `AddContactDialog.tsx` : ajouté le champ
téléphone (`contacts.phone` existait déjà en base, absent du formulaire de
création) ; réordonné les champs — nom, prénom, poste, URL LinkedIn,
email, téléphone, entreprise, client DMH en dernier (ordre demandé par le
CR). **Limite assumée** : l'entreprise dépend du client DMH choisi
(`listCompaniesForClient`) — comme le client est maintenant en dernier,
l'utilisateur doit choisir le client avant que le champ Entreprise (plus
haut dans le formulaire) ne se peuple ; friction UX mineure mais réelle,
pas contournée pour respecter l'ordre exact demandé.

**S34-2 (formulaire Opportunité)** — `AddDealDialog.tsx` : ajouté un champ
"Nom de l'opportunité" (optionnel) et une case "Planifier une tâche de
relance manuelle" (+ date d'échéance, appelle directement
`services/tasks.ts#createTask` après la création du deal — pas de
workflow automatique, conforme au CR "non automatisée"). Nouvelle colonne
`deals.name` (migration `036_deal_name.sql`, nullable, **non appliquée**)
— nécessaire car `deals.company_name` servait jusqu'ici à la fois de nom
d'entreprise et de nom d'opportunité (deux opportunités sur la même
entreprise étaient indiscernables). Nouvelle fonction pure
`lib/deals.ts#getDealDisplayName` (+ tests) : nom libre si renseigné,
sinon repli sur `company_name` (aucune rupture pour les deals existants,
tous sans nom) — appliquée partout où le nom d'opportunité s'affichait
(liste, fiche détail, carte Kanban, dashboard, sélecteurs dans
AddTaskDialog/EditTaskDialog/AddCalendarEventDialog/
EditCalendarEventDialog, listes liées sur Contact/CompanyDetail). `onCreated`
de `AddDealDialog`/`useOpportunities().create` renvoient maintenant
`{id}` (au lieu de `void`) pour pouvoir créer la tâche liée au deal créé.

**S34-C0 (relations hiérarchiques entreprises)** — demande explicite de
Loïc. Nouvelle colonne auto-référencée `companies.parent_company_id`
(migration `037_company_parent.sql`, nullable, **non appliquée**), nouvelle
fonction `services/companies.ts#listSubsidiaries` (+ test), `getCompany`
étendu avec la relation `parent:companies!parent_company_id(id,name)`.
Nouvelle carte "Groupe" sur `CompanyDetail.tsx` : maison mère (lier/changer/
retirer via `SearchableSelect`, limité aux entreprises du même client,
excluant l'entreprise elle-même et ses propres filiales pour éviter un
cycle direct à 2 niveaux — **pas de détection de cycle plus profond**,
limite assumée faute de temps) + liste des filiales directes (lecture
seule, liens vers chaque fiche).

Vérifié à chaque étape : `pnpm --filter crm typecheck`/`test` (497 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts (12 packages). Migrations
036/037 écrites mais **non appliquées** — confirmation explicite à
demander avant `supabase db push`, même processus que S33.

**S34-3/4/5 (Phase B, partielle) :** Opportunités passe en Kanban par
défaut (`Opportunities.tsx`, `useState("list")` → `"kanban")`) — Prospects/
Tâches étaient déjà en Liste par défaut. `lib/savedViews.ts` gagne
`renameSavedView`/`duplicateSavedView` (+ tests) ; `lib/prospectFilters.ts`
gagne `filtersToSearchParams`/`searchParamsToFilters` (+ tests, aller-retour
vérifié) pour synchroniser les filtres actifs dans l'URL en continu
(`setSearchParams` à chaque changement, pas seulement lu à l'ouverture
comme avant) — condition technique du "partage de lien de vue" demandé
par le CR. `ProspectsList.tsx` : boutons Dupliquer/Renommer ajoutés à
côté du × déjà existant sur chaque onglet de vue enregistrée, bouton
"Partager le lien de la vue" (copie `window.location.href`).

**Pas encore fait (reste de la Phase B)** : ce menu de vue n'existe que
sur Prospects — pas encore répliqué sur Segments (`/lists`) ni Tâches
(`/tasks`), qui en ont autant besoin selon le mockup Claude Design.
Sélecteur de client DMH global (contexte React partagé entre pages) pas
commencé — chaque page garde son `<select>` local indépendant pour
l'instant. Point de reprise pour la prochaine session sur ce chantier.

Vérifié : `pnpm --filter crm typecheck`/`test` (70 fichiers, 504 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts.

**Migrations 036/037 appliquées en production** (2026-09-11, confirmation
explicite de Loïc) — `supabase db push --linked` exécuté avec succès,
vérifié en base (`information_schema.columns`) : `deals.name` et
`companies.parent_company_id` existent bien. Plus aucune migration en
attente à ce stade.

**S34-6 (sélecteur de client DMH global)** : nouveau `lib/selectedClient.tsx`
(`SelectedClientProvider`/`useSelectedClient`, même patron que
`lib/viewMode.tsx`), posé dans `App.tsx` au niveau du layout protégé,
persisté en `sessionStorage` (pas `localStorage` — un choix qui vaut pour
la session de travail en cours dans cet onglet, pas une préférence à
vie). Nouveau `<select>` dans `Header.tsx` ("Tous les clients" + liste),
visible sur toutes les pages protégées.

`Contacts.tsx`/`Companies.tsx` : le `clientId` local devient le `clientId`
partagé (même interface, changement mécanique bas risque) — un lien
profond `?client=...` pousse toujours sa valeur dans le contexte partagé
au montage (comportement deep-link préservé). `Opportunities.tsx` : les
deux states client jusqu'ici indépendants (`kanbanClientId` pour le
Kanban, `listViewClientId` pour la Liste — point de vigilance déjà
identifié dans le plan) sont unifiés en un seul `clientId` partagé —
changer de vue (Liste ↔ Kanban) conserve maintenant le même client
sélectionné, une vraie amélioration au passage.

**Pas branché** : `ProspectsList.tsx` garde `filters.clientId` local (dans
l'objet de filtres du système de vues enregistrées) — le brancher sur le
contexte global aurait exigé une synchronisation bidirectionnelle
(contexte global ↔ filtre sauvegardable) risquée à faire sous contrainte
de temps sans fragiliser le menu de vue tout juste construit (S34-4/5) ;
laissé de côté, à reprendre dans une session dédiée.

Vérifié : `pnpm --filter crm typecheck`/`test` (504 tests) verts,
`pnpm typecheck`/`pnpm test` racine verts. Pas de nouveau test unitaire
(contexte React pur, même convention que `viewMode.tsx` qui n'en a pas
non plus).

**S34-7 (alerte de doublons)** : `services/contacts.ts#findContactByEmail`
et `services/companies.ts#findCompanyByName` (+ tests) — recherche
insensible à la casse au sein du **même client** uniquement. Alerte
affichée sous le champ concerné dans `AddContactDialog.tsx`/
`AddCompanyDialog.tsx` (lien vers la fiche existante), **avertit sans
bloquer** la création (un email partagé — assistante, standard — reste
légitime). **Limite assumée, documentée** : le CR demande aussi de
proposer d'associer le doublon à un NOUVEAU client DMH plutôt que
dupliquer — pas fait, ça dépend de l'architecture "clés secondaires"
(clients DMH/finaux) pas encore tranchée avec William (Phase G du plan).

**S34-8 (enrichissement à la demande)** : découverte importante en
creusant ce sujet — `enrich-pappers`/`enrich-dropcontact` (Edge
Functions) exigent un `prospect_id` **et** un statut précis
(`to_enrich`/`enriched_pappers`), pensées uniquement pour le pipeline
automatique. Modifiées pour accepter un flag `manual: true` (nouveau
comportement, rétrocompatible) : dans ce mode, le garde-fou de statut est
ignoré et `prospects.status` n'est **jamais** modifié (seules les
données `companies`/`contacts` sont rafraîchies) — pour ne jamais faire
régresser un prospect déjà avancé dans le pipeline (`won`, `qualified`...)
juste parce qu'on rafraîchit ses données. Bouton "Enrichir" ajouté sur
`ContactDetail.tsx` (Dropcontact) et `CompanyDetail.tsx` (Pappers),
visible seulement si un prospect est lié (`useProspects()`, nouveau champ
`ProspectListRow.company_id` ajouté au passage — absent jusqu'ici, la
ligne prospect n'exposait que l'objet `companies` imbriqué sans son id).
**Limite assumée pour Dropcontact (asynchrone)** : si un
`dropcontact_request_id` traîne d'un essai précédent, le mode manuel
consulte cette requête au lieu d'en soumettre une nouvelle — un vrai
"forcer un nouvel essai" nécessiterait de le réinitialiser d'abord, pas
fait.

**Edge Functions redéployées** (2026-09-11, confirmation explicite de
Loïc) — `supabase functions deploy enrich-pappers` puis
`enrich-dropcontact`, les deux confirmées `"Deployed Functions."`. Pas de
vérification fonctionnelle réelle faite ici (consommerait un vrai appel
Pappers/Dropcontact sur une vraie fiche) — validation par Loïc en cliquant
le bouton "Enrichir" en conditions réelles, voir `TESTING.md`.

Vérifié : `pnpm --filter crm typecheck`/`test` (70 fichiers, 510 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts. Les Edge Functions
elles-mêmes ne sont pas couvertes par des tests unitaires (glue Deno, même
limite déjà documentée pour le reste du pipeline d'enrichissement) — la
logique métier pure sous-jacente (`packages/pappers`, `packages/dropcontact`)
n'a pas changé, ses tests restent valables tels quels.

**S34-9 (actions manquantes sur les dossiers)** : `services/listFolders.ts`
gagne `updateFolder` (renommer/déplacer, `parent_id` nullable) et
`duplicateFolder` (copie superficielle suffixée "(copie)", même parent —
ne clone ni sous-dossiers ni listes contenues, même principe que dupliquer
une vue enregistrée S34-4) — les deux testés. `hooks/useListFolders.ts`
expose `update`/`duplicate`. UI sur `Lists.tsx` : boutons ⧉/✎/× sur chaque
dossier (racine et sous-dossier) ; renommer utilise `window.prompt`
(cohérent avec `window.confirm` déjà utilisé dans ce fichier pour
supprimer, pas de nouveau composant Dialog pour rester proportionné) ;
déplacer un sous-dossier via un `<select>` inline (racine ou un autre
dossier racine) — **limité aux sous-dossiers** : un dossier racine avec
ses propres enfants n'est pas déplaçable, pour ne pas dépasser l'arbre à
2 niveaux (migration 032).

**S34-10 (partage de dossier avec un client) : pas fait.** Le mockup
Claude Design le mentionne ("Un dossier peut être partagé avec un compte
client"), mais ça suppose de savoir relier un dossier à un compte
`client_users` d'un client FINAL distinct du client DMH propriétaire —
exactement le sujet "clés secondaires" que Loïc doit clarifier avec
William (Phase G du plan). Pas de RLS/UI construits sans cette base.

**S34-11 (analyse de chevauchement)** : nouveau `lib/listOverlap.ts`
(`computeListOverlap`, pure, + tests : chevauchement exact, doublons
ignorés, listes disjointes, liste vide sans `NaN`, listes identiques à
100%). UI sur `Lists.tsx` : bouton "Analyser un chevauchement" dans
l'en-tête, panneau avec type d'objet + 2 sélecteurs de liste + résultat
(nombre en commun, % de A/de B, exclusifs à chacune). **Limite assumée** :
uniquement les listes **statiques** (membres déjà connus via la table de
jointure, un aller-retour direct) — les listes **dynamiques**
nécessiteraient de ré-évaluer leurs règles sur tout le jeu d'entités
(logique déjà présente ailleurs mais pas branchée ici, pas de temps ce
soir) ; message explicite dans le panneau plutôt qu'un choix silencieux.

Vérifié : `pnpm --filter crm typecheck`/`test` (71 fichiers, 519 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts. Aucune migration
nécessaire (réutilise `list_folders` et les tables `*_list_members`
existantes).

**S34-12 (lien cliquable tâche → fiche liée)** : nouveau `lib/taskLinks.ts`
(`taskRelatedLink`, pure, priorité contact > entreprise > opportunité,
`null` si aucune fiche liée — réutilise `getDealDisplayName` pour le
libellé opportunité) + tests des 4 cas. `pages/Tasks.tsx` : la colonne
"Lié à" devient un vrai `<Link>` React Router au lieu d'un simple texte ;
l'ancien helper local `relatedRecordLabel` est supprimé, remplacé par
l'import partagé (déjà réutilisé aussi par `TaskFocusMode.tsx`, S34-13).

**S34-13 (dépiler les tâches une à une)** : nouveau composant
`components/TaskFocusMode.tsx` — modale avec file de tâches (pré-calculée
par `Tasks.tsx` via `focusQueue` : tâches non `done`, triées par échéance
croissante, celles sans échéance en dernier), progression "X / Y", et
3 actions par tâche : **Terminer** (statut → `done`), **Replanifier**
(révèle un champ date puis appelle `update`), **Passer** (avance sans
mutation). Le lien vers la fiche liée (`taskRelatedLink`) s'ouvre dans un
nouvel onglet pour ne pas interrompre la file en cours. Bouton "Dépiler
(N)" ajouté dans l'en-tête de `Tasks.tsx`, désactivé si la file est vide.
Pas de test unitaire dédié pour `TaskFocusMode.tsx` (composant React,
convention du repo — seule la logique pure `lib/` est testée).

**S34-14 (widget "Charge de l'équipe") : pas fait**, comme annoncé dans le
découpage ("bonus, pas urgent") — reporté, pas de date cible.

Vérifié : `pnpm --filter crm typecheck`/`test` (72 fichiers, 523 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts. Aucune migration.

**Phase F — dashboards personnalisés.** Avant de coder, 3 décisions de
cadrage posées à Loïc (le CR demande explicitement une version simplifiée,
pas la richesse HubSpot) : (1) le jeu de blocs fixe réutilise le
catalogue déjà codé dans `Dashboard.tsx` plutôt qu'un nouveau catalogue
générique — confirmé ; (2) les dashboards nommés sont **personnels** par
membre du staff (pas partagés équipe) — confirmé, malgré l'absence de
toute autre notion de "vue privée" dans le CRM ; (3) tenter aussi l'item
16 (export/partage) ce soir, pas seulement l'item 15 — confirmé.

**S34-15 (dashboards nommés)** : nouvelle table `dashboards` (migration
`038_dashboards.sql`, **non appliquée**) — `owner_id` (FK
`staff_members`), `name`, `blocks text[]` (clés du catalogue), `position`.
Pas de `client_id` : ce n'est pas une donnée scopée client, RLS
"propriétaire uniquement" (`owner_id = auth.uid()` ou `service_role`),
différent du triptyque habituel client_isolation/staff_full_access/
client_user_access des autres tables. Nouveau type `Dashboard` dans
`@dmh/types`. `lib/dashboardBlocks.ts` : catalogue pur des 14 blocs
existants (clé/libellé/catégorie, une entrée par carte/graphique déjà
codé — aucun nouveau composant graphique) + tests (clés uniques,
libellés non vides). `services/dashboards.ts` (CRUD + `duplicateDashboard`,
même principe copie superficielle que les vues/dossiers) + tests (stub
client, même pattern que `listFolders.test.ts`). `hooks/useDashboards.ts`
résout `owner_id` depuis la session courante (`supabase.auth.getSession()`,
même pattern que `useInteractions.ts#addNote`), jamais fabriqué côté
client. `pages/Dashboard.tsx` refactorée : un unique `renderBlock(key)`
retourne le JSX de chaque bloc (source unique, consommée à la fois par
l'onglet "Vue d'ensemble" existant — inchangé visuellement — et par les
dashboards nommés, en grille selon l'ordre de `dashboard.blocks`).
Bandeau de bascule (Vue d'ensemble / dashboards nommés / "+ Nouveau
dashboard"), actions ⧉/✎/× au survol de chaque dashboard nommé (mêmes
icônes que vues enregistrées/dossiers), nouveau
`components/DashboardBlocksDialog.tsx` (case à cocher par bloc, groupé
par catégorie) pour éditer la sélection d'un dashboard.

**S34-16 (export PDF)** : pas de nouvelle dépendance (pas de
`jspdf`/`html2canvas` — rendu de graphiques SVG/recharts via une capture
canvas est fragile et le CR demande explicitement une version simplifiée).
Bouton "Exporter en PDF" déclenche `window.print()` (impression navigateur
→ enregistrer en PDF, natif). `print:hidden` ajouté sur `Sidebar.tsx`
(`<aside>`) et `Header.tsx` (`<header>`), plus sur le bandeau de bascule
dashboards et la liste d'onglets `Vue d'ensemble` — seul le contenu du
dashboard actif s'imprime.

**S34-16bis (partage par email récurrent) : pas fait — bloqué.** Vérifié
qu'aucun fournisseur d'envoi transactionnel (Resend/SMTP/Postmark/etc.)
n'existe dans la stack (`packages/config/src/integrations.ts` liste
explicitement Pappers/Dropcontact/Smartlead/Lemlist, et exclut "Brevo
SMTP" du mockup comme hors stack). Construire l'envoi programmé
(`pg_cron` + Edge Function, même patron que la purge de corbeille
migration 031) nécessiterait de choisir un fournisseur et d'ajouter sa
clé API à `.env.local` — bloquant au sens de la règle 4 de `CLAUDE.md`,
pas commencé sans cette clé. À trancher avec Loïc/William si le besoin
est confirmé prioritaire.

Vérifié : `pnpm --filter crm typecheck`/`test` (74 fichiers, 534 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts (`@dmh/types` et
`@dmh/dashboard` inclus, le nouveau type `Dashboard` ne casse rien côté
app cliente). Migration `038_dashboards.sql` **appliquée et vérifiée en
production le 2026-09-11** (confirmation explicite de Loïc, table
`dashboards` confirmée via `supabase db query --linked`).

## 2026-09-11 (suite) — Correction : écran Prospects vs. architecture Claude Design

**Constat de Loïc** : captures d'écran à l'appui, notre page Prospects ne
correspondait pas à l'écran "Prospects" du mockup Claude Design — la
session précédente avait extrait les fonctionnalités listées dans le CR
texte (menu de vue, filtres, sélecteur client) sans revérifier la
**structure réelle** de l'écran mockupé (`Relais CRM.dc.html`, bloc
`sc-if value="{{ isContacts }}"`). Relecture complète du bloc a confirmé
un écart structurel : un seul écran avec bascule Contacts/Entreprises
(avec compteurs), des onglets de vues enregistrées avec compteurs, un
unique menu "..." consolidé ("Paramétrer la vue"), des filtres rapides
(chips) + "Filtre avancé" replié, et deux tableaux aux colonnes
différentes (Contact avec Sources/Confiance/Fraîcheur, Entreprise avec
Sources/Complétude) — contre 3 pages séparées, des icônes ⧉/✎/× éparses,
un panneau de filtres toujours visible et une seule table fusionnée sans
notion de Sources/Confiance/Fraîcheur chez nous.

3 décisions de cadrage confirmées par Loïc avant de corriger : (1) "Vue
globale" devient l'onglet "Contacts" (même grain, recolonné) plutôt qu'un
3ème onglet séparé ; (2) une vraie fraîcheur d'enrichissement est ajoutée
(nouvelle colonne `updated_at`), et "Confiance" réutilise les vrais % de
complétude déjà calculés plutôt qu'un chiffre inventé (cohérent avec la
règle du repo "jamais de faux chiffre", déjà appliquée dans
`packages/config/src/integrations.ts`) ; (3) corriger aussi les dossiers
de segments (`Lists.tsx`), même erreur de pattern reproduite là aussi.

**Fraîcheur réelle** : migration `039_contact_company_freshness.sql`
(**écrite, non appliquée**) ajoute `updated_at` sur `contacts`/
`companies` (backfill depuis `created_at`, puis défaut `now()` pour les
nouvelles lignes). `supabase/functions/enrich-pappers/index.ts` et
`enrich-dropcontact/index.ts` bumpent désormais `updated_at` — **seuls**
points d'écriture qui le font (vérifié : `services/*.ts#update*`, les
formulaires d'édition manuelle, sont des chemins distincts, non touchés
— sinon la "fraîcheur" ne voudrait plus rien dire). Nouveau
`lib/dataFreshness.ts#formatFreshnessDays` (+ tests). Nouveau
`lib/quickFilters.ts` : prédicats purs honnêtes pour les chips
(`isEmailVerified`, `hasPhone`, `hasSiren`, `isCompleteAbove`,
`isFreshUnderDays`) + tests.

**Écran unifié** : `pages/ProspectsList.tsx` est désormais l'unique
écran Prospects — bascule "Contacts N / Entreprises N" en haut (remplace
la sous-navigation `ProspectSubNav`, supprimée). Routes `/contacts` et
`/companies` deviennent des redirections vers `/?view=contacts` /
`/?view=companies` (même pattern que `/pipeline` → `/?view=kanban`,
S33-2) — `pages/Contacts.tsx`/`pages/Companies.tsx` ne sont plus des
pages, juste des redirections (mêmes fichiers, contenu remplacé, liens
existants non cassés). Le contenu réel de l'ancienne page Entreprises
est porté dans le nouveau `components/prospects/EntreprisesPanel.tsx`
(segments réels via `useCompanyLists`, import/export, bulk-ajout à une
liste — tout préservé, juste déplacé). Le client DMH suit maintenant le
sélecteur global du Header (`useSelectedClient`) au lieu d'un `<select>`
local — corrige une incohérence documentée depuis S34-4/5.

L'onglet "Contacts" reprend le grain de "Vue globale" (recolonné :
Contact/Société/Coordonnées/Source/Confiance/Fraîcheur/Statut, colonnes
Score IA/Client DMH/Dernière activité déplacées en optionnelles via
"Modifier les colonnes" — rien supprimé, juste plus proche du mockup par
défaut). **Découverte en cours de route** : `pages/Contacts.tsx` avait
son propre système de segments réels (`useContactLists`, dynamique/
statique) totalement séparé de "Vue globale" — porté dans le tiroir
"+ Filtre avancé" (dropdown Segment + création inline), avec une action
bulk "Ajouter à un segment" dans la barre de sélection multiple, pour ne
rien perdre de cette fonctionnalité réelle lors de la fusion.

**Menu de vue consolidé** : nouveau `components/ViewActionsMenu.tsx` (un
bouton "..." + dropdown, réutilise `DropdownMenu`/`DropdownMenuItem`
existants) remplace les icônes ⧉/✎/× dispersées — sur `ProspectsList.tsx`
(agit sur la vue actuellement sélectionnée : Modifier les colonnes/
Partager le lien/Cloner/Renommer/Supprimer) et sur `Lists.tsx` (dossiers
racine et sous-dossiers : Dupliquer/Renommer/Supprimer — le `<select>`
"Déplacer vers" des sous-dossiers reste séparé, ce n'est pas une action
mais un contrôle de valeur).

**Filtres rapides (chips) + Filtre avancé** : Statuts/Score min-max/
Secteur (+ désormais Segment) passent derrière un bouton "+ Filtre
avancé", replié par défaut, au lieu d'être toujours visibles. 3 chips
réels par onglet (Email vérifié/Téléphone direct/Fraîcheur < 7j pour
Contacts ; SIREN connu/Complétude ≥ 80%/Fraîcheur < 7j pour Entreprises),
chacun avec un compteur réel, aucun chiffre inventé.

**Limite assumée** : les onglets de vues enregistrées (avec compteurs)
et le menu "..." consolidé ne couvrent que l'onglet Contacts — l'onglet
Entreprises garde son filtre par segment simple (pas de vues nommées
multiples), un choix de cadrage délibéré pour ne pas dupliquer
`savedViews.ts` en une variante "entreprises" ce soir.

Vérifié : `pnpm --filter crm typecheck`/`test` (76 fichiers, 546 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts, `vite build` réussi
(bundle de prod généré sans erreur). Migration `039` **appliquée et
vérifiée en production le 2026-09-11** (`updated_at` confirmée sur
`contacts`/`companies` via `supabase db query --linked`), confirmation
explicite de Loïc — `enrich-pappers` et `enrich-dropcontact` redéployés
dans la foulée (mêmes confirmations).

## 2026-09-11 (suite) — Audit des 12 écrans Claude Design + Nature A/B

Loïc a demandé de faire le tour de **toutes** les pages du mockup Claude
Design ("Relais CRM", Delphine — utilisatrice finale) et de vérifier la
conformité exacte de la prod. 4 agents d'audit ont lu les 12 écrans
(`Relais CRM.dc.html` : Dashboard, Contacts, Tâches, Segments, Fiche
contact, Pipeline, Campagne Email, Automatisation, Intégrations,
Mapping, Reporting, Paramètres) et comparé chacun à sa page React.

**Deux natures d'écart** : Nature A (mécanique — le pattern "onglets de
vues + menu '...' consolidé + filtres rapides + colonnes paramétrables",
construit une seule fois pour Prospects/Contacts, pas répliqué ailleurs)
et Nature B (vraies fonctionnalités neuves touchant le modèle de
données/les rôles/des sujets non tranchés).

4 questions posées à Loïc, réponses actées :
1. Nature A d'abord ce soir/cette session ; Nature B fait l'objet d'un
   plan séparé à cadrer plus tard.
2. **Campagne Email** (éditeur WYSIWYG glisser-déposer, audience/envoi
   programmable) : à vérifier avec Delphine/William avant de s'engager
   — notre pipeline réel envoie via Lemlist (brief §1.2.1), pas construit.
3. **Paramètres** (équipe/rôles/sièges, réglages portail client,
   registre de conformité RGPD — écran **entièrement absent** de la
   prod aujourd'hui) : reporté à une phase ultérieure du brief.
4. **Fiche Contact — provenance par champ** (Source/Confiance/Âge PAR
   CHAMP + résolution de conflit multi-fournisseurs) : confirmé comme
   un vrai besoin à construire, malgré l'absence de cas de conflit réel
   aujourd'hui (un seul fournisseur actif par domaine : Pappers pour le
   légal, Dropcontact pour les coordonnées).

**Nature B — explicitement documentée, pas construite** :
- **Campagne Email** : le mockup montre un vrai éditeur de séquence
  (glisser-déposer de blocs, aperçu WYSIWYG, panneaux audience/envoi,
  "Aperçu mobile"/"Test A/B"). `Campaigns.tsx` est aujourd'hui un
  tableau de bord passif de stats LinkedIn (leads/connectés/réponses),
  pas un éditeur — écart de nature, pas d'habillage. Pas construit,
  à vérifier avec Delphine/William.
- **Automatisation** : le mockup montre un canvas visuel (nœuds
  connectés, branches Oui/Non graphiques), une cascade multi-
  fournisseurs avec fallback ("on s'arrête au premier qui renvoie une
  donnée valide"), et un panneau "Garde-fous" (plafond quotidien de
  crédits, délai anti-ré-enrichissement, seuil de confiance minimal,
  journal RGPD). `Automations.tsx` est un formulaire linéaire (pas un
  canvas), le moteur ne supporte qu'un seul fournisseur par action
  (migration 030) et ne peut structurellement pas brancher sur le
  résultat d'un enrichissement dans la même règle (asynchrone,
  documenté dès la migration 030). Pas construit — chantier à part
  entière.
- **Mapping** : le mockup montre un écran de **configuration** (table
  Champ CRM ↔ cascade de fournisseurs éditable, coût/appel, règles de
  conflit, carte "Consommation estimée"). `EnrichmentMapping.tsx` est
  une vue **lecture seule** d'un pipeline fixe à 2 étapes (déjà
  documenté comme tel dans son propre code). Pas construit.
- **Reporting** : le mockup montre une bibliothèque de rapports
  multiples/paramétrables (onglets, filtres Propriétaire/Plage de
  dates, cartes de rapports avec sparkline) + une carte "Diffusion
  client" (portail/PDF/masquage des coordonnées). `Reporting.tsx` est
  une page de stats fixes sans filtre. Recouvre une bonne partie de ce
  qu'on vient de construire pour Dashboard (S34-15) — à cadrer
  ensemble plutôt qu'en double emploi, pas construit maintenant.
- **Paramètres** : écran absent de la prod. Aucune des 3 pages
  "Réglages"/"Mon calendrier"/"Aide" ne couvre la gestion d'équipe
  (rôles, sièges, invitations), les réglages de portail client
  (visibilité activité, masquage coordonnées, export sur demande) ou
  la conformité RGPD (journal d'audit, registre téléchargeable) que
  montre le mockup — reporté à une phase ultérieure du brief.

**Nature A — en cours ce soir** (composants partagés d'abord) :

**S35-1 (composants partagés)** — 3 nouveaux composants réutilisables,
extraits de `ProspectsList.tsx`/`EntreprisesPanel.tsx` (le pattern est
maintenant utilisé 2 fois, sera utilisé sur Segments/Tâches/Pipeline
ensuite — extraction justifiée, pas prématurée) :
- `components/SavedViewTabs.tsx` : rangée d'onglets (système + vues
  utilisateur) + menu "..." consolidé, piloté par props.
- `components/QuickFilterChips.tsx` : chips à bascule + compteur +
  tiroir "Filtre avancé" replié + "Réinitialiser".
- `components/CompletenessBar.tsx` : barre + % (Confiance/Complétude).
- `lib/savedViews.ts` : généralisé (`SavedView<F>` générique, clé de
  stockage localStorage paramétrée) au lieu d'être figé sur
  `ProspectFilters` — les fonctions pures existantes ne changent pas de
  comportement, testées à nouveau (aller-retour sous 2 clés distinctes).
`ProspectsList.tsx` migré sur ces 3 composants (aucun changement de
comportement, dé-duplication uniquement — vérifié par les tests
existants qui passent toujours).

**S35-2 (Entreprises alignée sur Contacts)** — l'audit a confirmé que le
mockup partage EXACTEMENT le même bandeau (onglets de vues + menu "...")
entre Contacts et Entreprises, alors que seul Contacts l'avait reçu.
`EntreprisesPanel.tsx` : ajout de `SavedViewTabs` (vues sauvegardées
propres aux entreprises, clé localStorage `dmh-crm-saved-views-companies`,
distincte de celle des contacts) + `ViewActionsMenu` (Partager le
lien/Dupliquer/Renommer/Supprimer — pas de "Modifier les colonnes", ce
tableau n'a pas encore de colonnes paramétrables). Colonnes ajoutées :
**Source** (badge "Pappers" si `siren` renseigné — signal réel d'un
enrichissement Pappers déjà passé, pas de champ `data_source` sur
`companies` donc pas de badge multi-source fabriqué) et **Statut**
(repris du prospect lié à l'entreprise quand il existe — une entreprise
n'a pas de statut pipeline propre). "Complétude" passe en barre visuelle
(`CompletenessBar`) au lieu d'un texte brut. Bouton "Importer" devient
"Importer des entreprises" (libellé dynamique par entité, comme demandé).
**Non fait** : chips "Effectif ≥ 100"/"≥ 2 décideurs"/"Loire (42)"
suggérés par le mockup — `employee_range` est une chaîne à tranches
(format Pappers, pas un nombre exploitable simplement), "≥ 2 décideurs"
suppose une classification de rôle décisionnaire qu'on n'a pas, "Loire
(42)" est une donnée de démo non généralisable — aucun chiffre inventé
pour ces trois-là, chips omis plutôt que fabriqués.

Vérifié : `pnpm --filter crm typecheck`/`test` (76 fichiers, 547 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts, `vite build` réussi.
Aucune migration pour S35-1/S35-2.

**S35-3 (Dashboard)** : bascule remplacée par un menu déroulant (nom du
dashboard actif + liste + "+ Créer un tableau de bord"), plus fidèle au
mockup que la rangée de pastilles précédente — les dashboards restent
personnels (décision déjà actée, pas de partage équipe). Nouveau
`lib/dashboardFilters.ts` (`isWithinDateRange`/`matchesOwner`/
`filterByOwnerAndDate`, purs + testés) : filtre Propriétaire + Plage de
dates appliqué une seule fois, en amont, sur les tableaux bruts
(`rawProspects`/`rawDeals`/`rawInteractions`/`rawMeetings`/`rawTasks`
→ `prospects`/`deals`/`interactions`/`meetings`/`tasks` filtrés) — tous
les blocs existants continuent de consommer ces noms de variables sans
changer leur propre logique de calcul. **Limite assumée** : `deals` n'a
pas encore de propriétaire (`assigned_to` arrive avec le chantier
Pipeline, migration 041 pas encore écrite) donc seule la plage de dates
s'y applique ; pas de "+ Filtres avancés" (secteur/étape pipe) — se
câbleraient différemment par bloc, non proportionné ce soir, filtre
simplifié à Propriétaire+dates seulement (documenté, pas un oubli).
"Actualisé il y a X min" + bouton rafraîchir : nouveau `reload` ajouté
à `useDeals`/`useAllInteractions`/`useStatusHistory` (suivaient le même
pattern que `useMeetings`/`useTasks` mais sans `reload` exposé) pour que
le rafraîchissement recharge vraiment tout. Menus "Partager" (Copier
l'URL/Exporter en PDF — pas "Envoyer par email", toujours bloqué faute
de fournisseur transactionnel, S34-16bis) et "Actions" (Plein écran via
la Fullscreen API native/Cloner/Renommer/Supprimer) consolidés en
dropdowns dans le `PageHeader`. Nouveau bloc catalogue
"File d'enrichissement" (`lib/dashboardBlocks.ts`) : compte réel de
prospects en attente à chaque étape (`to_enrich`→Pappers,
`enriched_pappers`→Dropcontact) — pas de quota/usage fournisseur (non
tracé en base, même limite déjà documentée sur `Integrations.tsx`).

Vérifié : `pnpm --filter crm typecheck`/`test` (77 fichiers, 554 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts, `vite build` réussi.
Aucune migration.

**S35-4 (Segments)** : même bandeau de vues + menu "..." qu'ailleurs
(vues sauvegardées propres aux segments, clé localStorage
`dmh-crm-saved-views-segments`). Découverte utile : `*_lists.updated_at`
existe réellement en base depuis S31 et était déjà sélectionné
(`LIST_SELECT`) mais jamais exposé dans `ListOverviewRow` — un
commentaire du code disait même l'inverse ("pas de vraie date de
dernière modification"), commentaire devenu faux et corrigé.
`lib/listsOverview.ts` expose maintenant `updatedAt`/`createdBy`.
Filtres rapides (chips, tous réels) : Listes dynamiques/Listes statiques
(pilotent le `filterMode` existant, pas un doublon d'état), Les miennes
(`createdBy` = utilisateur courant), Enrichies > 90%
(`enrichmentRate`, déjà calculé), Non travaillée 14j (nouveau
`isStaleOverDays` dans `lib/quickFilters.ts`, complément de
`isFreshUnderDays`). Colonnes paramétrables (Mode/Client/Dossier/
Membres/Enrichis/Créée le, checklist simple sans réordonnancement —
pas de drag-and-drop ici, proportionné au besoin). "Enrichis" passe en
`CompletenessBar`. Le filtre par dossier (arbre latéral, colonne
"Client DMH" du panneau existant) reste séparé de ce bandeau — logique
différente (sélection dans un arbre, pas une vue sauvegardable), pas de
changement là.

Vérifié : `pnpm --filter crm typecheck`/`test` (77 fichiers, 556 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts, `vite build` réussi.
Aucune migration.

**S35-5 (Tâches)** : migration `040_task_type_priority_origin.sql`
(**écrite, non appliquée**) ajoute `tasks.task_type` (enum appel/email/
rdv/donnée, **nullable** — pas de rétro-remplissage inventé sur les
tâches déjà créées), `tasks.priority` (enum basse/normale/haute, défaut
'normale'), `tasks.origin` (texte, défaut 'manual'). `run_automation_rules()`
redéfinie (identique à la version de la migration 035, seul ajout :
`origin = 'automation'` sur les tâches qu'elle crée) — jamais mis par un
formulaire manuel. `AddTaskDialog`/`EditTaskDialog` gagnent les champs
Type/Priorité (optionnels).

Onglets système (calculés, pas des vues sauvegardées — À faire/En
retard/Aujourd'hui/Mes tâches/Terminées, nouveau `lib/taskFilters.ts`
+ tests) mélangés avec des vues personnalisées créées par l'utilisateur
(même `SavedViewTabs`/`ViewActionsMenu` qu'ailleurs, clé localStorage
`dmh-crm-saved-views-tasks`) — Cloner/Renommer/Supprimer seulement sur
une vue utilisateur, jamais sur un onglet système. Filtres rapides
(chips) : Appels/Emails/RDV/Données (OU entre eux, sur `task_type`),
Priorité haute, Générées automatiquement (sur `origin`) — pas de
"+ Filtre avancé" supplémentaire, les onglets+chips couvrent déjà tous
les critères réels disponibles. Colonnes Type/Priorité/Origine ajoutées
au tableau. **Case à cocher de sélection multiple : pas ajoutée** — le
mockup la montre mais ne définit aucune action de masse dessus, et on
a déjà "Dépiler" comme mécanisme de traitement en lot des tâches ; une
case sans action rattachée aurait été une coquille vide (contraire à
"pas d'implémentation à moitié faite").

Widgets annexes : "Charge de l'équipe" (par membre du staff, nombre de
tâches actives + en retard, données réelles) et "Génération automatique"
(texte + lien vers `/automations`).

Vérifié : `pnpm --filter crm typecheck`/`test` (78 fichiers, 566 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts, `vite build` réussi.
Migration `040` **appliquée et vérifiée en production le 2026-09-11**
(confirmation explicite de Loïc, colonnes confirmées via `supabase db
query --linked`).

**S35-6 (Pipeline/Opportunités)** : migration `041_deal_owner.sql`
(**écrite, non appliquée**) ajoute `deals.assigned_to` (nullable, pas de
rétro-affectation inventée). Chrome auparavant dupliqué entre Liste et
Kanban (chacun son propre sélecteur Client DMH) unifié : un seul
`SavedViewTabs` (onglets système Toutes les affaires/Mes affaires/Grands
comptes/À relancer/Gagnées ce trimestre + vues perso, clé localStorage
`dmh-crm-saved-views-opportunities`) + un seul `QuickFilterChips` (Mon
portefeuille/Montant ≥ 100k€/Proba. ≥ 60%/Sans mouvement 30j/Ouvertes
< 10j — nouveau `lib/dealFilters.ts` + tests) + une seule ligne "Pipe
pondéré", partagés entre les deux vues — seul le corps change. Le
sélecteur Client DMH local (dupliqué dans les deux vues) est supprimé :
redondant avec le sélecteur global du Header (`useSelectedClient`),
déjà branché mais pas encore nettoyé sur cette page avant ce soir.

Nouvelle colonne "Pondéré" par ligne (`computeDealWeightedValue`,
nouvelle fonction pure + tests, complément par-deal de
`computeWeightedPipelineValue`) et "Commercial" (`assigned_to`).
"Grouper par client" (booléen) généralisé en "Regrouper par" (Aucun/
Compte client/Commercial) — l'option "Compte client" disparaît quand un
client est déjà sélectionné (grouper par un seul client n'aurait pas de
sens). `AddDealDialog.tsx` gagne un champ "Commercial" optionnel.

Vérifié : `pnpm --filter crm typecheck`/`test` (81 fichiers, 578 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts, `vite build` réussi.
Migration `041` **appliquée et vérifiée en production le 2026-09-11**
(confirmation explicite de Loïc, colonne confirmée via `supabase db
query --linked`).

**S35-7 (Fiche Contact — provenance par champ)** : dernier point du plan
de correction, confirmé "vrai besoin" par Loïc malgré l'absence de cas
de conflit réel aujourd'hui (Pappers écrit les champs entreprise,
Dropcontact l'email contact — jamais le même champ, donc le mécanisme
de conflit ne peut pas se déclencher en pratique, mais gère le cas
général si un 2e fournisseur par champ arrive un jour).

Migration `042_field_provenance.sql` (**écrite, non appliquée**) : table
`field_provenance` (client_id dénormalisé, comme `automation_rules`, pour
un RLS à 2 politiques simple ; une ligne par (champ, fournisseur), pas
par champ seul — c'est justement ce qui permet de détecter un conflit
plutôt que la dernière écriture qui écraserait silencieusement).
`enrich-pappers`/`enrich-dropcontact` écrivent désormais ces lignes en
plus de la mise à jour directe des colonnes (best-effort, n'échoue jamais
l'enrichissement) : Pappers avec confiance 100 (donnée de registre
légal, aucune ambiguïté) sur siren/naf_label/employee_range/revenue/
website ; Dropcontact avec confiance dérivée de `email_confidence`
(valid=95/accept=75/risky=40/not_found=0, jamais un chiffre inventé) sur
email.

Nouveau `lib/fieldProvenance.ts#groupFieldProvenance` (pur, testé) :
regroupe par champ, détecte un conflit (2+ fournisseurs, valeurs
différentes), calcule l'âge en jours. `ContactDetail.tsx` : nouveau bloc
"Champs enrichis" (Champ/Valeur/Source/Confiance/Âge) sous la carte
Société, visible seulement en mode Force de vente (`!masked` — la table
n'a de toute façon aucune policy RLS `client_user_access`, un compte
portail client ne pourrait rien y lire). Un badge "Conflit" s'affiche si
2 fournisseurs ont écrit des valeurs différentes pour le même champ
(valeur la plus récente affichée) — **pas de dialogue d'arbitrage
construit** : aucun cas réel à tester aujourd'hui, un tel dialogue aurait
été spéculatif.

**Non fait, découverte pendant l'implémentation** : le bouton "Séquence"
(mise en séquence Smartlead) suggéré par le mockup à côté d'"Appeler"/
"Enrichir" — aucune action "ajouter à une campagne Smartlead" n'existe
nulle part dans le code (`Integrations.tsx` référence juste le
fournisseur configuré). Construire ce bouton est un nouveau chantier
d'intégration à part entière, pas un simple ajout de bouton — pas fait
ce soir, à cadrer séparément si confirmé prioritaire.

Vérifié : `pnpm --filter crm typecheck`/`test` (82 fichiers, 583 tests)
verts, `pnpm typecheck`/`pnpm test` racine verts, `vite build` réussi.
Migration `042` **appliquée et vérifiée en production le 2026-09-11**
(confirmation explicite de Loïc, table confirmée via `supabase db query
--linked`) — `enrich-pappers`/`enrich-dropcontact` redéployés dans la
foulée (mêmes confirmations).

## Fin du plan de correction Claude Design (audit des 12 écrans)

Toute la Nature A (mécanique, S35-1 à S35-7) est terminée. La Nature B
(Campagne Email, Automatisation, Mapping, Reporting, Paramètres) reste
explicitement documentée plus haut comme reportée/à cadrer avec Loïc,
Delphine et William avant de commencer quoi que ce soit dessus.
