# Test fonctionnel en attente de validation

> Ce fichier décrit **uniquement le test fonctionnel courant**. Il est réécrit
> (pas complété) à chaque nouvelle fonctionnalité nécessitant une validation
> humaine — l'historique des tests déjà validés vit dans le "Journal des
> sessions" de `PROGRESS.md`, pas ici.
>
> Règle : je n'enchaîne pas sur la tâche suivante tant que le test ci-dessous
> n'est pas validé par toi (ou explicitement passé si tu préfères avancer
> sans attendre).

## Statut : ⏳ S40 — pipeline d'enrichissement automatique par défaut — code prêt, en attente de ton feu vert pour la production

**Fait** (2026-10-15) : migration `052_default_enrichment_pipeline.sql`,
authentification ajoutée à `generate-messages` et `score-prospect`, écran
Automatisations et page Aide adaptés. Tests unitaires et typecheck verts.
**Rien n'est encore en production.**

### Ce qui part en production (après ta confirmation)

1. Redéploiement de `generate-messages` et `score-prospect` (`--no-verify-jwt`
   conservé, le contrôle est dans la fonction) — **en premier**, pour que le
   moteur n'appelle jamais une fonction encore ouverte.
2. `supabase db push` : migration 052 (les 3 règles sont aussitôt créées pour
   le client existant, le cron `poll-dropcontact` démarre).

### Test de bout en bout (je le déroule, client de test de juillet)

Coût : quelques crédits réels (1 Pappers, 1 Dropcontact, 2 appels Claude).

| # | Test | Attendu |
|---|---|---|
| P1 | Base, après la migration | 3 règles « Pipeline · 1/2/3 » pour le client, `system_key` renseigné ; cron `poll-dropcontact` actif ; `generate-messages` sans clé → 401 |
| P2 | Automatisations, client de test | Les 3 règles en tête, badge « Par défaut », case active/inactive, **pas** de bouton Supprimer ; résumé « Enrichir via Dropcontact + Scorer (IA) » |
| P3 | Créer un contact + prospect sur une vraie PME (SIREN connu) | En moins d'une minute : `to_enrich` → `enriched_pappers` (données Pappers sur l'entreprise) et score IA renseigné |
| P4 | Attendre 5 à 10 min | Dropcontact relevé par le cron → `enriched_contact` (email trouvé ou non) |
| P5 | Juste après | Message dans `messages_generated`, prospect `ready` (« Prêt ») |
| P6 | Désactiver la règle 1, créer un autre prospect | Il reste « À enrichir » ; réactiver la règle |
| P7 | Créer un client temporaire en base | Ses 3 règles apparaissent toutes seules ; client supprimé ensuite (cascade) |
| P8 | Nettoyage | Prospects, contacts et messages de test supprimés, donnée de juillet intacte |

### 👤 Ce que je te demande

- Ton **accord explicite** pour les 2 actions en production ci-dessus.
- Après mon test, un coup d'œil à l'écran Automatisations (P2) si tu veux.

---

## Toujours en attente : lot S39 (2026-10-09) — vérifications 👤 avec ta boîte Outlook

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

### R. Prise de rendez-vous

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

### F. Formulaires

| # | Test | Attendu |
|---|---|---|
| F1 | Onglet Formulaires › « + Nouveau formulaire » ; ajouter un champ personnalisé du client (ex. Secteur) ; réordonner | Formulaire listé, lien `/f/<slug>`, codes « Iframe » et « Capsule HTML » copiables |
| F2 | Ouvrir `/f/<slug>` | Champs dans l'ordre choisi, téléphone avec sélecteur de pays, mention RGPD |
| F3 | E-mail avec espace / téléphone FR à 8 chiffres | Refusés avec un message clair |
| F4 | Envoi valide avec un nouvel e-mail | Message de confirmation ; fiche contact créée (entreprise saisie, ou domaine de l'e-mail), champ personnalisé renseigné ; « Réponses » affiche l'envoi avec lien vers la fiche |
| F5 | Nouvel envoi avec le même e-mail et d'autres valeurs | Fiche **complétée** (champs vides seulement), rien d'écrasé |
| F6 | Coller la capsule HTML dans une page HTML locale | Formulaire affiché, hauteur ajustée automatiquement, envoi OK |
| F7 | Formulaire passé « hors ligne » | `/f/<slug>` : « Ce formulaire n'est pas disponible » |

### Reste du lot S38 (à faire en production avec Delphine, décision du 09/10)

1. 👤 C6 : une réunion avec ton calendrier connecté.
2. 👤 D3 : un vrai enrichissement Dropcontact qui déclenche la tâche
   d'appel (il faut d'abord recréer la règle dans Automatisations : je l'ai
   supprimée au nettoyage).
3. 👤 E4 : un coup d'œil au rendu face à la maquette Relais, et la question
   restée ouverte des variantes de couleur du composant `Badge`.
