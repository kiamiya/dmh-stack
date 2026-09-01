import { describe, expect, it } from "vitest";
import { mergeActivityEvents } from "./activityFeed";

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
