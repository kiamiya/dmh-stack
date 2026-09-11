import { describe, expect, it } from "vitest";
import { EMPTY_DASHBOARD_FILTERS, filterByOwnerAndDate, isWithinDateRange, matchesOwner } from "./dashboardFilters";

describe("isWithinDateRange", () => {
  it("aucune contrainte si les deux bornes sont vides", () => {
    expect(isWithinDateRange(null, EMPTY_DASHBOARD_FILTERS)).toBe(true);
    expect(isWithinDateRange("2026-01-01", EMPTY_DASHBOARD_FILTERS)).toBe(true);
  });

  it("exclut une entité sans date dès qu'une borne est active", () => {
    expect(isWithinDateRange(null, { dateFrom: "2026-01-01", dateTo: null })).toBe(false);
  });

  it("respecte la borne de début", () => {
    expect(isWithinDateRange("2026-01-01", { dateFrom: "2026-02-01", dateTo: null })).toBe(false);
    expect(isWithinDateRange("2026-03-01", { dateFrom: "2026-02-01", dateTo: null })).toBe(true);
  });

  it("respecte la borne de fin (inclusive sur toute la journée)", () => {
    expect(isWithinDateRange("2026-02-01T23:59:00Z", { dateFrom: null, dateTo: "2026-02-01" })).toBe(true);
    expect(isWithinDateRange("2026-02-02T00:00:01Z", { dateFrom: null, dateTo: "2026-02-01" })).toBe(false);
  });
});

describe("matchesOwner", () => {
  it("vrai si aucun propriétaire filtré", () => {
    expect(matchesOwner("staff-1", EMPTY_DASHBOARD_FILTERS)).toBe(true);
  });

  it("compare l'assignation exacte", () => {
    expect(matchesOwner("staff-1", { ownerId: "staff-1" })).toBe(true);
    expect(matchesOwner("staff-2", { ownerId: "staff-1" })).toBe(false);
    expect(matchesOwner(null, { ownerId: "staff-1" })).toBe(false);
  });
});

describe("filterByOwnerAndDate", () => {
  it("combine propriétaire et plage de dates", () => {
    const rows = [
      { id: "1", owner: "staff-1", date: "2026-01-15" },
      { id: "2", owner: "staff-2", date: "2026-01-15" },
      { id: "3", owner: "staff-1", date: "2025-01-15" },
    ];
    const result = filterByOwnerAndDate(
      rows,
      { ownerId: "staff-1", dateFrom: "2026-01-01", dateTo: null },
      (r) => r.owner,
      (r) => r.date,
    );
    expect(result.map((r) => r.id)).toEqual(["1"]);
  });
});
