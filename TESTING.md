# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : 🔄 Session de tests de fin de lot S38 (CR réunion Delphine/Loïc du 17/09)

Décision de Loïc du 2026-09-23 : « fais toutes les tâches et je ferai les
tests à la fin ». Tout le lot S38 est codé, testé unitairement (crm 697 tests,
racine verte) et poussé. **Toutes les migrations sont déjà appliquées en
production** (044 à 048) — rien à faire côté infra avant de tester.

Déjà validé (pas à refaire) : **S38-1** (création de fiches réparée, 6/6 en
production) et le **moteur de S38-10** (test de fumée 7/7 en production).
S37 est remplacé par S38-6 (le bouton "Appliquer le modèle" n'existe plus).

**Préparation** : un client DMH de test, et deux petits fichiers CSV.

`test-contacts.csv` :

```
Prénom,Nom,Entreprise,Email,Secteur d'activité
Alice,Test,ZZ Test S38,alice@acme.test,Industrie
Bob,Test,ZZ Test S38,acmetest.test,BTP
Claire,Test,ZZ Test S38,claire @acme.test,Industrie
```

`test-entreprises.csv` :

```
Nom,Ville,Effectif estimé
ZZ Test S38,Lyon,120
ZZ Autre S38,,45
```

## A. Import (S38-2, S38-3, S38-4, S38-5 + agent d'import S36)

| # | Test | Résultat attendu |
|---|---|---|
| A1 | Prospects → bascule Contacts → "Importer" | Ouverture d'une **page plein écran** (`/import/contacts`), plus une fenêtre |
| A2 | Cliquer "Télécharger le modèle CSV" | Un fichier `modele-import-contacts.csv` avec les en-têtes Prénom, Nom, Poste, Email, URL LinkedIn, Entreprise + une ligne d'exemple ; réimporté, toutes ses colonnes sont reconnues automatiquement |
| A3 | Choisir le client, charger `test-contacts.csv` | Deux panneaux : champs groupés "Propriétés du contact" / "Propriétés de l'entreprise" avec ✓ (associé) / ○ (non associé, rouge si obligatoire) ; tableau "Colonnes du fichier" avec un exemple de valeur et le statut ("Secteur d'activité" → "○ à configurer à l'étape suivante") |
| A4 | Continuer | Assistant des colonnes non reconnues (S36) pour "Secteur d'activité", avec suggestion Claude ; choisir "Créer un nouveau champ" (liste déroulante) |
| A5 | Arrivée au récapitulatif | Sélecteur **"Base juridique du traitement (RGPD)"** pré-réglé sur "Intérêt légitime — prospect" ; choix "Si un contact existe déjà" (Ignorer / Compléter / Écraser) ; encadré rouge listant les 2 emails mal formés (lignes 3 et 4) |
| A6 | Ligne 3 : taper `bob@acme` | Bordure rouge, "Corriger" grisé |
| A7 | Ligne 3 : `bob@acme.test` → Corriger ; ligne 4 : "Importer sans email" | L'encadré disparaît, "3 à créer" |
| A8 | Importer | Retour automatique à Prospects ; toast "3 contact(s) créé(s), 1 entreprise(s) créée(s)." |
| A9 | Ouvrir la fiche de Bob | Base juridique RGPD = "Intérêt légitime — prospect" (modifiable) ; champ "Secteur d'activité" = BTP dans "Champs personnalisés" |
| A10 | Réimporter `test-contacts.csv` avec Alice modifiée (ex. ajouter une colonne Poste = "CTO" pour Alice), politique **"Compléter les champs vides"** | Récapitulatif "… fiche(s) existante(s) à mettre à jour" ; après import, le poste d'Alice est renseigné. Refaire avec un autre poste en "Compléter" → **inchangé** ; en "Écraser" → remplacé |
| A11 | Politique "Ignorer" sur le même fichier | Les contacts existants sont comptés "ignorés", rien n'est modifié |
| A12 | Entreprises → "Importer des entreprises" avec `test-entreprises.csv` | Même page plein écran, un seul groupe "Propriétés de l'entreprise", pas de sélecteur RGPD ; "ZZ Test S38" (déjà créée en A8) proposée en mise à jour selon la politique, "ZZ Autre S38" créée |
| A13 | Si une ligne échoue à l'écriture | La page reste affichée avec le **vrai message d'erreur** et les numéros de ligne (plus un simple compteur) |

## B. Champs (S38-6, S38-7)

| # | Test | Résultat attendu |
|---|---|---|
| B1 | Paramètres → Champs personnalisés, sans client choisi | Les 8 champs de la fiche de prospection apparaissent avec la portée **"Système"** (1 côté Contacts : Rôle décisionnel ; 7 côté Entreprises) ; plus de bouton "Appliquer le modèle" |
| B2 | Choisir un client | Seuls les champs système + ceux de ce client s'affichent (plus ceux des autres clients) |
| B3 | Entreprises → "Grille de qualification" → Modifier (client choisi) | Libellé non modifiable (champ système) ; options éditables : renommer "Critère 1 — à définir" en "Budget identifié", supprimer "Critère 4", ajouter "Décideur rencontré", réordonner ↑↓ ; avertissement rouge pour l'option supprimée |
| B4 | Enregistrer, puis ouvrir une fiche entreprise de ce client | Les nouvelles options apparaissent ; une fiche qui avait "Critère 1" coché affiche désormais "Budget identifié" coché (report automatique) |
| B5 | Ouvrir une fiche entreprise d'un **autre** client | Options par défaut inchangées ("Critère 1 — à définir"…) |
| B6 | Modifier un champ personnalisé (non système) | Libellé et options modifiables |
| B7 | Modifier les options d'un champ système **sans** client choisi | Édition bloquée avec un message ("Choisis d'abord un client…") |
| B8 | Fiche contact / fiche entreprise | Deux cartes distinctes : "Fiche de prospection" (champs système) et "Champs personnalisés" (du client uniquement — avant ce lot, les champs de tous les clients s'affichaient) |

## C. Fiche entreprise (S38-8, S38-9)

| # | Test | Résultat attendu |
|---|---|---|
| C1 | Ouvrir une fiche entreprise sur un grand écran | 3 colonnes : gauche (En bref + actions rapides, Informations, Pappers, Fiche de prospection, Champs personnalisés), centre (Historique), droite (Contacts, Opportunités, Groupe, Tâches, Liste assignée, Rendez-vous) ; sur écran étroit, colonnes empilées |
| C2 | Actions rapides "Note" puis "Appel" | Un compositeur s'ouvre au-dessus de l'historique (choix du contact si plusieurs) ; après enregistrement, l'événement apparaît dans l'historique avec le contact et l'auteur |
| C3 | Entreprise sans prospect | "Note"/"Appel" grisés avec une explication au survol |
| C4 | "Email" | Liste des contacts liés ayant un email, liens `mailto:` |
| C5 | "Tâche" | Fenêtre de création pré-remplie avec le client et l'entreprise |
| C6 | "Réunion" | Fenêtre de rendez-vous pré-remplie (grisé si aucun calendrier connecté) |
| C7 | Filtres de l'historique (Tout / Échanges / Statuts / Rendez-vous) | L'historique se filtre |
| C8 | "Personnaliser la fiche" → masquer "Données Pappers", déplacer "Contacts" en colonne gauche, monter "Historique"… → Enregistrer | La fiche se réorganise ; **toutes les fiches entreprise de ce client** suivent cette composition |
| C9 | Ajouter un bloc personnalisé "Incidents substances toxiques" avec 1-2 champs du client | Le bloc apparaît avec ces champs, et ils ne sont plus répétés dans "Champs personnalisés" |
| C10 | Ouvrir une fiche entreprise d'un autre client | Affichage par défaut (ou sa propre composition) — aucune fuite entre clients |
| C11 | Masquer "Historique", puis cliquer "Note" | Le compositeur s'affiche sous les actions rapides |
| C12 | "Revenir à l'affichage par défaut" | Disposition d'origine rétablie pour ce client |

## D. Automatisation (S38-10)

| # | Test | Résultat attendu |
|---|---|---|
| D1 | Automatisations → client → entité "Prospect" → déclencheur "Au changement de statut" | Sélecteur de statut cible disponible (option grisée pour les autres entités) |
| D2 | Créer : statut cible "Contact enrichi", action "Créer une tâche" type **Appel**, échéance 1 jour | Règle listée : « Quand le statut passe à "Contact enrichi" » → « Créer tâche (Appel) : "…" » |
| D3 | Faire passer un prospect de ce client en "Contact enrichi" (enrichissement Dropcontact réel, ou changement manuel de statut) | Une tâche d'appel apparaît dans Tâches (origine Automatisation), rattachée au contact **et** à l'entreprise |

## E. Finitions graphiques (S38-11)

| # | Test | Résultat attendu |
|---|---|---|
| E1 | Kanban Prospects et Opportunités | Cartes au trait, sans ombre ni fond de carte |
| E2 | Boutons de bascule (Liste/Kanban, Contacts/Entreprises, Statique/Dynamique, dossiers de Segments, Liste/Calendrier des tâches) | Coins carrés, comme le reste du design |
| E3 | Mode sombre : alerte "stagnant" (Kanban, fiche), pastilles d'état des Intégrations, badge de notifications, bouton de suppression d'un contact, tendance des KPI du Dashboard | Couleurs du thème (plus de rouge/jaune/vert codés en dur), lisibles dans les deux modes |

## Nettoyage après test

Supprimer les contacts Alice/Bob/Claire Test, les entreprises "ZZ Test S38" /
"ZZ Autre S38", le champ "Secteur d'activité" créé en A4, la règle
d'automatisation D2 et la tâche générée en D3.
