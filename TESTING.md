# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : 🔄 Agent d'import intelligent (colonnes non standard, Contacts/Entreprises) — validation navigateur en attente

Nouvelle fonctionnalité (demande de Delphine relayée par Loïc le 2026-09-17) :
lors d'un import CSV de Contacts ou d'Entreprises (`ImportEntitiesDialog`),
les colonnes du fichier qui ne correspondent à aucun champ standard ne sont
plus silencieusement ignorées. Un wizard séquentiel, pré-rempli par une
analyse Claude (Edge Function `analyze-import-columns`, code + tests
unitaires verts), guide l'utilisateur colonne par colonne pour décider de
les ignorer, les rattacher à un champ personnalisé existant, ou en créer un
nouveau. **Aucune migration SQL** : tout passe par
`custom_field_definitions`/`custom_field_values` (S9) déjà en place.

**Prérequis avant de tester** :
- L'Edge Function `analyze-import-columns` doit être déployée sur le projet
  Supabase distant (`supabase functions deploy analyze-import-columns`) —
  elle n'existe pas encore en production.
- `ANTHROPIC_API_KEY` doit être configurée comme secret de cette fonction
  côté Supabase (`supabase secrets set`), en plus de `.env.local`.

### Protocole de test

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Importer un CSV de contacts avec une colonne exotique (ex. "Secteur d'activité" avec des valeurs comme "Industrie"/"BTP") sans qu'aucun champ personnalisé n'existe encore pour ce client | Après "Continuer", un écran "Analyse des colonnes non reconnues en cours…" puis le wizard affiche la colonne avec une suggestion Claude cohérente (probablement "Créer un nouveau champ" avec un libellé/type pertinent) |
| 2 | Créer d'abord un champ personnalisé "Secteur" (type Texte) pour ce client via `/settings` (page Champs personnalisés), puis relancer le même import | La suggestion Claude doit privilégier "Rattacher à un champ existant" → "Secteur", pas la création d'un doublon |
| 3 | Dans le wizard, changer manuellement l'action suggérée (ex. passer de "Créer un nouveau champ" à "Ignorer") puis cliquer "Suivant"/"Terminer" | La décision manuelle est bien celle appliquée à l'étape de récapitulatif, pas la suggestion d'origine |
| 4 | Importer un CSV d'entreprises avec une colonne exotique (ex. "Effectif estimé") | Même comportement que pour les contacts, côté Entreprises (champs personnalisés `entity_type = "company"`, indépendants de ceux des contacts) |
| 5 | Dans le wizard, cliquer "Annuler" à la première colonne | Retour à l'étape de mapping (étape 1), aucune écriture en base |
| 6 | Aller jusqu'à l'étape de récapitulatif puis fermer la modale (bouton "Annuler" du footer) sans cliquer "Importer" | Aucune ligne, aucun champ personnalisé, aucune valeur créés en base |
| 7 | Simuler une panne Claude (retirer temporairement `ANTHROPIC_API_KEY` du secret de la fonction, ou couper le réseau) puis relancer un import avec colonne exotique | Le wizard s'ouvre quand même, sans suggestion pré-remplie, avec un bandeau "Analyse automatique indisponible — configure chaque colonne manuellement" ; le parcours manuel (Ignorer / champ existant / nouveau champ) reste utilisable jusqu'au bout |
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
