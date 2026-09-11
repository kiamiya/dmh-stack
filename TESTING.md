# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : 🔄 audit des 12 écrans Claude Design (Nature A en cours) + lots précédents — validation navigateur en attente

**Nouveau et prioritaire (S35-1/S35-2 ci-dessous)** : composants de vue
partagés + alignement de l'onglet Entreprises sur Contacts. Aucune
migration pour ce lot. Le reste de la Nature A (Dashboard/Segments/
Tâches/Pipeline) suit dans les prochaines itérations — la Nature B
(Campagne Email, Automatisation, Mapping, Reporting, Paramètres) est
documentée dans `PROGRESS.md` comme reportée, rien à tester dessus.

### S35-2 — Entreprises : bandeau de vues + colonnes Source/Statut

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur `/?view=companies`, regarder sous la bascule Contacts/Entreprises | Rangée "Toutes les entreprises N" + bouton "..." (menu) — même style que l'onglet Contacts |
| 2 | Créer une vue (filtrer par un chip puis "+ Nouvelle vue") | La vue apparaît comme onglet, distincte des vues créées côté Contacts |
| 3 | Cliquer "..." sur une vue créée | Partager le lien / Dupliquer / Renommer / Supprimer apparaissent (pas "Modifier les colonnes") |
| 4 | Regarder la colonne "Source" d'une entreprise déjà enrichie (SIREN renseigné) | Affiche "Pappers" ; une entreprise sans SIREN affiche "—" |
| 5 | Regarder la colonne "Statut" d'une entreprise ayant un prospect actif lié | Affiche le badge de statut du prospect (ex. "En séquence") ; une entreprise sans prospect lié affiche "—" |
| 6 | Regarder la colonne "Complétude" | Barre + % au lieu d'un texte brut |
| 7 | Bouton d'import | Libellé "Importer des entreprises" (pas juste "Importer") |

### S35-3 — Dashboard : menu déroulant, filtres, Partager/Actions, File d'enrichissement

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur `/dashboard`, regarder la ligne sous le titre | Bouton "Vue d'ensemble ▾" (ou le nom du dashboard actif) à la place de l'ancienne rangée de pastilles |
| 2 | Cliquer dessus | Menu avec Vue d'ensemble + dashboards existants + "+ Créer un tableau de bord" |
| 3 | Créer un dashboard, puis ouvrir "Actions" dans l'en-tête | Plein écran / Cloner / Renommer / Supprimer apparaissent (Cloner/Renommer/Supprimer seulement si un dashboard nommé est actif) |
| 4 | Cliquer "Afficher en plein écran" | Le navigateur passe en plein écran (touche Échap pour sortir) |
| 5 | Ouvrir "Partager" | "Copier l'URL" (toast de confirmation) et "Exporter en PDF" (comme avant) |
| 6 | Choisir un membre du staff dans "Propriétaire" | Les KPI/graphiques se recalculent sur les prospects/tâches assignés à cette personne uniquement |
| 7 | Renseigner "Depuis le"/"Jusqu'au" | Les données se filtrent sur cette période (deals sur date de signature, interactions/RDV sur leur date réelle) |
| 8 | Cliquer "Réinitialiser" (visible seulement si un filtre est actif) | Retour à toutes les données |
| 9 | Cliquer l'icône ↻ à côté de "actualisé il y a…" | Le texte "actualisé à l'instant" apparaît, les données se rechargent |
| 10 | Sur un dashboard nommé, "Gérer les blocs", cocher "File d'enrichissement" | Nouvelle carte : compte réel de prospects en attente Pappers/Dropcontact + lien "Ouvrir le hub API" vers `/integrations` |

### S35-4 — Segments : bandeau de vues + filtres rapides + colonnes

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur `/lists`, regarder sous le titre | Rangée "Toutes les listes N" + bouton "..." |
| 2 | Cliquer les chips "Listes dynamiques"/"Listes statiques" | Filtre la table ; les deux ne peuvent pas être actifs en même temps (cliquer l'un désactive l'autre) |
| 3 | Cliquer "Les miennes" | Ne montre que les listes créées par le compte connecté |
| 4 | Cliquer "Enrichies > 90%" | Ne montre que les listes Contacts/Entreprises avec un taux d'enrichissement ≥ 90% (les listes Opportunités disparaissent, elles n'ont pas ce taux) |
| 5 | Cliquer "Non travaillée 14j" | Ne montre que les listes dont `updated_at` date de 14 jours ou plus |
| 6 | Cliquer "..." → "Modifier les colonnes" | Modale avec 6 cases à cocher (Mode/Client/Dossier/Membres/Enrichis/Créée le) ; décocher "Client" masque la colonne |
| 7 | Créer une vue avec des chips actifs, "..." → Dupliquer/Renommer/Supprimer | Fonctionnent comme sur Prospects/Entreprises |
| 8 | Regarder la colonne "Enrichis" d'une liste enrichie | Barre + % au lieu d'un texte brut |

