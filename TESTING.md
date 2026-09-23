# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : 🔄 S38-1 (correctif bloquant) + S36 + S37 en attente de validation navigateur

## S38-1 — Création de fiches cassée depuis le 07/09 (migration 044)

Toute insertion de contact/entreprise/prospect/tâche échouait en production
(`record "new" has no field "stage_id"`, régression de la migration 018).
C'est la vraie cause du "0 contact créé" de la démo du 18/09.

**Prérequis** : migration `044_fix_automation_stage_field_access_regression.sql`
appliquée en production (`pnpm exec supabase db push`) — à faire après ta
confirmation.

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Créer un contact à la main (+ Nouveau → Contact) | Contact créé, visible dans Prospects |
| 2 | Créer une entreprise à la main | Entreprise créée |
| 3 | Créer une tâche à la main | Tâche créée |
| 4 | Rejouer l'import CSV d'entreprises de la démo (colonne "Effectif estimé") | N entreprise(s) créée(s), valeurs "Effectif estimé" visibles sur les fiches |
| 5 | Rejouer l'import CSV de contacts de la démo | N contact(s) créé(s) (plus de "0 contact créé") |
| 6 | Déplacer une opportunité d'étape dans le Kanban | Toujours fonctionnel (seule table où `stage_id` existe) |
| 7 | (si une ligne échoue encore) Lire le message dans la fenêtre d'import | La fenêtre reste ouverte et affiche le message d'erreur réel avec les numéros de ligne, au lieu d'un simple compteur |


## S36 — Agent d'import intelligent (colonnes non standard, Contacts/Entreprises)

Nouvelle fonctionnalité (demande de Delphine relayée par Loïc le 2026-09-17) :
lors d'un import CSV de Contacts ou d'Entreprises (`ImportEntitiesDialog`),
les colonnes du fichier qui ne correspondent à aucun champ standard ne sont
plus silencieusement ignorées. Un wizard séquentiel, pré-rempli par une
analyse Claude (Edge Function `analyze-import-columns`, code + tests
unitaires verts), guide l'utilisateur colonne par colonne pour décider de
les ignorer, les rattacher à un champ personnalisé existant, ou en créer un
nouveau. **Aucune migration SQL** : tout passe par
`custom_field_definitions`/`custom_field_values` (S9) déjà en place.

**Prérequis** : ✅ déjà faits — l'Edge Function `analyze-import-columns` est
déployée en production (2026-09-17) et `ANTHROPIC_API_KEY` était déjà
configurée comme secret Supabase (réutilisée par `score-prospect`/
`generate-messages`). Rien à faire côté infra avant de tester.

### Protocole de test

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Importer un CSV de contacts avec une colonne exotique (ex. "Secteur d'activité" avec des valeurs comme "Industrie"/"BTP") sans qu'aucun champ personnalisé n'existe encore pour ce client | Après "Continuer", un écran "Analyse des colonnes non reconnues en cours…" puis le wizard affiche la colonne avec une suggestion Claude cohérente (probablement "Créer un nouveau champ" avec un libellé/type pertinent) |
| 2 | Créer d'abord un champ personnalisé "Secteur" (type Texte) pour ce client via `/settings` (page Champs personnalisés), puis relancer le même import | La suggestion Claude doit privilégier "Rattacher à un champ existant" → "Secteur", pas la création d'un doublon |
| 3 | Dans le wizard, changer manuellement l'action suggérée (ex. passer de "Créer un nouveau champ" à "Ignorer") puis cliquer "Suivant"/"Terminer" | La décision manuelle est bien celle appliquée à l'étape de récapitulatif, pas la suggestion d'origine |
| 4 | Importer un CSV d'entreprises avec une colonne exotique (ex. "Effectif estimé") | Même comportement que pour les contacts, côté Entreprises (champs personnalisés `entity_type = "company"`, indépendants de ceux des contacts) |
| 5 | Dans le wizard, cliquer "Annuler" à la première colonne | Retour à l'étape de mapping (étape 1), aucune écriture en base |
| 6 | Aller jusqu'à l'étape de récapitulatif puis fermer la modale (bouton "Annuler" du footer) sans cliquer "Importer" | Aucune ligne, aucun champ personnalisé, aucune valeur créés en base |
| 7 | Simuler une panne Claude (retirer temporairement `ANTHROPIC_API_KEY` des secrets de la fonction — ne pas "couper le réseau" : la plateforme serait elle-même inaccessible) puis relancer un import avec colonne exotique | Le wizard s'ouvre quand même, sans suggestion pré-remplie, avec un bandeau "Analyse automatique indisponible — configure chaque colonne manuellement" ; le parcours manuel (Ignorer / champ existant / nouveau champ) reste utilisable jusqu'au bout |
| 8 | Importer un CSV dont toutes les colonnes correspondent à des champs standards (aucune colonne orpheline) | Aucun changement de comportement perceptible : passage direct à l'étape de récapitulatif, comme avant cette fonctionnalité (pas de régression) |
| 9 | Après un import ayant créé un nouveau champ personnalisé, vérifier en base | `custom_field_definitions` contient la nouvelle définition (bon `client_id`/`entity_type`/`field_key`/`field_type`) et `custom_field_values` contient une ligne par fiche importée avec une valeur non vide pour cette colonne |
| 10 | Vérifier la fiche Contact/Entreprise créée dans le CRM (`CustomFieldsCard`) | La valeur importée est visible et éditable au même endroit que n'importe quel champ personnalisé créé manuellement |

