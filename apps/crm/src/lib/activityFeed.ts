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

export interface ActivityDayGroup {
  label: string;
  events: ActivityEvent[];
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Libellé FR du jour : "Aujourd'hui", "Hier", ou date complète au-delà. */
function dayLabel(key: string, now: Date): string {
  const today = dateKey(now.toISOString());
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = dateKey(yesterday.toISOString());

  if (key === today) return "Aujourd'hui";
  if (key === yesterdayKey) return "Hier";
  return new Date(key).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * Pure : regroupe un fil déjà trié (le plus récent en premier, comme
 * retourné par `mergeActivityEvents`) par jour calendaire — l'ordre des
 * groupes et des événements à l'intérieur est préservé.
 */
export function groupActivityEventsByDay(events: ActivityEvent[], now: Date = new Date()): ActivityDayGroup[] {
  const groups: ActivityDayGroup[] = [];
  const groupByKey = new Map<string, ActivityDayGroup>();

  for (const event of events) {
    const key = dateKey(event.timestamp);
    let group = groupByKey.get(key);
    if (!group) {
      group = { label: dayLabel(key, now), events: [] };
      groupByKey.set(key, group);
      groups.push(group);
    }
    group.events.push(event);
  }

  return groups;
}