## Sections précédentes (toujours en attente de validation, non re-décrites)

### S34-18 — écran Prospects unifié (bascule Contacts/Entreprises, menu consolidé, filtres rapides, fraîcheur)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir `/` | En haut : bascule "Contacts N / Entreprises N" (compteurs réels), "Contacts" actif par défaut |
| 2 | Cliquer "Entreprises" | La table Entreprises s'affiche (SIREN/Effectif/CA/Contacts/Complétude/Score IA), l'URL devient `?view=companies` |
| 3 | Ouvrir `/contacts` ou `/companies` directement | Redirection automatique vers `/?view=contacts` ou `/?view=companies` (comme `/pipeline` déjà avant) |
| 4 | Sur l'onglet Contacts, regarder la rangée sous la bascule | Onglets "Tous les contacts" + vues enregistrées, à droite : icône ↻ (synchroniser), bascule Liste/Kanban, bouton "..." |
| 5 | Cliquer "...", puis "Modifier les colonnes" | Une modale liste les colonnes (Contact/Société/Coordonnées/Source/Confiance/Fraîcheur/Statut visibles par défaut ; Score IA/Client DMH/Dernière activité décochées par défaut, réactivables) |
| 6 | Créer une vue (+ Nouvelle vue), puis cliquer "..." dessus | "Dupliquer la vue"/"Renommer la vue"/"Supprimer la vue" apparaissent en plus (absents sur "Tous les contacts") |
| 7 | Cliquer les chips "Email vérifié"/"Téléphone direct"/"Fraîcheur < 7j" | Chaque chip filtre la liste, un compteur réel s'affiche à côté |
| 8 | Cliquer "+ Filtre avancé" | Statuts/Score min-max/Secteur/Segment apparaissent (repliés par défaut) ; pas de champ "Client DMH" si un client est déjà choisi dans le Header |
| 9 | Choisir un client dans le sélecteur du Header (en haut à droite) | La liste Contacts ET Entreprises se filtrent sur ce client (plus besoin de le rechoisir sur chaque onglet) |
| 10 | Sur une fiche contact enrichie récemment (Dropcontact), regarder la colonne Fraîcheur | Affiche un nombre de jours réel (ex. "2j"), pas une valeur figée |
| 11 | Dans "+ Filtre avancé", choisir un Segment existant (créé via `/contacts` avant la fusion) | Toujours utilisable, filtre la liste correctement |
| 12 | Sélectionner plusieurs contacts, ouvrir "Ajouter à un segment" | Ajoute les contacts sélectionnés au segment statique choisi |

### S34-1 — formulaire Contact (téléphone + réordonnancement)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir "+ Nouveau" → Contact (ou "+ Contact" sur `/contacts`) | Champs dans l'ordre : Nom, Prénom, Poste, URL LinkedIn, Email, Téléphone, Entreprise, Client DMH |
| 2 | Remplir un téléphone et valider | Le contact est créé avec ce téléphone (visible sur sa fiche) |
| 3 | Essayer de choisir une entreprise avant d'avoir choisi le client DMH | Le champ Entreprise affiche "Choisir un client DMH d'abord" (désactivé) — confirme la friction UX assumée (client en dernier) |

### S34-2 — formulaire Opportunité (nom libre + tâche de relance) *(nécessite migration 036)*

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir "+ Nouveau" → Opportunité, remplir un nom (ex. "Renouvellement 2027") | L'opportunité créée affiche ce nom (liste, Kanban, fiche détail) au lieu du nom de l'entreprise |
| 2 | Créer une opportunité sans remplir le nom | Le nom de l'entreprise s'affiche comme avant (repli, aucune régression) |
| 3 | Cocher "Planifier une tâche de relance manuelle", choisir une échéance, valider | Une tâche "Relance — <nom>" apparaît sur `/tasks` avec cette échéance, liée à l'opportunité |

