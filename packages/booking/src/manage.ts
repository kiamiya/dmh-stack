// S39-8 — ce que le prospect peut encore faire de son RDV depuis le lien
// « reprogrammer / annuler » reçu par e-mail (CR du 09/10/2026).
//
// Module autonome (import de types uniquement), importable par Deno.

import type { MeetingStatus } from "./config.ts";

export interface ManageRights {
  canCancel: boolean;
  canReschedule: boolean;
  /** Explication affichée quand plus rien n'est possible. */
  reason: string | null;
}

/**
 * Pure : un RDV en attente ou confirmé peut être annulé ou reprogrammé tant
 * qu'il n'a pas commencé ; reprogrammer exige aussi que son type existe
 * encore et soit proposé (sinon il n'y a plus de créneaux à offrir).
 */
export function manageRights(status: MeetingStatus, startIso: string, typeAvailable: boolean, now: Date): ManageRights {
  if (status === "cancelled") return { canCancel: false, canReschedule: false, reason: "Ce rendez-vous a été annulé." };
  if (status === "declined") return { canCancel: false, canReschedule: false, reason: "Cette demande n'a pas pu être acceptée." };
  if (new Date(startIso).getTime() <= now.getTime()) {
    return { canCancel: false, canReschedule: false, reason: "Ce rendez-vous est passé." };
  }
  return { canCancel: true, canReschedule: typeAvailable, reason: null };
}
