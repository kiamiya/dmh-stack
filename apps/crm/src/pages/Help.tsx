import { PageHeader } from "../components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-heading text-xl font-semibold text-foreground">{children}</h2>;
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

export function HelpPage() {
  return (
    <div className="max-w-4xl space-y-8 p-6">
      <PageHeader kicker="Données & réglages · documentation" title="Aide" />

      <p className="text-sm text-muted-foreground">
        Ce qui suit décrit ce que fait réellement le CRM aujourd'hui — pas un objectif futur. Si une fonctionnalité
        n'existe pas encore (ex. un bouton "Enrichir" cliquable sur une fiche), c'est dit explicitement plutôt que
        laissé de côté.
      </p>

      {/* ------------------------------------------------------------ */}
      <section className="space-y-3">
        <SectionTitle>Comment est organisé le menu</SectionTitle>
        <Card>
          <CardContent className="space-y-3 p-4 text-sm text-foreground">
            <div>
              <SubTitle>Pilotage</SubTitle>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Dashboard</strong> : vue d'ensemble (funnel de conversion, activité
                de la force de vente, tâches en retard, performance par client) — tout calculé à partir des données
                réelles, rien de simulé. <strong className="text-foreground">Reporting</strong> : mêmes indicateurs en
                détail, pour une lecture plus fine.
              </p>
            </div>
            <div>
              <SubTitle>Prospection</SubTitle>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Prospects</strong> (liste + vue Kanban <em>Pipeline</em>),{" "}
                <strong className="text-foreground">Contacts</strong>,{" "}
                <strong className="text-foreground">Entreprises</strong>,{" "}
                <strong className="text-foreground">Opportunités</strong> (deals),{" "}
                <strong className="text-foreground">Tâches</strong>,{" "}
                <strong className="text-foreground">Segments</strong> (listes de contacts/entreprises/opportunités).
              </p>
            </div>
            <div>
              <SubTitle>Marketing</SubTitle>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Automatisations</strong> (règles déclencheur/condition/action) et{" "}
                <strong className="text-foreground">Campagnes</strong> (tableau de bord en lecture seule des séquences
                LinkedIn Lemlist).
              </p>
            </div>
            <div>
              <SubTitle>Données & réglages</SubTitle>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Mon calendrier</strong> (Google/Outlook),{" "}
                <strong className="text-foreground">Réglages</strong> (champs personnalisés),{" "}
                <strong className="text-foreground">Intégrations API</strong>,{" "}
                <strong className="text-foreground">Mapping enrichissement</strong> et cette page.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ------------------------------------------------------------ */}
      <section className="space-y-3">
        <SectionTitle>Remplir la base</SectionTitle>
        <Card>
          <CardHeader>
            <CardTitle>Entreprises et Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Bouton <strong className="text-foreground">"+ Entreprise"</strong> sur <code>/companies</code> ou{" "}
              <strong className="text-foreground">"+ Nouveau contact"</strong> sur <code>/contacts</code> — saisie
              manuelle, un enregistrement à la fois. Il n'existe pas aujourd'hui d'import CSV pour créer des
              entreprises/contacts <em>ex nihilo</em> depuis le CRM lui-même (l'import de masse se fait par un export
              Pharow traité par un développeur, voir plus bas).
            </p>
            <p>
              La seule vraie exception : sur <code>/lists</code> (Segments), le bouton{" "}
              <strong className="text-foreground">"Importer un fichier"</strong> permet d'ajouter un CSV, mais
              uniquement pour classer des contacts/entreprises <em>déjà existants</em> dans une nouvelle liste
              (correspondance par email ou SIREN/nom) — il ne crée jamais de nouvelle fiche à partir d'une ligne non
              reconnue, seulement rapporté comme "non reconnue".
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prospects et pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Un <strong className="text-foreground">prospect</strong> relie une entreprise à un statut d'avancement
              (12 statuts) : <Badge>À enrichir</Badge> → <Badge>Enrichi (Pappers)</Badge> →{" "}
              <Badge>Enrichi (contact)</Badge> → <Badge variant="blue">Prêt</Badge> →{" "}
              <Badge variant="blue">En séquence</Badge> → <Badge variant="purple">A répondu</Badge> →{" "}
              <Badge variant="purple">RDV pris</Badge> → <Badge variant="purple">Qualifié</Badge> →{" "}
              <Badge variant="yellow">Proposition envoyée</Badge> → <Badge variant="green">Gagné</Badge> (ou{" "}
              <Badge variant="red">Perdu</Badge> / <Badge variant="red">Pas intéressé</Badge>).
            </p>
            <p>
              La vue <strong className="text-foreground">Pipeline</strong> affiche ces statuts en colonnes Kanban —
              glisser une carte vers une autre colonne change réellement le statut du prospect en base. Un clic simple
              (sans glisser) ouvre la fiche détail.
            </p>
            <p>
              Les 3 premiers statuts (jusqu'à "Enrichi (contact)") avancent automatiquement via le pipeline
              d'enrichissement (voir la section Intégrations API ci-dessous) — pas une saisie manuelle. Les statuts
              suivants avancent soit manuellement (changement de statut dans le CRM), soit via les webhooks
              Smartlead/la synchro Lemlist quand un client répond ou ouvre un email/message LinkedIn.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opportunités et Tâches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Une <strong className="text-foreground">opportunité</strong> (deal) se crée depuis{" "}
              <code>/opportunities</code> ("+ Opportunité") — montant, probabilité, étape de pipeline (les étapes sont
              personnalisables par client dans la vue Kanban). Passer un deal à "Gagné" déclenche automatiquement le
              calcul d'attribution commerciale (qui a fait avancer ce prospect, montant de commission) — un vrai
              trigger PostgreSQL, pas une estimation.
            </p>
            <p>
              Les <strong className="text-foreground">tâches</strong> peuvent être liées à un contact, une entreprise
              ou une opportunité, avec échéance et responsable. Le calendrier de tâches (<code>/tasks</code>) affiche
              les échéances du jour en permanence dans l'en-tête.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segments (listes) et dossiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Une liste (Contacts, Entreprises ou Opportunités) est soit{" "}
              <strong className="text-foreground">statique</strong> (membres choisis à la main ou ajoutés depuis les
              pages Contacts/Entreprises/Opportunités), soit{" "}
              <strong className="text-foreground">dynamique</strong> (critères ET/OU évalués en continu contre les
              données réelles — aucun effectif approximatif).
            </p>
            <p>
              En sélectionnant un client dans le filtre de <code>/lists</code>, un panneau{" "}
              <strong className="text-foreground">Dossiers</strong> apparaît à gauche pour ranger les listes de ce
              client dans une arborescence à 2 niveaux. Supprimer un dossier ne supprime jamais les listes qu'il
              contenait — elles sont juste "déclassées" (retirées du dossier).
            </p>
            <p>
              Une liste supprimée passe dans la <strong className="text-foreground">Corbeille</strong> (bouton en
              haut de la page) et y reste 30 jours avant purge automatique — "Restaurer" l'y récupère à tout moment.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ------------------------------------------------------------ */}
      <section className="space-y-3">
        <SectionTitle>Automatiser</SectionTitle>
        <Card>
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p>
              Une règle d'automatisation (<code>/automations</code>) se compose de 3 blocs :{" "}
              <strong className="text-foreground">déclencheur</strong> (à la création d'un enregistrement, ou au
              changement d'étape d'une opportunité), <strong className="text-foreground">conditions</strong>{" "}
              (ET/OU, sur un champ réel), <strong className="text-foreground">action</strong>.
            </p>
            <p>
              Deux actions existent : <strong className="text-foreground">créer une tâche</strong> (titre, échéance,
              responsable optionnels), et <strong className="text-foreground">enrichir</strong> (déclenche
              Pappers/Dropcontact sur un nouveau prospect — voir plus bas, nécessite une clé technique remplie par un
              administrateur, sinon l'action ne fait rien silencieusement).
            </p>
            <p>
              En cochant "Brancher l'action selon les conditions", deux actions distinctes peuvent être définies —
              une si les conditions sont vraies, une autre sinon — plutôt qu'une action unique.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ------------------------------------------------------------ */}
      <section className="space-y-3">
        <SectionTitle>Suivre l'activité</SectionTitle>
        <Card>
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Dashboard</strong> et{" "}
              <strong className="text-foreground">Reporting</strong> : funnel de conversion, valeur de pipeline,
              activité (appels/emails/RDV) par semaine, performance par client (commercial le plus actif, contacts
              réellement travaillés). <strong className="text-foreground">Campagnes</strong> : lecture seule des
              statistiques LinkedIn Lemlist déjà synchronisées (leads/connectés/réponses) — la création et l'envoi
              des séquences se font toujours dans Lemlist lui-même, pas dans ce CRM.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ------------------------------------------------------------ */}
      <section className="space-y-3">
        <SectionTitle>Mon calendrier</SectionTitle>
        <Card>
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p>
              Connecter <strong className="text-foreground">Google Calendar</strong> ou{" "}
              <strong className="text-foreground">Microsoft/Outlook</strong> (bouton dédié, authentification OAuth
              réelle) affiche les RDV à venir directement dans le CRM et permet d'en créer/modifier — synchronisé avec
              le vrai calendrier, pas une copie figée. Un lien de prise de rendez-vous public (
              <code>/book/:token</code>) peut être partagé à un prospect pour qu'il choisisse un créneau lui-même,
              selon les disponibilités réelles du calendrier connecté.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ------------------------------------------------------------ */}
      <section className="space-y-3">
        <SectionTitle>Réglages</SectionTitle>
        <Card>
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p>
              Ajouter des <strong className="text-foreground">champs personnalisés</strong> par client, sur Contacts,
              Entreprises ou Opportunités — texte, nombre, date, case à cocher, liste déroulante, ou choix multiples
              (tags). Ces champs deviennent utilisables comme critères dans les segments dynamiques et les règles
              d'automatisation.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ------------------------------------------------------------ */}
      <section className="space-y-3">
        <SectionTitle>Comment fonctionnent les API intégrées</SectionTitle>
        <p className="text-sm text-muted-foreground">
          L'état de connexion (clé API présente côté serveur) se consulte sur{" "}
          <strong className="text-foreground">Intégrations API</strong> (<code>/integrations</code>) — pas de suivi
          de quota/usage pour l'instant, ce n'est pas encore tracé en base.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Pappers — données légales des entreprises</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            À partir du SIREN ou de la raison sociale, remplit automatiquement SIREN, code/libellé NAF, forme
            juridique, effectif, chiffre d'affaires, ville, adresse, site web et date de création. C'est la première
            étape de la cascade d'enrichissement (statut "Enrichi (Pappers)").
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dropcontact — recherche d'email professionnel</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            À partir du nom, prénom et de l'entreprise, cherche un email professionnel vérifié et son niveau de
            confiance. Deuxième étape de la cascade (statut "Enrichi (contact)") — asynchrone (soumission puis
            consultation du résultat un peu plus tard, pas instantané).
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Claude (Anthropic) — messages et score IA</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Une fois un prospect enrichi, Claude génère un email de prospection, un message LinkedIn et une relance à
            J+7 personnalisés (statut "Prêt"). En parallèle, Claude calcule aussi un score 1-10 avec justification
            écrite, affiché en badge sur la fiche entreprise et dans les listes/Kanban — recalculé dès que Pappers a
            enrichi l'entreprise, indépendamment du reste du pipeline.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Smartlead — séquences email</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Envoie les séquences email et notifie le CRM en temps réel (webhook) des ouvertures, clics et réponses —
            fait avancer automatiquement le statut du prospect (jamais en arrière). La création des séquences
            elles-mêmes se fait dans Smartlead, pas dans ce CRM.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lemlist — prospection LinkedIn</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Suivi des demandes de connexion, messages et réponses LinkedIn. Contrairement à Smartlead, la synchro
            n'est pas en temps réel : elle se lance manuellement par un développeur (script de synchro), pas
            automatique pour l'instant — c'est pour ça que <strong className="text-foreground">Campagnes</strong> peut
            afficher des chiffres qui datent de la dernière synchro plutôt que de l'instant présent.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google Calendar / Microsoft Outlook</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Connexion OAuth par utilisateur (voir "Mon calendrier" ci-dessus) — lecture/écriture des événements réels
            du calendrier connecté, et calcul des disponibilités réelles pour la page de prise de RDV publique.
          </CardContent>
        </Card>

        <Card blueprint>
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Point important à connaître</strong> : en dehors d'une règle
              d'automatisation configurée avec l'action "Enrichir", il n'existe pas aujourd'hui de bouton "Enrichir
              maintenant" cliquable sur une fiche entreprise ou prospect existante. Le déclenchement de
              Pappers/Dropcontact/Claude se fait soit via l'import en masse (traité par un développeur), soit via une
              règle d'automatisation sur les nouveaux prospects. Si un prospect reste bloqué "À enrichir", c'est la
              raison la plus probable — pas un bug silencieux.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
