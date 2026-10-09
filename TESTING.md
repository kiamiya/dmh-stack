# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : ⬜ Lot S39 (CR du 09/10 — rendez-vous + formulaires) codé, rien n'est encore en production

Tout le code est poussé, les tests unitaires et le typecheck sont verts. Rien
n'est testable de bout en bout tant que les étapes distantes ci-dessous ne
sont pas faites.

## Étape 0 — Pré-requis (actions distantes, ton accord requis)

1. Appliquer les migrations `049_booking_module.sql`,
   `050_booking_reminders_cron.sql`, `051_forms.sql`.
2. Déployer les Edge Functions `booking-public`, `form-public`
   (publiques), `booking-decide`, `booking-reminders`, et redéployer
   `calendar-freebusy`, `calendar-book-meeting`, `calendar-create-event`,
   `calendar-my-events`, `calendar-update-event`,
   `microsoft-calendar-oauth-callback` (code partagé modifié).
3. 👤 **Reconnecter ton calendrier Microsoft** (Paramètres › Mon calendrier)
   pour accorder le droit d'envoi d'e-mails (`Mail.Send`). Sans ça, tout
   fonctionne sauf l'envoi des e-mails (un avertissement s'affiche dans le CRM).

Je peux dérouler moi-même les parties R et F ci-dessous (CRM en local branché
sur la prod, données de test supprimées ensuite), comme le 25/09 — avec ton
accord. Les points marqués 👤 demandent ta boîte Outlook / ton agenda.

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
