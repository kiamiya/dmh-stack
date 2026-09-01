import { describe, expect, it } from "vitest";
import { groupActivityEventsByDay, mergeActivityEvents } from "./activityFeed";
import type { ActivityEvent } from "./activityFeed";

const companyNames = new Map([
  ["p1", "Acme"],
  ["p2", "Autre Corp"],
]);

const staff = new Map([["staff-1", { name: "William" }]]);

describe("mergeActivityEvents", () => {
  it("fusionne et trie les deux sources par ordre chronologique décroissant", () => {
    const statusHistory = [
      { prospect_id: "p1", old_status: null, new_status: "to_enrich" as const, changed_by: null, changed_at: "2026-08-01T09:00:00Z" },
      { prospect_id: "p1", old_status: "to_enrich" as const, new_status: "ready" as const, changed_by: null, changed_at: "2026-08-03T09:00:00Z" },
    ];
    const interactions = [
      { id: "i1", prospect_id: "p2", type: "email_sent" as const, channel: "email" as const, subject: "Sujet", content: null, occurred_at: "2026-08-02T09:00:00Z", created_by: null },
    ];

    const result = mergeActivityEvents(statusHistory, interactions, companyNames, staff);
    expect(result.map((e) => e.timestamp)).toEqual([
      "2026-08-03T09:00:00Z",
      "2026-08-02T09:00:00Z",
      "2026-08-01T09:00:00Z",
    ]);
  });

  it("limite le nombre d'événements retournés", () => {
    const statusHistory = Array.from({ length: 30 }, (_, i) => ({
      prospect_id: "p1",
      old_status: null,
      new_status: "to_enrich" as const,
      changed_by: null,
      changed_at: `2026-08-${String((i % 28) + 1).padStart(2, "0")}T09:00:00Z`,
    }));
    const result = mergeActivityEvents(statusHistory, [], companyNames, staff, 10);
    expect(result).toHaveLength(10);
  });

  it("décrit un changement de statut initial différemment d'une transition", () => {
    const statusHistory = [
      { prospect_id: "p1", old_status: null, new_status: "to_enrich" as const, changed_by: null, changed_at: "2026-08-01T09:00:00Z" },
    ];
    const result = mergeActivityEvents(statusHistory, [], companyNames, staff);
    expect(result[0]!.description).toMatch(/initial/i);
  });

  it("résout l'auteur via le lookup staff quand présent", () => {
    const statusHistory = [
      { prospect_id: "p1", old_status: "to_enrich" as const, new_status: "ready" as const, changed_by: "staff-1", changed_at: "2026-08-01T09:00:00Z" },
    ];
    const result = mergeActivityEvents(statusHistory, [], companyNames, staff);
    expect(result[0]!.authorName).toBe("William");
  });

  it("retourne un nom de prospect générique si l'id est inconnu", () => {
    const statusHistory = [
      { prospect_id: "unknown", old_status: null, new_status: "to_enrich" as const, changed_by: null, changed_at: "2026-08-01T09:00:00Z" },
    ];
    const result = mergeActivityEvents(statusHistory, [], companyNames, staff);
    expect(result[0]!.companyName).toBe("Prospect inconnu");
  });
});

function event(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: "e1",
    timestamp: "2026-08-26T09:00:00Z",
    prospectId: "p1",
    companyName: "Acme",
    description: "Description",
    authorName: null,
    ...overrides,
  };
}

describe("groupActivityEventsByDay", () => {
  const NOW = new Date("2026-08-26T15:00:00Z");

  it("regroupe le jour même sous Aujourd'hui", () => {
    const groups = groupActivityEventsByDay([event({ timestamp: "2026-08-26T09:00:00Z" })], NOW);
    expect(groups[0]!.label).toBe("Aujourd'hui");
  });

  it("regroupe la veille sous Hier", () => {
    const groups = groupActivityEventsByDay([event({ timestamp: "2026-08-25T09:00:00Z" })], NOW);
    expect(groups[0]!.label).toBe("Hier");
  });

  it("affiche une date complète au-delà d'hier", () => {
    const groups = groupActivityEventsByDay([event({ timestamp: "2026-08-01T09:00:00Z" })], NOW);
    expect(groups[0]!.label).not.toBe("Aujourd'hui");
    expect(groups[0]!.label).not.toBe("Hier");
    expect(groups[0]!.label.length).toBeGreaterThan(0);
  });

  it("préserve l'ordre d'entrée et regroupe les événements du même jour ensemble", () => {
    const events = [
      event({ id: "e1", timestamp: "2026-08-26T09:00:00Z" }),
      event({ id: "e2", timestamp: "2026-08-25T09:00:00Z" }),
      event({ id: "e3", timestamp: "2026-08-26T08:00:00Z" }),
    ];
    const groups = groupActivityEventsByDay(events, NOW);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.events.map((e) => e.id)).toEqual(["e1", "e3"]);
    expect(groups[1]!.events.map((e) => e.id)).toEqual(["e2"]);
  });

  it("retourne un tableau vide pour un fil vide", () => {
    expect(groupActivityEventsByDay([], NOW)).toEqual([]);
  });
});
