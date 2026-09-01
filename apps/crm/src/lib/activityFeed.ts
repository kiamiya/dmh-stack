import type { ProspectStatus } from "@dmh/types";
import { getStatusLabel } from "./status";
import { getInteractionTypeLabel } from "./interactionLabels";
import type { StatusHistoryRow } from "../services/statusHistory";
import type { InteractionRow } from "../services/interactions";

export interface ActivityEvent {
  id: string;
  timestamp: string;
  prospectId: string;
  companyName: string;
  description: string;
  authorName: string | null;
}

interface StaffLookup {
  get(id: string): { name: string } | undefined;
}

function companyNameFor(prospectId: string, companyNameByProspectId: Map<string, string>): string {
  return companyNameByProspectId.get(prospectId) ?? "Prospect inconnu";
}

function statusChangeDescription(old_status: ProspectStatus | null, new_status: ProspectStatus): string {
  if (!old_status) return `Statut initial : ${getStatusLabel(new_status)}`;
  return `Statut changé : ${getStatusLabel(old_status)} → ${getStatusLabel(new_status)}`;
}

/**
 * Pure : fusionne l'historique des changements de statut et les
 * interactions en un seul fil chronologique (le plus récent en premier),
 * limité aux `limit` événements les plus récents.
 */
export function mergeActivityEvents(
  statusHistory: StatusHistoryRow[],
  interactions: InteractionRow[],
  companyNameByProspectId: Map<string, string>,
  staffByid: StaffLookup,
  limit = 20,
): ActivityEvent[] {
  const statusEvents: ActivityEvent[] = statusHistory.map((h, index) => ({
    id: `status-${h.prospect_id}-${index}-${h.changed_at}`,
    timestamp: h.changed_at,
    prospectId: h.prospect_id,
    companyName: companyNameFor(h.prospect_id, companyNameByProspectId),
    description: statusChangeDescription(h.old_status, h.new_status),
    authorName: h.changed_by ? (staffByid.get(h.changed_by)?.name ?? null) : null,
  }));

  const interactionEvents: ActivityEvent[] = interactions.map((i) => ({
    id: `interaction-${i.id}`,
    timestamp: i.occurred_at,
    prospectId: i.prospect_id,
    companyName: companyNameFor(i.prospect_id, companyNameByProspectId),
    description: i.subject ? `${getInteractionTypeLabel(i.type)} — ${i.subject}` : getInteractionTypeLabel(i.type),
    authorName: i.created_by ? (staffByid.get(i.created_by)?.name ?? null) : null,
  }));

  return [...statusEvents, ...interactionEvents]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}
