import { describe, expect, it } from "vitest";
import { groupEventsByDate } from "./calendarEventGrid";
import type { UpcomingCalendarEvent } from "../services/calendarEvents";

describe("groupEventsByDate", () => {
  const base: UpcomingCalendarEvent = { id: "1", title: "t", start: "", end: "", provider: "google" };

  it("regroupe les événements par jour local", () => {
    const day = new Date(2026, 8, 15, 10, 0).toISOString();
    const events: UpcomingCalendarEvent[] = [
      { ...base, id: "1", start: day },
      { ...base, id: "2", start: day },
    ];
    const groups = groupEventsByDate(events);
    const key = `${new Date(day).getFullYear()}-${String(new Date(day).getMonth() + 1).padStart(2, "0")}-${String(new Date(day).getDate()).padStart(2, "0")}`;
    expect(groups[key]).toHaveLength(2);
  });

  it("sépare des événements sur des jours différents", () => {
    const events: UpcomingCalendarEvent[] = [
      { ...base, id: "1", start: new Date(2026, 8, 15, 10, 0).toISOString() },
      { ...base, id: "2", start: new Date(2026, 8, 16, 10, 0).toISOString() },
    ];
    const groups = groupEventsByDate(events);
    expect(Object.keys(groups)).toHaveLength(2);
  });
});
