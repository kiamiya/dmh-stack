# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : 🔄 Lot S39 en production (2026-10-09) — testé par Claude, reste les vérifications 👤 avec ta boîte Outlook

**Fait** (accord de Loïc du 09/10) : migrations 049/050/051 appliquées, 10
Edge Functions déployées (4 nouvelles + 6 redéployées), cron des rappels actif.

**Tests déroulés par Claude** : CRM en local branché sur la prod, Chromium
headless, compte staff temporaire comme **hôte sans calendrier connecté**
(pour ne rien créer dans ton vrai agenda ni envoyer d'e-mail depuis ta
boîte). Chaque résultat recoupé en base. **Nettoyage vérifié** (0 restant) ;
donnée de test de juillet intacte.

Résultats : ✅ R1-R10 et F1-F7 (détail dans `PROGRESS.md`, journal du
09/10). 🔧 **1 écart trouvé et corrigé** : sur l'onglet Rendez-vous, une
saisie faite pendant le chargement (ou au second passage des effets React en
développement) était effacée → le formulaire n'est plus affiché avant la fin
du chargement et n'est initialisé qu'une fois par client.

Sans calendrier connecté, chaque décision affiche bien « L'hôte n'a pas
connecté de calendrier Microsoft : aucun e-mail n'a été envoyé. » — c'est le
comportement attendu ; la partie Outlook/Teams/e-mails reste à vérifier par
toi :

### 👤 Ce qu'il te reste

0. Reconnecter ton calendrier Microsoft (Paramètres › Mon calendrier) pour
   accorder `Mail.Send`.
1. Créer ta page de réservation (hôte = toi) et un type de RDV, puis
   dérouler **R5, R7, R8, R9, R10, R11** ci-dessous depuis une adresse
   e-mail de test : événement provisoire dans Outlook, lien **Teams**,
   e-mails en français, invitation **.ics** qui s'ajoute (puis se met à jour
   après une reprogrammation) dans l'agenda du prospect, rappel.
2. Me dire si le contenu des e-mails te convient (à caler sur le RDV de test
   Brevo).

## R. Prise de rendez-vous

| # | Test | Attendu |
|---|---|---|
| R1 | Marketing › Formulaires et rendez-vous › Rendez-vous, client choisi dans l'en-tête | Formulaire « Page de réservation » ; créer la page (hôte = toi) → lien public `/rdv/<client>` copiable |
| R2 | « + Nouveau type » : 30 min, pause 15, délai 24 h, Teams, plages lun-ven 9h-12h, 1 question liste obligatoire, rappels 24 et 1 | Type listé avec son lien ; erreurs claires si une plage est inversée ou une question vide |
| R3 | Ouvrir `/rdv/<client>` en navigation privée | Liste des types ; clic → créneaux groupés par jour **à l'heure de Paris**, aucun créneau sur un événement de ton agenda (pause comprise), aucun dans les 24 h |
| R4 | Choisir un créneau, envoyer avec un e-mail contenant un espace, puis un téléphone « 123 » | Erreurs sous les champs, rien d'envoyé |
| R5 | Envoyer une demande valide | « Demande envoyée » ; 👤 dans ton Outlook : événement **provisoire** « [À valider] … » ; 👤 e-mail « Nouvelle demande de RDV » reçu |
| R6 | CRM › Rendez-vous | Bloc « Demandes à valider » avec le récapitulatif complet ; fiche entreprise du prospect créée ou retrouvée, historique : « Rendez-vous à valider : … » |
| R7 | « Accepter » | 👤 Outlook : événement définitif avec **lien Teams** ; 👤 le prospect (ton adresse de test) reçoit la confirmation en français avec le lien Teams, le bouton « Reprogrammer ou annuler » et l'**invitation .ics** qui s'ajoute à son agenda |
| R8 | Une 2e demande → « Refuser » | Créneau libéré dans Outlook ; e-mail de refus avec lien « Choisir un autre créneau » |
| R9 | Lien « Reprogrammer ou annuler » → Reprogrammer | Nouveau créneau → la demande repasse « à valider » (événement déplacé, provisoire) ; après acceptation, l'agenda du prospect **met à jour** l'événement au lieu d'en ajouter un |
| R10 | Même lien → Annuler | Événement supprimé de ton agenda ; e-mail d'annulation (avec .ics d'annulation) au prospect, alerte à toi |
| R11 | 👤 Rappel | RDV confirmé à moins de 24 h : e-mail de rappel reçu dans le quart d'heure (cron) |

## F. Formulaires

| # | Test | Attendu |
|---|---|---|
| F1 | Onglet Formulaires › « + Nouveau formulaire » ; ajouter un champ personnalisé du client (ex. Secteur) ; réordonner | Formulaire listé, lien `/f/<slug>`, codes « Iframe » et « Capsule HTML » copiables |
| F2 | Ouvrir `/f/<slug>` | Champs dans l'ordre choisi, téléphone avec sélecteur de pays, mention RGPD |
| F3 | E-mail avec espace / téléphone FR à 8 chiffres | Refusés avec un message clair |
| F4 | Envoi valide avec un nouvel e-mail | Message de confirmation ; fiche contact créée (entreprise saisie, ou domaine de l'e-mail), champ personnalisé renseigné ; « Réponses » affiche l'envoi avec lien vers la fiche |
| F5 | Nouvel envoi avec le même e-mail et d'autres valeurs | Fiche **complétée** (champs vides seulement), rien d'écrasé |
| F6 | Coller la capsule HTML dans une page HTML locale | Formulaire affiché, hauteur ajustée automatiquement, envoi OK |
| F7 | Formulaire passé « hors ligne » | `/f/<slug>` : « Ce formulaire n'est pas disponible » |

## Reste du lot S38 (à faire en production avec Delphine, décision du 09/10)

1. 👤 C6 : une réunion avec ton calendrier connecté.
2. 👤 D3 : un vrai enrichissement Dropcontact qui déclenche la tâche
   d'appel (il faut d'abord recréer la règle dans Automatisations : je l'ai
   supprimée au nettoyage).
3. 👤 E4 : un coup d'œil au rendu face à la maquette Relais, et la question
   restée ouverte des variantes de couleur du composant `Badge`.