### S34-C0 — relations hiérarchiques entreprises *(nécessite migration 037)*

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir une fiche Entreprise, carte "Groupe" | "Maison mère : Aucune", "Filiales (0)" |
| 2 | Choisir une autre entreprise du même client comme maison mère, cliquer "Lier" | La maison mère s'affiche avec un lien cliquable |
| 3 | Ouvrir la fiche de la maison mère | La filiale apparaît dans sa liste "Filiales", lien cliquable |
| 4 | Cliquer "Retirer" sur la maison mère depuis la fiche filiale | Repasse à "Aucune", la filiale disparaît de la liste de l'ex-maison mère |

### S34-3/4/5 — Kanban Opportunités par défaut + menu de vue Prospects + partage de lien

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir `/opportunities` | S'ouvre directement en Kanban (plus besoin de cliquer le toggle) |
| 2 | Sur `/`, filtrer puis "+ Nouvelle vue", donner un nom | La vue apparaît comme onglet |
| 3 | Survoler l'onglet d'une vue enregistrée | 3 icônes apparaissent : ⧉ (dupliquer), ✎ (renommer), × (supprimer) |
| 4 | Cliquer ⧉ | Une copie "<nom> (copie)" apparaît comme nouvel onglet |
| 5 | Cliquer ✎, changer le nom, valider | L'onglet est renommé sans changer ses filtres |
| 6 | Appliquer un filtre (ex. un statut), cliquer "Partager le lien de la vue", coller l'URL copiée dans un nouvel onglet | Les mêmes filtres sont actifs (l'URL contient `status=...` etc.) |

### S34-7 — alerte de doublons (Contact/Entreprise)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | "+ Nouveau" → Contact, choisir un client déjà utilisé par un contact existant, taper son email exact | Une alerte jaune apparaît sous le champ email, avec un lien vers la fiche existante |
| 2 | "+ Nouveau" → Entreprise, choisir un client, taper le nom exact d'une entreprise déjà existante pour ce client (insensible à la casse) | Une alerte jaune apparaît sous le champ nom, avec un lien vers la fiche existante |
| 3 | Continuer et valider malgré l'alerte | La création n'est PAS bloquée (avertissement seulement) |

### S34-8 — bouton "Enrichir" à la demande

`enrich-pappers`/`enrich-dropcontact` redéployées le 2026-09-11
(confirmation explicite de Loïc) — reste la validation fonctionnelle
réelle ci-dessous (consomme un vrai appel API, pas fait automatiquement).

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir la fiche d'un contact qui a un prospect lié | Bouton "Enrichir" visible dans l'en-tête |
| 2 | Cliquer "Enrichir" | Toast de succès ou "en cours" (Dropcontact est asynchrone), les champs se rafraîchissent |
| 3 | Ouvrir la fiche d'une entreprise sans prospect lié | Pas de bouton "Enrichir" (rien à rattacher côté pipeline) |
| 4 | Ouvrir la fiche d'une entreprise avec un prospect déjà `won`/avancé, cliquer "Enrichir" | Les données se rafraîchissent, le statut du prospect ne change PAS (vérifier sur `/?view=kanban` ou la liste) |

### S34-9 — actions manquantes sur les dossiers (renommer/dupliquer/déplacer)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur `/lists`, choisir un client, survoler un dossier racine | 3 icônes : ⧉ (dupliquer), ✎ (renommer), × (supprimer) |
| 2 | Cliquer ⧉ sur un dossier | Une copie "<nom> (copie)" apparaît au même niveau |
| 3 | Cliquer ✎, changer le nom dans la boîte de dialogue navigateur | Le dossier est renommé |
| 4 | Sur un sous-dossier, changer le menu déroulant "Déplacer vers" | Le sous-dossier change de parent (ou passe à la racine) |

### S34-11 — analyse de chevauchement entre segments

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Cliquer "Analyser un chevauchement" dans l'en-tête de `/lists` | Un panneau s'ouvre avec un sélecteur de type + 2 listes |
| 2 | Choisir 2 listes statiques du même type ayant des membres en commun, cliquer "Analyser" | Le nombre en commun + les pourcentages de A/B s'affichent |
| 3 | Choisir une liste dynamique dans les sélecteurs | N'apparaît pas dans la liste déroulante (limité aux statiques, message explicite dans le panneau) |

### S34-12 — lien cliquable entre une tâche et sa fiche liée

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur `/tasks`, ouvrir une tâche liée à un contact | La colonne "Lié à" affiche le nom du contact en lien cliquable (souligné au survol) |
| 2 | Cliquer ce lien | Navigue vers `/contacts/:id`, la fiche du bon contact s'affiche |
| 3 | Répéter avec une tâche liée à une entreprise, puis à une opportunité | Même comportement, vers `/companies/:id` ou `/opportunities/:id` (nom de l'opportunité affiché via S34-2 si renseigné, sinon nom de l'entreprise) |
| 4 | Ouvrir une tâche sans aucune fiche liée | La colonne affiche "—" (pas de lien) |

