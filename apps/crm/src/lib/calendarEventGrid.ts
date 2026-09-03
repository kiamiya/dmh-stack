import type { UpcomingCalendarEvent } from "../services/calendarEvents";

function toDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Pure : regroupe les événements par jour local — l'échéance affichée doit correspondre au fuseau du navigateur, pas à l'UTC brut renvoyé par l'API. */
export function groupEventsByDate(events: UpcomingCalendarEvent[]): Record<string, UpcomingCalendarEvent[]> {
  const groups: Record<string, UpcomingCalendarEvent[]> = {};
  for (const event of events) {
    (groups[toDateKey(event.start)] ??= []).push(event);
  }
  return groups;
}
