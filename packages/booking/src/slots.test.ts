import { describe, expect, it } from "vitest";
import { computeBookingSlots, isOfferedSlot, localDate, zonedTimeToUtcMs } from "./slots.js";
import type { SlotRules } from "./slots.js";

const PARIS = "Europe/Paris";

describe("zonedTimeToUtcMs", () => {
  it("heure d'été (UTC+2) et d'hiver (UTC+1)", () => {
    expect(new Date(zonedTimeToUtcMs(2026, 10, 12, 9 * 60, PARIS)).toISOString()).toBe("2026-10-12T07:00:00.000Z");
    expect(new Date(zonedTimeToUtcMs(2026, 11, 2, 9 * 60, PARIS)).toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });

  it("jour du passage à l'heure d'hiver (25/10/2026)", () => {
    expect(new Date(zonedTimeToUtcMs(2026, 10, 25, 9 * 60, PARIS)).toISOString()).toBe("2026-10-25T08:00:00.000Z");
    expect(new Date(zonedTimeToUtcMs(2026, 10, 25, 1 * 60, PARIS)).toISOString()).toBe("2026-10-24T23:00:00.000Z");
  });

  it("jour du passage à l'heure d'été (29/03/2026)", () => {
    expect(new Date(zonedTimeToUtcMs(2026, 3, 29, 10 * 60, PARIS)).toISOString()).toBe("2026-03-29T08:00:00.000Z");
  });
});

describe("localDate", () => {
  it("23h30 UTC le 11/10 = 12/10 à Paris", () => {
    expect(localDate(Date.parse("2026-10-11T23:30:00Z"), PARIS)).toEqual({ y: 2026, m: 10, d: 12 });
  });
});

const rules: SlotRules = {
  weeklyAvailability: [{ day: 1, start: "09:00", end: "11:00" }],
  timezone: PARIS,
  durationMinutes: 30,
  bufferMinutes: 15,
  minNoticeHours: 0,
  maxDaysAhead: 7,
};
// Vendredi 09/10/2026 12:00 UTC ; prochain lundi = 12/10.
const NOW = new Date("2026-10-09T12:00:00Z");

describe("computeBookingSlots", () => {
  it("lundi 9h-11h, 30 min + 15 min de pause : 9h00, 9h45, 10h30 heure de Paris", () => {
    expect(computeBookingSlots(rules, [], NOW)).toEqual([
      { start: "2026-10-12T07:00:00.000Z", end: "2026-10-12T07:30:00.000Z" },
      { start: "2026-10-12T07:45:00.000Z", end: "2026-10-12T08:15:00.000Z" },
      { start: "2026-10-12T08:30:00.000Z", end: "2026-10-12T09:00:00.000Z" },
    ]);
  });

  it("un événement de l'agenda bloque le créneau, pause comprise", () => {
    // Événement 9h20-9h40 Paris : bloque 9h00 (chevauchement) et 9h45 (pause de 15 min après la fin).
    const slots = computeBookingSlots(rules, [{ start: "2026-10-12T07:20:00Z", end: "2026-10-12T07:40:00Z" }], NOW);
    expect(slots.map((s) => s.start)).toEqual(["2026-10-12T08:30:00.000Z"]);
  });

  it("délai minimum et horizon", () => {
    const mondayMorning = new Date("2026-10-12T06:00:00Z"); // 8h Paris
    expect(computeBookingSlots({ ...rules, minNoticeHours: 2, maxDaysAhead: 8 }, [], mondayMorning).map((s) => s.start)).toEqual([
      "2026-10-12T08:30:00.000Z", // 10h30 : seul créneau ≥ 10h
      "2026-10-19T07:00:00.000Z",
      "2026-10-19T07:45:00.000Z",
      "2026-10-19T08:30:00.000Z",
    ]);
    expect(computeBookingSlots({ ...rules, maxDaysAhead: 2 }, [], NOW)).toEqual([]);
  });

  it("après le changement d'heure, 9h reste 9h heure de Paris", () => {
    const slots = computeBookingSlots({ ...rules, maxDaysAhead: 20 }, [], NOW);
    expect(slots.filter((s) => s.start.startsWith("2026-10-26")).map((s) => s.start)[0]).toBe("2026-10-26T08:00:00.000Z");
  });
});

describe("isOfferedSlot", () => {
  it("reconnaît un créneau proposé, quel que soit le format ISO", () => {
    const slots = computeBookingSlots(rules, [], NOW);
    expect(isOfferedSlot(slots, "2026-10-12T09:00:00+02:00")).toEqual(slots[0]);
    expect(isOfferedSlot(slots, "2026-10-12T09:10:00+02:00")).toBeNull();
  });
});
