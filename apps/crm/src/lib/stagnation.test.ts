import { describe, expect, it } from "vitest";
import { isStagnant } from "./stagnation";

const NOW = new Date("2026-08-26T12:00:00Z");

describe("isStagnant", () => {
  it("retourne false pour une activité récente", () => {
    expect(isStagnant("2026-08-25T12:00:00Z", 14, NOW)).toBe(false);
  });

  it("retourne true au-delà du seuil", () => {
    expect(isStagnant("2026-08-01T12:00:00Z", 14, NOW)).toBe(true);
  });

  it("retourne false pile au seuil (strictement supérieur requis)", () => {
    expect(isStagnant("2026-08-12T12:00:00Z", 14, NOW)).toBe(false);
  });

  it("retourne false si aucune activité n'a jamais eu lieu (null)", () => {
    expect(isStagnant(null, 14, NOW)).toBe(false);
  });

  it("respecte un seuil personnalisé", () => {
    expect(isStagnant("2026-08-20T12:00:00Z", 3, NOW)).toBe(true);
    expect(isStagnant("2026-08-20T12:00:00Z", 10, NOW)).toBe(false);
  });
});