### S34-13 — mode "dépiler les tâches une à une"

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur `/tasks`, regarder le bouton "Dépiler (N)" dans l'en-tête | N correspond au nombre de tâches non terminées |
| 2 | Cliquer "Dépiler" | Une modale s'ouvre sur la première tâche (échéance la plus proche en premier), avec la progression "1 / N" |
| 3 | Cliquer sur le nom de la fiche liée (si présente) | S'ouvre dans un **nouvel onglet**, la modale reste ouverte sur la même tâche dans l'onglet d'origine |
| 4 | Cliquer "Terminer" | La tâche passe au statut "Terminée" (vérifiable après fermeture sur `/tasks`), la modale avance automatiquement à la tâche suivante |
| 5 | Sur la tâche suivante, cliquer "Replanifier", choisir une date, valider | La tâche voit son échéance mise à jour, la modale avance à la tâche suivante |
| 6 | Cliquer "Passer" sur une tâche | Avance à la suivante sans aucune modification de cette tâche |
| 7 | Arriver au bout de la file | Message "File terminée — bravo !" |
| 8 | Cliquer "Fermer" en cours de route, puis rouvrir "Dépiler" | La file recommence au début (pas de reprise à l'endroit quitté — comportement attendu, pas un bug) |
| 9 | Avec 0 tâche non terminée | Le bouton "Dépiler (0)" est désactivé |

### S34-15 — dashboards nommés personnels

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur `/dashboard`, en-tête | Bouton "Vue d'ensemble" actif par défaut, "+ Nouveau dashboard" visible |
| 2 | Cliquer "+ Nouveau dashboard", donner un nom | Un nouvel onglet apparaît avec ce nom, actif automatiquement |
| 3 | Cliquer "Gérer les blocs (0)" | Une modale s'ouvre avec les 14 blocs groupés par catégorie (Vue d'ensemble/Évolution/Scores & Deals/Opportunités & Tâches/Activité), tous décochés |
| 4 | Cocher 2-3 blocs, "Enregistrer" | Seuls ces blocs s'affichent en grille sous les 4 cartes KPI |
| 5 | Survoler l'onglet du dashboard créé | 3 icônes ⧉/✎/× apparaissent |
| 6 | Cliquer ⧉ | Une copie "<nom> (copie)" apparaît avec les mêmes blocs |
| 7 | Cliquer ✎, changer le nom | L'onglet est renommé |
| 8 | Cliquer × | Le dashboard disparaît, retour automatique sur "Vue d'ensemble" si c'était l'onglet actif |
| 9 | Recharger la page (F5) | Les dashboards créés sont toujours là (persistés en base, pas juste en mémoire) |
| 10 | Se connecter avec un autre compte staff (si possible) | Les dashboards du 1er compte ne sont pas visibles (personnels, RLS `owner_id`) |

### S34-16 — export PDF du dashboard

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur `/dashboard`, cliquer "Exporter en PDF" | La boîte de dialogue d'impression du navigateur s'ouvre |
| 2 | Regarder l'aperçu d'impression | Ni la sidebar ni le bandeau de bascule des dashboards ne sont visibles — seul le contenu (KPI + blocs) apparaît |
| 3 | Choisir "Enregistrer en PDF" dans la boîte de dialogue | Un PDF est généré avec le contenu du dashboard actif (Vue d'ensemble ou un dashboard nommé) |

## Statut précédent : lot S33 (revue dev CRM du 08/09) — toujours en attente de validation navigateur (migrations appliquées)

Réunion Delphine/Loïc du 08/09/2026, prochaine réunion le 11/09/2026 10h.
Détail dans `PROGRESS.md`, section "2026-09-10 — Revue dev CRM DMH (08/09) :
lot S33". Les migrations `032` (Lot C Dossiers, en attente depuis une session
précédente), `033`, `034` et `035` ont toutes été appliquées en production
le 2026-09-10 (confirmation explicite de Loïc) et vérifiées en base
(`supabase db query --linked`). Il ne reste que la validation fonctionnelle
en navigateur réel ci-dessous — plus aucune migration en attente.

