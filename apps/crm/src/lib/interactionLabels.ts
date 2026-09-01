import type { InteractionType } from "@dmh/types";
import type { BadgeProps } from "../components/ui/badge";

/** Libellés FR des 13 types d'interaction (supabase/migrations/001_initial_schema.sql + 006) — dupliqué depuis apps/dashboard, même convention que status.ts/score.ts. */
const LABELS: Record<InteractionType, string> = {
  email_sent: "Email envoyé",
  email_opened: "Email ouvert",
  email_clicked: "Lien cliqué",
  email_replied: "Réponse reçue",
  email_unsubscribed: "Désinscription",
  email_bounced: "Email rejeté",
  linkedin_request_sent: "Demande LinkedIn envoyée",
  linkedin_connected: "Connexion LinkedIn",
  linkedin_message_sent: "Message LinkedIn envoyé",
  linkedin_replied: "Réponse LinkedIn",
  call: "Appel",
  meeting: "Rendez-vous",
  note: "Note",
};

const COLORS: Record<InteractionType, NonNullable<BadgeProps["variant"]>> = {
  email_sent: "blue",
  email_opened: "default",
  email_clicked: "blue",
  email_replied: "green",
  email_unsubscribed: "red",
  email_bounced: "red",
  linkedin_request_sent: "blue",
  linkedin_connected: "blue",
  linkedin_message_sent: "blue",
  linkedin_replied: "green",
  call: "purple",
  meeting: "purple",
  note: "default",
};

export function getInteractionTypeLabel(type: InteractionType): string {
  return LABELS[type];
}

export function getInteractionTypeColor(type: InteractionType): NonNullable<BadgeProps["variant"]> {
  return COLORS[type];
}
