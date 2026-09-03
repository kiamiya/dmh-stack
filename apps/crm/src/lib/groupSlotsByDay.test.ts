import { describe, expect, it } from "vitest";
import { groupSlotsByDay } from "./groupSlotsByDay";

describe("groupSlotsByDay", () => {
  it("regroupe les créneaux par jour, triés chronologiquement", () => {
    const slots = [
      { start: "2026-09-08T09:00:00.000Z", end: "2026-09-08T09:30:00.000Z" },
      { start: "2026-09-07T09:00:00.000Z", end: "2026-09-07T09:30:00.000Z" },
      { start: "2026-09-07T10:00:00.000Z", end: "2026-09-07T10:30:00.000Z" },
    ];
    const groups = groupSlotsByDay(slots);
    expect(groups).toHaveLength(2);
    expect(groups[0].slots).toHaveLength(2);
    expect(groups[1].slots).toHaveLength(1);
    // 2026-09-07 est un lundi.
    expect(groups[0].dateLabel).toContain("lundi");
  });

  it("retourne un tableau vide sans créneau", () => {
    expect(groupSlotsByDay([])).toEqual([]);
  });
});