### S33-1 — navigation (Contacts/Entreprises/Pipeline retirés de la sidebar)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir la sidebar, groupe "Prospection" | Seuls "Prospects", "Opportunités", "Tâches", "Segments" apparaissent — plus "Contacts"/"Entreprises"/"Pipeline" |
| 2 | Aller sur une fiche Prospect, cliquer le lien vers l'entreprise ou le contact liés | La fiche Contact/Entreprise s'ouvre normalement (`/contacts/:id`, `/companies/:id`) |
| 3 | Taper l'URL `/contacts` ou `/companies` directement dans le navigateur | La page s'affiche normalement (deep-link toujours actif, juste plus dans le menu) |

### S33-2 — vue Kanban fusionnée dans "Prospects"

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir "Prospects" (`/`), cliquer le toggle "Kanban" en haut à droite | Le tableau disparaît, remplacé par les colonnes Kanban |
| 2 | Glisser une carte d'une colonne à une autre | Le statut du prospect change, la carte reste dans sa nouvelle colonne après rechargement |
| 3 | Cliquer sur une carte (pas glisser, un simple clic) | La fiche détail du prospect s'ouvre |
| 4 | Cliquer le toggle "Liste" | Retour au tableau, filtres/tri toujours fonctionnels |
| 5 | Ouvrir l'URL `/pipeline` directement | Redirection automatique vers `/?view=kanban`, le Kanban s'affiche |

### S33-3 — panneau "+ Nouveau" (Header)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Cliquer "+ Nouveau" en haut à droite (visible depuis n'importe quel écran) | Un panneau avec 3 choix apparaît : Contact / Entreprise / Opportunité |
| 2 | Choisir "Contact", remplir et valider | Le contact (+ prospect associé) est créé, comme avant avec "+ Contact" |
| 3 | Choisir "Entreprise", remplir et valider | L'entreprise est créée, redirection vers sa fiche |
| 4 | Choisir "Opportunité", remplir et valider | L'opportunité est créée, redirection vers sa fiche |
| 5 | Rouvrir "+ Nouveau" après une création | Le panneau repart bien sur l'écran de choix (pas bloqué sur le dernier dialogue ouvert) |

### S33-4 — import CSV Contacts/Entreprises

**Pré-requis pour vérifier l'enrichissement automatique** : un client DMH
avec une automatisation active (`/automations`, `entity_type` = "Prospect",
déclencheur "à la création", action "Enrichir" — provider `pappers`) et le
secret Vault `app_service_role_key` rempli (voir S32-auto plus bas, déjà
signalé comme en attente). Sans ça, le prospect est bien créé en statut "à
enrichir" mais rien ne se passe automatiquement — comportement attendu, pas
un bug de cet import.

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur `/contacts`, cliquer "Importer", choisir un client, uploader un CSV avec colonnes Prénom/Nom/Entreprise/Email | Les colonnes sont pré-associées automatiquement, l'aperçu affiche le nombre de lignes prêtes |
| 2 | Modifier manuellement une correspondance de colonne dans le menu déroulant | L'aperçu (lignes prêtes/ignorées) se met à jour immédiatement |
| 3 | Importer un CSV avec une ligne sans prénom et une ligne avec un email déjà utilisé par un contact existant | Ces 2 lignes apparaissent dans "ignorée(s)" avec la raison, les autres sont importées |
| 4 | Importer deux lignes qui partagent la même entreprise (même nom, casse différente) | Une seule entreprise créée, réutilisée pour la 2e ligne (vérifiable sur `/companies`) |
| 5 | Après import, ouvrir un des nouveaux contacts | Le contact et son entreprise existent, un prospect en statut "à enrichir" est visible sur `/?view=kanban` |
| 6 | (Si le pré-requis ci-dessus est rempli) Attendre quelques secondes puis rafraîchir la fiche entreprise | Les champs SIREN/secteur/effectif se remplissent (enrichissement Pappers réellement déclenché) |
| 7 | Sur `/companies`, cliquer "Importer", uploader un CSV Nom/Ville/Site web | Les entreprises sont créées, aucun prospect ni enrichissement (limite attendue, voir `PROGRESS.md`) |

### S33-5 — sous-navigation Vue globale/Kanban/Contacts/Entreprises

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur "Prospects" (`/`), regarder la barre d'actions | 4 boutons/liens : "Vue globale", "Kanban", "Contacts", "Entreprises" |
| 2 | Cliquer "Contacts" depuis `/` | Navigue vers `/contacts`, la même barre à 4 entrées est visible, "Contacts" est actif |
| 3 | Depuis `/contacts`, cliquer "Kanban" | Navigue vers `/?view=kanban`, le Kanban s'affiche directement |
| 4 | Depuis `/companies`, cliquer "Vue globale" | Navigue vers `/`, la vue tableau des prospects s'affiche |
| 5 | Sur `/`, basculer Liste ↔ Kanban via ces mêmes boutons | Comportement identique à avant (S33-2, pas de navigation, juste une bascule locale) |