### Hors périmètre de ce test (rappel)

- Pas de support Excel (.xlsx), CSV uniquement.
- Pas de notion de "notes historiques"/provenance/incident sur les champs
  personnalisés créés par l'agent (`field_provenance` reste indépendant,
  non branché ici) — sujet plus large évoqué avec Delphine, à cadrer
  séparément.
- Pas de tutoriel/onboarding guidé pour l'usage général de l'import (évoqué
  dans le même call, hors périmètre de ce lot).

## S37 — Modèle de fiche de prospection (fichier Delphine, `/settings`)

Nouveau bouton "Appliquer le modèle de fiche de prospection" en haut de la
page Champs personnalisés (`/settings`) : crée en un clic, pour le client
DMH sélectionné, les 7 champs personnalisés du gabarit générique envoyé par
Delphine (rôle décisionnel, niveau de chaleur, source du signal, référence
traçable, date du signal, offres concernées, grille de qualification).
**Aucune migration SQL**, aucun appel API externe — feature simple,
protocole de vérification visuelle uniquement.

**Prérequis** : aucun — fonctionnalité 100 % locale (pas de secret, pas
de déploiement).

### Protocole de test

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Aller sur `/settings` (Champs personnalisés), choisir un client DMH dans le sélecteur du formulaire "Ajouter un champ", cliquer "Appliquer le modèle de fiche de prospection" | Toast de résumé (ex. "7 champ(s) créé(s)."). Sur l'onglet "Contacts", le champ "Rôle décisionnel" (liste déroulante Décideur/Influenceur/Filtrant) apparaît dans le tableau |
| 2 | Basculer sur l'onglet "Entreprises" | Les 6 autres champs apparaissent : Niveau de chaleur, Source du signal, Référence traçable, Date du signal, Offres concernées, Grille de qualification, Besoins probables et angle d'accroche |
| 3 | Recliquer sur "Appliquer le modèle de fiche de prospection" pour le même client | Toast "0 champ(s) créé(s), 7 déjà existant(s)." — aucun doublon créé (idempotent) |
| 4 | Cliquer le bouton sans avoir choisi de client DMH | Le bouton est désactivé (grisé) tant qu'aucun client n'est sélectionné |
| 5 | Appliquer le modèle à un deuxième client DMH différent | Les 7 champs sont créés pour ce second client aussi, indépendamment du premier (pas de conflit de clé entre clients) |
| 6 | Ouvrir une fiche Contact du client concerné, vérifier le bloc champs personnalisés | "Rôle décisionnel" est éditable avec les 3 options (Décideur/Influenceur/Filtrant) |
| 7 | Ouvrir une fiche Entreprise du client concerné | "Niveau de chaleur" (COLD/WARM/HOT), "Offres concernées" et "Grille de qualification" sont éditables en choix multiples (tags), avec les libellés génériques ("Offre 1", "Critère 1 — à définir", etc.) — à renommer manuellement par client une fois les offres/critères réels connus (comme documenté dans le gabarit source) |

### Hors périmètre de ce test (rappel)

- Le bloc "Statut du compte" (Client DMH direct / rattaché à un compte
  prescripteur) du gabarit Delphine n'est pas construit — recoupe
  l'architecture clients DMH/finaux (Phase G), bloquée sur William.
- Pas de renommage automatique des libellés génériques d'offres/critères
  par client — reste une édition manuelle via `/settings` une fois les
  vraies offres/critères connus.
