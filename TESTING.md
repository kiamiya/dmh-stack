# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : 🔄 Lot S38 testé par Claude en production (2026-09-25) — correctif CORS écrit (2026-10-09), reste le redéploiement + 3 vérifications pour Loïc

Autorisation de Loïc du 2026-09-25 : « je t'autorise à faire tes tests sur la
prod, dans tous les cas nous n'avons aucune donnée réelle pour le moment ».

**Comment** : CRM lancé en local (Vite) branché sur le vrai Supabase, piloté
par un navigateur Chromium headless (Playwright, outillage jetable hors repo),
connecté avec un compte staff temporaire. Chaque résultat affiché à l'écran
a été recoupé en base quand il y avait une donnée. Données : le client
`[TEST Claude] Client de test` et un client temporaire `[TEST Claude] Client B
S38` (pour vérifier le cloisonnement entre clients).

**Nettoyage fait et vérifié** (0 restant) : contacts Alice/Bob/Claire Test,
entreprises ZZ Test S38 / ZZ Autre S38, prospects, note et appel, champ
« Secteur test S38 », surcharge d'options de la grille de qualification,
composition de fiche, 2 règles d'automatisation de test, tâche générée,
client B et son entreprise, compte staff temporaire.

Légende : ✅ passé · 🔧 écart trouvé et corrigé (code poussé) · ❌ écart
trouvé, **non corrigé** · 👤 reste à faire par Loïc

## 🔧 Agent d'import (S36) bloqué depuis le navigateur — corrigé côté code, redéploiement en attente

En A4 et A12, l'étape « colonnes non reconnues » affichait toujours « Analyse
automatique indisponible » : `analyze-import-columns` ne répondait pas au
preflight CORS (`OPTIONS` → 405), le navigateur bloquait l'appel. Même manque
sur `enrich-pappers` / `enrich-dropcontact` (bouton « Enrichir »).