### S33-6 — Kanban Prospection limité à 8 colonnes (arrêt au RDV pris)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir le Kanban Prospects (`/?view=kanban`) | 8 colonnes visibles (à enrichir → RDV pris, + "Pas intéressé"), plus de colonnes Qualifié/Proposition envoyée/Gagné/Perdu |
| 2 | Sur la vue Liste (`/`), filtre "Statuts" | Les 12 statuts sont toujours proposés (inchangé) |
| 3 | (Si un prospect existant a le statut Qualifié/Gagné/etc., via la base) | Il reste visible et filtrable en vue Liste, absent du Kanban (comportement voulu, pas un bug) |

### S33-7 — pipeline Opportunités à 5 étapes

| # | Test | Résultat attendu |
|---|---|---|
| 1 | `/opportunities`, vue Kanban, choisir un client | 5 colonnes visibles : Nouveau, Qualifié, Proposition envoyée, Négociation, Gagné, Perdu (6 au total, Gagné/Perdu distincts) |
| 2 | Vérifier une opportunité déjà classée avant la migration | Reste dans sa colonne d'origine (Négociation/Gagné/Perdu), pas déplacée |

### S33-8 — opportunité liée à plusieurs contacts

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir une fiche Opportunité | Carte "Contacts liés" visible, avec le contact principal existant marqué "Principal" |
| 2 | Lier un contact existant avec un rôle (ex. "Juridique") | Le contact apparaît dans la liste avec son rôle entre parenthèses |
| 3 | Cliquer "+ Nouveau contact", créer un contact | Le nouveau contact est automatiquement lié à l'opportunité |
| 4 | Cliquer "Retirer" sur un contact lié | Le contact disparaît de la liste (la fiche contact elle-même n'est pas supprimée) |

### S33-9 — opérateurs "connu/inconnu" + dates

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur un éditeur de conditions (Segments, Automatisations), ouvrir la liste des opérateurs | "n'est pas renseigné (inconnu)" apparaît, sans champ valeur associé |
| 2 | Créer une liste dynamique avec une condition "date de signature" + "supérieur à / après" + une date | Seules les opportunités signées après cette date apparaissent (vérifie que la comparaison de date fonctionne, pas juste les nombres) |

### S33-10 — logs/activités filtrables

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Sur `/contacts`, choisir un client, créer une liste dynamique | Un 3e optgroup "Activité" apparaît dans le menu déroulant de champ (ex. "Email ouvert", "Réponse LinkedIn") |
| 2 | Créer une condition "Email ouvert" + "est renseigné (connu)" | Seuls les contacts dont un prospect associé a déjà reçu un email ouvert apparaissent |
| 3 | Créer une condition "Réponse LinkedIn" + "n'est pas renseigné (inconnu)" | Les contacts sans réponse LinkedIn enregistrée apparaissent |
| 4 | Vérifier sur `/companies` et `/opportunities` | Pas d'optgroup "Activité" (limité aux Contacts, voir `PROGRESS.md`) |

## Segments (Lot C, migration 032) — première validation navigateur

Migration appliquée le 2026-09-10 (voir ci-dessus) mais **jamais encore
validée en navigateur réel** — voir `PROGRESS.md`, section "S32-segments :
Lot C (Dossiers)" pour le protocole de test complet (créer un dossier, un
sous-dossier, classer une liste, supprimer un dossier parent...).

## Rappel — tests en attente sur d'autres chantiers

- Automatisations (migration 030, branches Oui/Non + "Enrichir") — voir
  `PROGRESS.md`, section "S32-auto".
- Segments Lot B (migration 031, Propriétaire/Mise à jour/Import CSV/
  Corbeille) — voir `PROGRESS.md`, section "S32-segments : migration
  031 appliquée en production".

Pas perdus, juste pas répétés ici (ce fichier ne couvre que le test
courant).

## Outillage disponible pour ce chantier

- `pnpm --filter @dmh/crm dev` (port 5173).
- `supabase db query --linked --project-ref hkonylfpcstbvxswyxyh "<SQL>"`
  pour inspecter l'état réel sans modifier quoi que ce soit.
