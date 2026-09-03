import { describe, expect, it } from "vitest";
import { computeAvailableSlots } from "./availability";

const options = { slotDurationMinutes: 30, businessStartHour: 9, businessEndHour: 18 };
// Lundi 2026-09-07 (jour ouvré).
const windowStart = new Date("2026-09-07T00:00:00Z");
const windowEnd = new Date("2026-09-08T00:00:00Z");
const now = new Date("2026-09-01T00:00:00Z"); // avant la fenêtre, rien n'est "passé"

describe("computeAvailableSlots", () => {
  it("génère des créneaux uniquement pendant les heures ouvrées", () => {
    const slots = computeAvailableSlots([], windowStart, windowEnd, options, now);
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      const hour = new Date(s.start).getUTCHours();
      expect(hour).toBeGreaterThanOrEqual(9);
      expect(hour).toBeLessThan(18);
    }
    // 9h à 18h, créneaux de 30 min -> 18 créneaux.
    expect(slots).toHaveLength(18);
  });

  it("exclut les jours non ouvrés (week-end)", () => {
    // Samedi 2026-09-05.
    const saturdayStart = new Date("2026-09-05T00:00:00Z");
    const saturdayEnd = new Date("2026-09-06T00:00:00Z");
    const slots = computeAvailableSlots([], saturdayStart, saturdayEnd, options, now);
    expect(slots).toHaveLength(0);
  });

  it("exclut les créneaux qui chevauchent un intervalle occupé", () => {
    const busy = [{ start: "2026-09-07T10:00:00Z", end: "2026-09-07T11:00:00Z" }];
    const slots = computeAvailableSlots(busy, windowStart, windowEnd, options, now);
    const starts = slots.map((s) => s.start);
    // Les deux créneaux couverts par l'intervalle occupé sont exclus.
    expect(starts).not.toContain("2026-09-07T10:00:00.000Z");
    expect(starts).not.toContain("2026-09-07T10:30:00.000Z");
    // Les créneaux juste avant/après restent disponibles.
    expect(starts).toContain("2026-09-07T09:30:00.000Z");
    expect(starts).toContain("2026-09-07T11:00:00.000Z");
  });

  it("exclut les créneaux déjà passés", () => {
    const nowMidDay = new Date("2026-09-07T12:00:00Z");
    const slots = computeAvailableSlots([], windowStart, windowEnd, options, nowMidDay);
    expect(slots.every((s) => new Date(s.start).getTime() >= nowMidDay.getTime())).toBe(true);
    expect(slots.some((s) => s.start === "2026-09-07T12:00:00.000Z")).toBe(true);
    expect(slots.some((s) => s.start === "2026-09-07T09:00:00.000Z")).toBe(false);
  });

  it("retourne un tableau vide si tout est occupé", () => {
    const busy = [{ start: "2026-09-07T00:00:00Z", end: "2026-09-08T00:00:00Z" }];
    expect(computeAvailableSlots(busy, windowStart, windowEnd, options, now)).toEqual([]);
  });

  it("respecte des jours ouvrés personnalisés", () => {
    const saturdayStart = new Date("2026-09-05T00:00:00Z");
    const saturdayEnd = new Date("2026-09-06T00:00:00Z");
    const slots = computeAvailableSlots([], saturdayStart, saturdayEnd, { ...options, businessDays: [6] }, now);
    expect(slots.length).toBeGreaterThan(0);
  });
});
