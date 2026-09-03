import { describe, expect, it } from "vitest";
import { matchesSegment } from "./segmentEvaluator";

const contact = { job_title: "Directeur Commercial", email: "a@b.fr", linkedin_url: null, revenue: 50000 };

describe("matchesSegment", () => {
  it("retourne true sans règle (segment vide = tout le monde)", () => {
    expect(matchesSegment(contact, [])).toBe(true);
  });

  it("eq : compare en chaîne", () => {
    expect(matchesSegment(contact, [{ field: "job_title", operator: "eq", value: "Directeur Commercial" }])).toBe(true);
    expect(matchesSegment(contact, [{ field: "job_title", operator: "eq", value: "Autre" }])).toBe(false);
  });

  it("neq : inverse de eq", () => {
    expect(matchesSegment(contact, [{ field: "job_title", operator: "neq", value: "Autre" }])).toBe(true);
  });

  it("gt / lt : comparaison numérique", () => {
    expect(matchesSegment(contact, [{ field: "revenue", operator: "gt", value: 10000 }])).toBe(true);
    expect(matchesSegment(contact, [{ field: "revenue", operator: "lt", value: 10000 }])).toBe(false);
  });

  it("gt/lt avec une valeur nulle ne matche jamais", () => {
    expect(matchesSegment(contact, [{ field: "missing_field", operator: "gt", value: 0 }])).toBe(false);
  });

  it("contains : insensible à la casse", () => {
    expect(matchesSegment(contact, [{ field: "job_title", operator: "contains", value: "commercial" }])).toBe(true);
    expect(matchesSegment(contact, [{ field: "job_title", operator: "contains", value: "marketing" }])).toBe(false);
  });

  it("is_set : vrai si non null/undefined/vide", () => {
    expect(matchesSegment(contact, [{ field: "email", operator: "is_set", value: null }])).toBe(true);
    expect(matchesSegment(contact, [{ field: "linkedin_url", operator: "is_set", value: null }])).toBe(false);
  });

  it("plusieurs règles combinées en ET", () => {
    const rules = [
      { field: "job_title", operator: "contains" as const, value: "commercial" },
      { field: "revenue", operator: "gt" as const, value: 10000 },
    ];
    expect(matchesSegment(contact, rules)).toBe(true);
    expect(matchesSegment(contact, [...rules, { field: "email", operator: "eq" as const, value: "autre" }])).toBe(false);
  });
});
