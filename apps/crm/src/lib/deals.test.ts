import { describe, expect, it } from "vitest";
import { formatCurrency } from "./deals";

describe("formatCurrency", () => {
  it("formate un montant en euros (fr-FR)", () => {
    expect(formatCurrency(20000)).toContain("20");
    expect(formatCurrency(20000)).toContain("€");
  });

  it("retourne — pour null", () => {
    expect(formatCurrency(null)).toBe("—");
  });

  it("formate 0 correctement (pas confondu avec null)", () => {
    expect(formatCurrency(0)).toContain("0");
  });
});
