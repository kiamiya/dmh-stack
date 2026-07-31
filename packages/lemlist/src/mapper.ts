import type { MappedProspectStatus } from "@dmh/smartlead";
import type { LemlistActivity } from "./client.js";

/**
 * Types d'activité LinkedIn confirmés contre la vraie API Lemlist
 * (developer.lemlist.com/api-reference/endpoints/activities). Les autres
 * types (emailSent, emailOpened, etc.) sont ignorés ici — Smartlead couvre
 * déjà l'email (S4).
 */
export type LemlistInteractionType =
  | "linkedin_request_sent"
  | "linkedin_connected"
  | "linkedin_message_sent"
  | "linkedin_replied"
  | "note";

export interface MappedLemlistInteraction {
  type: LemlistInteractionType;
  channel: "linkedin";
  occurredAt: string;
  leadEmail: string;
  leadId: string | null;
  content?: string;
}

function normalizeOccurredAt(value: string | undefined): string {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Convertit une activité Lemlist en interaction prête à insérer dans
 * `interactions`. Retourne `null` pour un type d'activité non couvert ou
 * sans email de lead exploitable (ignoré proprement plutôt que de faire
 * planter la synchro).
 */
export function mapLemlistActivityToInteraction(
  activity: LemlistActivity,
): MappedLemlistInteraction | null {
  if (!activity.leadEmail) return null;

  const base = {
    channel: "linkedin" as const,
    occurredAt: normalizeOccurredAt(activity.createdAt),
    leadEmail: activity.leadEmail,
    leadId: activity.leadId ?? null,
  };

  switch (activity.type) {
    case "linkedinInviteDone":
      return { ...base, type: "linkedin_request_sent" };
    case "linkedinInviteAccepted":
      return { ...base, type: "linkedin_connected" };
    case "linkedinSent":
      return { ...base, type: "linkedin_message_sent" };
    case "linkedinReplied":
      return { ...base, type: "linkedin_replied" };
    case "linkedinInterested":
      return { ...base, type: "note", content: "Lemlist : lead marqué intéressé" };
    case "linkedinNotInterested":
      return { ...base, type: "note", content: "Lemlist : lead marqué non intéressé" };
    default:
      return null;
  }
}

/**
 * `linkedinInterested`/`linkedinNotInterested` sont des types d'activité
 * distincts côté Lemlist (pas un événement séparé de changement de
 * catégorie comme `LEAD_CATEGORY_UPDATED` chez Smartlead). Retourne `null`
 * (ne touche pas au statut) pour tout autre type.
 */
export function mapLemlistActivityToProspectStatus(activityType: string): MappedProspectStatus | null {
  switch (activityType) {
    case "linkedinInterested":
      return "qualified";
    case "linkedinNotInterested":
      return "not_interested";
    default:
      return null;
  }
}
