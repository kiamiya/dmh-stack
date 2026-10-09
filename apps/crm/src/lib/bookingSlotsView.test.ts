import { describe, expect, it } from "vitest";
import { formatSlotDateTime, groupSlotsByLocalDay } from "./bookingSlotsView";

describe("groupSlotsByLocalDay", () => {
  it("groupe par jour local et affiche l'heure de Paris (pas l'UTC)", () => {
    const groups = groupSlotsByLocalDay(
      [
        { start: "2026-10-12T07:00:00.000Z", end: "2026-10-12T07:30:00.000Z" },
        { start: "2026-10-12T08:30:00.000Z", end: "2026-10-12T09:00:00.000Z" },
        { start: "2026-10-12T22:30:00.000Z", end: "2026-10-12T23:00:00.000Z" }, // 00h30 le 13 à Paris
      ],
      "Europe/Paris",
    );
    expect(groups.map((g) => [g.dayKey, g.dateLabel, g.slots.map((s) => s.timeLabel)])).toEqual([
      ["2026-10-12", "lundi 12 octobre", ["09:00", "10:30"]],
      ["2026-10-13", "mardi 13 octobre", ["00:30"]],
    ]);
  });
});

describe("formatSlotDateTime", () => {
  it("date et heure complètes en français", () => {
    expect(formatSlotDateTime("2026-10-12T07:00:00.000Z", "Europe/Paris")).toBe("lundi 12 octobre 2026 à 09:00");
  });
});
