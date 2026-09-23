import type { InteractionType, ProspectStatus } from "@dmh/types";
import { getStatusLabel } from "./status";
import { getInteractionTypeLabel } from "./interactionLabels";

/**
 * S38-8 — historique de la fiche entreprise (colonne centrale, modèle
 * HubSpot) : fusion chronologique des interactions et changements de statut
 * de tous les prospects de l'entreprise, et des rendez-vous liés. Pur.
 */
export type CompanyTimelineKind = "interaction" | "status" | "meeting";

export interface CompanyTimelineEvent {
  id: string;
  at: string;
  kind: CompanyTimelineKind;
  title: string;
  detail: string | null;
  /** Contact concerné (prospect), si connu. */
  contactName: string | null;
  authorName: string | null;
}

export interface TimelineInteraction {
  id: string;
  prospect_id: string;
  type: InteractionType;
  subject: string | null;
  content: string | null;
  occurred_at: string;
  created_by: string | null;
}

export interface TimelineStatusChange {
  prospect_id: string;
  old_status: ProspectStatus | null;
  new_status: ProspectStatus;
  changed_by: string | null;
  changed_at: string;
}

export interface TimelineMeeting {
  id: string;
  title: string;
  starts_at: string;
}

export interface CompanyTimelineInput {
  interactions: TimelineInteraction[];
  statusHistory: TimelineStatusChange[];
  meetings: TimelineMeeting[];
  contactNameByProspectId: Map<string, string>;
  staffNameById: Map<string, string>;
}

export function buildCompanyTimeline(input: CompanyTimelineInput): CompanyTimelineEvent[] {
  const { contactNameByProspectId, staffNameById } = input;
  const events: CompanyTimelineEvent[] = [];

  for (const i of input.interactions) {
    events.push({
      id: `interaction-${i.id}`,
      at: i.occurred_at,
      kind: "interaction",
      title: getInteractionTypeLabel(i.type),
      detail: [i.subject, i.content].filter(Boolean).join(" — ") || null,
      contactName: contactNameByProspectId.get(i.prospect_id) ?? null,
      authorName: i.created_by ? (staffNameById.get(i.created_by) ?? null) : null,
    });
  }

  input.statusHistory.forEach((s, index) => {
    events.push({
      id: `status-${s.prospect_id}-${s.changed_at}-${index}`,
      at: s.changed_at,
      kind: "status",
      title: s.old_status
        ? `Statut : ${getStatusLabel(s.old_status)} → ${getStatusLabel(s.new_status)}`
        : `Statut initial : ${getStatusLabel(s.new_status)}`,
      detail: null,
      contactName: contactNameByProspectId.get(s.prospect_id) ?? null,
      authorName: s.changed_by ? (staffNameById.get(s.changed_by) ?? null) : null,
    });
  });

  for (const m of input.meetings) {
    events.push({
      id: `meeting-${m.id}`,
      at: m.starts_at,
      kind: "meeting",
      title: `Rendez-vous : ${m.title}`,
      detail: null,
      contactName: null,
      authorName: null,
    });
  }

  return events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/** Pure : filtre de l'historique par nature d'événement ("all" = tout). */
export function filterCompanyTimeline(
  events: CompanyTimelineEvent[],
  kind: CompanyTimelineKind | "all",
): CompanyTimelineEvent[] {
  return kind === "all" ? events : events.filter((e) => e.kind === kind);
}
