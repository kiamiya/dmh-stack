import { describe, expect, it } from "vitest";
import { formatFreshnessDays } from "./dataFreshness";

describe("formatFreshnessDays", () => {
  const now = new Date("2026-09-11T12:00:00Z");

  it("retourne le nombre de jours écoulés au format compact", () => {
    expect(formatFreshnessDays("2026-09-09T12:00:00Z", now)).toBe("2j");
  });

  it("retourne 0j le jour même", () => {
    expect(formatFreshnessDays("2026-09-11T08:00:00Z", now)).toBe("0j");
  });

  it("retourne — si aucune date", () => {
    expect(formatFreshnessDays(null, now)).toBe("—");
  });
});
