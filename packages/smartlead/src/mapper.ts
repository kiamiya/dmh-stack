/**
 * Mapping des événements webhook Smartlead (doc api.smartlead.ai, pas
 * détaillée dans le brief — types d'événements et champs vérifiés par
 * recherche avant d'écrire ce fichier, cf. PROGRESS.md).
 */

export type SmartleadInteractionType =
  | "email_sent"
  | "email_opened"
  | "email_clicked"
  | "email_replied"
  | "email_unsubscribed"
  | "email_bounced"
  | "note";

export interface SmartleadWebhookPayload {
  event_type: string;
  to_email?: string;
  lead_email?: string;
  from_email?: string;
  subject?: string;
  reply_body?: string;
  preview_text?: string;
  custom_subject?: string;
  custom_email_message?: string;
  time_sent?: string;
  time_opened?: string;
  time_clicked?: string;
  time_replied?: string;
  time_bounced?: string;
  sequence_number?: number;
  link_clicked?: string[];
  category?: string;
  from?: string;
  to?: string;
  [key: string]: unknown;
}

export interface MappedInteraction {
  type: SmartleadInteractionType;
  channel: "email";
  subject: string | null;
  content: string | null;
  occurredAt: string;
  leadEmail: string;
}

function normalizeOccurredAt(value: string | undefined): string {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Convertit un événement webhook Smartlead en interaction prête à insérer
 * dans `interactions`. Retourne `null` pour un `event_type` non reconnu
 * (ignoré proprement plutôt que de faire échouer la livraison webhook).
 */
export function mapSmartleadEventToInteraction(
  payload: SmartleadWebhookPayload,
): MappedInteraction | null {
  const leadEmail = payload.to_email ?? payload.lead_email;
  if (!leadEmail) return null;

  switch (payload.event_type) {
    case "EMAIL_SENT":
    case "FIRST_EMAIL_SENT":
      return {
        type: "email_sent",
        channel: "email",
        subject: payload.custom_subject ?? null,
        content: payload.custom_email_message ?? null,
        occurredAt: normalizeOccurredAt(payload.time_sent),
        leadEmail,
      };

    case "EMAIL_OPEN":
      return {
        type: "email_opened",
        channel: "email",
        subject: null,
        content: null,
        occurredAt: normalizeOccurredAt(payload.time_opened),
        leadEmail,
      };

    case "EMAIL_LINK_CLICK":
      return {
        type: "email_clicked",
        channel: "email",
        subject: null,
        content: Array.isArray(payload.link_clicked) ? payload.link_clicked.join(", ") : null,
        occurredAt: normalizeOccurredAt(payload.time_clicked),
        leadEmail,
      };

    case "EMAIL_REPLY":
      return {
        type: "email_replied",
        channel: "email",
        subject: payload.subject ?? null,
        content: payload.reply_body ?? payload.preview_text ?? null,
        occurredAt: normalizeOccurredAt(payload.time_replied),
        leadEmail,
      };

    case "EMAIL_BOUNCE":
      return {
        type: "email_bounced",
        channel: "email",
        subject: null,
        content: null,
        occurredAt: normalizeOccurredAt(payload.time_bounced),
        leadEmail,
      };

    case "LEAD_UNSUBSCRIBED":
      return {
        type: "email_unsubscribed",
        channel: "email",
        subject: null,
        content: null,
        occurredAt: normalizeOccurredAt(undefined),
        leadEmail,
      };

    case "LEAD_CATEGORY_UPDATED":
      return {
        type: "note",
        channel: "email",
        subject: null,
        content: `Catégorie Smartlead : ${payload.from ?? "?"} → ${payload.to ?? payload.category ?? "?"}`,
        occurredAt: normalizeOccurredAt(undefined),
        leadEmail,
      };

    default:
      return null;
  }
}

/** Les 12 valeurs de l'enum `prospect_status` (supabase/migrations/001_initial_schema.sql). */
export type AnyProspectStatus =
  | "to_enrich"
  | "enriched_pappers"
  | "enriched_contact"
  | "ready"
  | "in_sequence"
  | "replied"
  | "meeting_booked"
  | "qualified"
  | "proposal_sent"
  | "won"
  | "lost"
  | "not_interested";

/**
 * Ordre de progression du pipeline, dans le même ordre que la déclaration
 * de l'enum. `won`/`lost`/`not_interested` sont traités comme des états
 * terminaux de même rang (aucun n'est "plus avancé" qu'un autre) — un
 * webhook Smartlead ne doit jamais faire basculer un deal déjà clos vers
 * un autre statut terminal.
 */
const STATUS_ORDER: Record<AnyProspectStatus, number> = {
  to_enrich: 0,
  enriched_pappers: 1,
  enriched_contact: 2,
  ready: 3,
  in_sequence: 4,
  replied: 5,
  meeting_booked: 6,
  qualified: 7,
  proposal_sent: 8,
  won: 9,
  lost: 9,
  not_interested: 9,
};

/**
 * Garde-fou "jamais de retour en arrière" pour les mises à jour de statut
 * déclenchées par un webhook Smartlead : n'autorise le passage à `next`
 * que s'il est strictement plus avancé que `current` dans le pipeline.
 */
export function shouldAdvanceStatus(current: AnyProspectStatus, next: AnyProspectStatus): boolean {
  return STATUS_ORDER[next] > STATUS_ORDER[current];
}

export type MappedProspectStatus =
  | "in_sequence"
  | "replied"
  | "meeting_booked"
  | "qualified"
  | "not_interested"
  | "won";

/**
 * Heuristique de correspondance "catégorie de lead Smartlead" -> statut
 * `prospects.status`. Les catégories Smartlead sont configurables par
 * compte — celles ci-dessous sont les valeurs par défaut les plus
 * courantes, pas une liste garantie par le brief. Retourne `null` (ne
 * touche pas au statut) pour toute catégorie non reconnue plutôt que de
 * risquer une transition erronée. À ajuster dès les premiers vrais
 * webhooks d'un client pilote (voir "Incertitudes techniques", PROGRESS.md).
 */
export function mapLeadCategoryToProspectStatus(
  category: string | null | undefined,
): MappedProspectStatus | null {
  if (!category) return null;

  switch (category.trim().toLowerCase()) {
    case "interested":
      return "qualified";
    case "meeting booked":
    case "meeting request":
      return "meeting_booked";
    case "not interested":
    case "wrong person":
    case "do not contact":
      return "not_interested";
    case "closed":
      return "won";
    default:
      return null;
  }
}
