import { describe, expect, it } from "vitest";
import { dueReminder, remindersCoveredAt } from "./reminders.js";

const START = "2026-10-12T07:00:00.000Z";
const at = (iso: string) => new Date(iso);

describe("dueReminder", () => {
  it("rien avant l'heure du rappel", () => {
    expect(dueReminder(START, [24, 1], [], at("2026-10-11T06:59:00Z"))).toEqual({ send: false, markSent: [] });
  });

  it("rappel 24 h dû, puis 1 h dû", () => {
    expect(dueReminder(START, [24, 1], [], at("2026-10-11T07:00:00Z"))).toEqual({ send: true, markSent: [24] });
    expect(dueReminder(START, [24, 1], [24], at("2026-10-12T06:10:00Z"))).toEqual({ send: true, markSent: [1] });
    expect(dueReminder(START, [24, 1], [24, 1], at("2026-10-12T06:30:00Z"))).toEqual({ send: false, markSent: [] });
  });

  it("deux rappels dus en même temps : un seul e-mail", () => {
    expect(dueReminder(START, [24, 1], [], at("2026-10-12T06:30:00Z"))).toEqual({ send: true, markSent: [24, 1] });
  });

  it("rien une fois le RDV commencé", () => {
    expect(dueReminder(START, [24, 1], [], at("2026-10-12T07:00:00Z"))).toEqual({ send: false, markSent: [] });
  });
});

describe("remindersCoveredAt", () => {
  it("confirmé 3 h avant : le rappel 24 h est couvert, pas celui d'1 h", () => {
    expect(remindersCoveredAt(START, [24, 1], at("2026-10-12T04:00:00Z"))).toEqual([24]);
  });

  it("confirmé longtemps avant : rien de couvert", () => {
    expect(remindersCoveredAt(START, [24, 1], at("2026-10-09T12:00:00Z"))).toEqual([]);
  });
});