**Décision de Loïc (2026-10-09)** : origine `*`, comme les autres fonctions
(l'authentification reste portée par le JWT). **Correctif** : module partagé
`packages/config/src/cors.ts` (testé) — `OPTIONS` → 204, en-têtes CORS sur
toutes les réponses, en-têtes autorisés `authorization, x-client-info,
apikey, content-type` (ceux qu'envoie `supabase.functions.invoke`).

**Reste** : redéployer les 3 fonctions (action distante, confirmation
explicite requise), puis je rejoue A4/A12 et un clic « Enrichir ».

## A. Import (S38-2, S38-3, S38-4, S38-5 + agent d'import S36)

| # | Test | Statut | Constaté |
|---|---|---|---|
| A1 | Prospects → Contacts → "Importer" | ✅ | Page plein écran `/import/contacts`, aucune fenêtre modale |
| A2 | Modèle CSV | ✅ | `modele-import-contacts.csv` : Prénom, Nom, Poste, Email, URL LinkedIn, Entreprise + ligne d'exemple ; réimporté : 6/6 colonnes reconnues automatiquement |
| A3 | Mapping | ✅ | Groupes « Propriétés du contact » / « Propriétés de l'entreprise », ✓ vert / ○ ; « Secteur d'activité » → « ○ à configurer à l'étape suivante » |
| A4 | Assistant des colonnes (S36) | ❌ | Assistant affiché, création d'un nouveau champ OK, mais **aucune suggestion de Claude** (voir ci-dessus) |
| A5 | Récapitulatif | ✅ | RGPD pré-réglé « Intérêt légitime — prospect », 3 politiques de conflit, encadré « 2 email(s) mal formé(s) » (lignes 3 et 4) |
| A6 | `bob@acme` | ✅ | Bordure rouge, « Corriger » grisé |
| A7 | Correction + « Importer sans email » | ✅ | Encadré disparu, « 3 à créer » |
| A8 | Importer | ✅ | Retour à Prospects ; en base : 3 contacts (Bob `bob@acme.test`, Claire sans email), 1 entreprise, base juridique posée sur les 3 |
| A9 | Fiche de Bob | ✅ | Base juridique « Intérêt légitime — prospect » (modifiable), champ importé = BTP, cartes « Fiche de prospection » et « Champs personnalisés » |
| A10 | Politique de conflit | ✅ | Compléter (poste vide) → CTO ; Compléter avec CEO → **inchangé** (CTO) ; Écraser → CEO (vérifié en base à chaque étape) |
| A11 | « Ignorer » | ✅ | « 1 ligne(s) ignorée(s) », bouton Importer grisé, rien de modifié |
| A12 | Import d'entreprises | ✅ | Même page, seul groupe « entreprise », pas de sélecteur RGPD ; « ZZ Test S38 » mise à jour (ville Lyon), « ZZ Autre S38 » créée ; (analyse Claude KO, même cause qu'A4) |
| A13 | Erreur d'écriture affichée | — | Non reproduit (il faudrait modifier le schéma pour forcer un échec) ; logique couverte par les tests unitaires de `importErrorSummary` |

🔧 **Corrigé (2026-10-09)** : en « Compléter », une fiche où rien ne
changerait était annoncée « 1 fiche existante à mettre à jour ». Le
récapitulatif distingue désormais « à mettre à jour » et « déjà à jour »
(même règle que l'écriture ; une valeur de champ personnalisé compte comme
mise à jour, faute de charger les valeurs actuelles à ce stade). Le bouton
Importer est grisé si rien ne serait créé ni modifié. À revoir lors du
rejeu de A10.

🔧 **Corrigé** : la page d'import n'avait pas de marge intérieure (titre
collé au menu latéral), contrairement à toutes les autres pages. `p-6`
ajouté, vérifié.

## B. Champs (S38-6, S38-7)

| # | Test | Statut | Constaté |
|---|---|---|---|
| B1 | Sans client choisi | ✅ | Portée « Système » : 1 côté Contacts (Rôle décisionnel), 7 côté Entreprises ; plus de bouton « Appliquer le modèle » |
| B2 | Client choisi | ✅ | Champs système d'abord, puis ceux du client uniquement |
| B3 | Modifier « Grille de qualification » | ✅ | Libellé non modifiable ; renommage « Budget identifié », suppression « Critère 4 » (avertissement rouge), ajout « Décideur rencontré », réordonnancement |
| B4 | Report sur les fiches | ✅ | La fiche qui avait « Critère 1 » coché affiche « Budget identifié » coché |
| B5 | Fiche d'un autre client | ✅ | Client B : options par défaut, « Critère 1 » toujours coché |
| B6 | Champ personnalisé | ✅ | Libellé modifiable et enregistré |
| B7 | Champ système sans client | ✅ | « Choisis d'abord un client sur la page pour modifier ses options. », Enregistrer grisé |
| B8 | Deux cartes | ✅ | « Fiche de prospection » + « Champs personnalisés » du client ; la fiche du client B n'affiche aucun champ du client de test |

## C. Fiche entreprise (S38-8, S38-9)

| # | Test | Statut | Constaté |
|---|---|---|---|
| C1 | 3 colonnes | ✅ | Écran large : gauche / centre (Historique) / droite, conformes ; écran étroit : colonnes empilées, pas de défilement horizontal |
| C2 | Note puis Appel | ✅ | Choix du contact (3 prospects), les 2 événements apparaissent dans l'historique avec contact et auteur |
| C3 | Entreprise sans prospect | ✅ | Note/Appel grisés, explication au survol |
| C4 | Email | ✅ | Liens `mailto:` des 2 contacts qui ont un email |
| C5 | Tâche | ✅ | Fenêtre pré-remplie : client + entreprise |
| C6 | Réunion | ✅ / 👤 | Grisé, « Connecte un calendrier (Paramètres › Calendrier)… » ; 👤 **à tester avec ton calendrier connecté** |
| C7 | Filtres de l'historique | ✅ | Échanges (note + appel), Statuts (3 statuts initiaux), Rendez-vous (vide), Tout |
| C8 | Personnaliser | ✅ | Pappers masqué, Contacts en colonne gauche → appliqué, **aussi sur l'autre fiche du même client** |
| C9 | Bloc personnalisé | ✅ | « Incidents substances toxiques » avec 2 champs du client, qui ne sont plus répétés dans « Champs personnalisés » |
| C10 | Autre client | ✅ | Client B : affichage par défaut |
| C11 | Historique masqué + Note | ✅ | Le compositeur s'affiche sous « En bref » |
| C12 | Revenir au défaut | ✅ | Disposition d'origine rétablie |

Remarque (antérieure à S38, non corrigée) : sur un téléphone, le menu
latéral reste affiché en entier (224 px) et laisse environ 120 px au
contenu. Le CRM n'a pas de mode mobile. À traiter à part si c'est un besoin.

## D. Automatisation (S38-10)

| # | Test | Statut | Constaté |
|---|---|---|---|
| D1 | Déclencheur « Au changement de statut » | ✅ | Grisé hors entité Prospect, sélecteur de statut cible disponible (le statut s'appelle « Enrichi (contact) », pas « Contact enrichi ») |
| D2 | Création de la règle | 🔧 | Résumé correct (« Quand le statut passe à "Enrichi (contact)" »), mais l'action s'affichait « Aucune action » juste après la création (correct après rechargement). **Corrigé** : la liste est rechargée après l'ajout des actions, vérifié |
| D3 | Prospect → « Enrichi (contact) » (changement manuel) | ✅ / 👤 | Tâche « Appel », origine Automatisation, échéance J+1, rattachée au contact **et** à l'entreprise (écran Tâches + base) ; 👤 **à confirmer avec un vrai enrichissement Dropcontact** |

## E. Finitions graphiques (S38-11)

| # | Test | Statut | Constaté |
|---|---|---|---|
| E1 | Kanban Prospects / Opportunités | ✅ | Cartes au trait : aucune ombre, coins carrés (styles calculés relevés dans le navigateur), clair et sombre |
| E2 | Boutons de bascule | ✅ | Aucun bouton arrondi relevé sur Prospects, Opportunités, Tâches, Segments, Intégrations, Dashboard (clair et sombre) |
| E3 | Mode sombre | 🔧 | Alerte « Dernière activité » (warning), pastilles « Connecté », tendance KPI : couleurs du thème, lisibles. **Écart trouvé et corrigé** : les champs natifs sans fond explicite (filtres du Dashboard, « Nom de l'étape » des Opportunités…) restaient blancs avec un texte clair, donc illisibles. Ajout de `color-scheme: dark` au thème sombre, vérifié |
| E4 | Jugement visuel vs maquette Relais | 👤 | À faire par toi (je n'ai pas la maquette sous les yeux) |

## Ce qu'il te reste

1. **Autoriser le redéploiement** de `analyze-import-columns`,
   `enrich-pappers`, `enrich-dropcontact` (correctif CORS ci-dessus) ; je
   rejoue ensuite A4/A12/A10 et l'enrichissement manuel.
2. 👤 C6 : une réunion avec ton calendrier connecté.
3. 👤 D3 : un vrai enrichissement Dropcontact qui déclenche la tâche
   d'appel (il faut d'abord recréer la règle dans Automatisations : je l'ai
   supprimée au nettoyage).
4. 👤 E4 : un coup d'œil au rendu face à la maquette Relais, et la question
   restée ouverte des variantes de couleur du composant `Badge`.
