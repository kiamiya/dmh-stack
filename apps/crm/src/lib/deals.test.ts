import { describe, expect, it } from "vitest";
import { formatCurrency, getDealDisplayName } from "./deals";

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

describe("getDealDisplayName", () => {
  it("retourne le nom libre s'il est renseigné", () => {
    expect(getDealDisplayName({ name: "Renouvellement 2027", company_name: "ACME" })).toBe("Renouvellement 2027");
  });

  it("retourne le nom de l'entreprise si le nom libre est absent", () => {
    expect(getDealDisplayName({ name: null, company_name: "ACME" })).toBe("ACME");
  });

  it("retourne le nom de l'entreprise si le nom libre est une chaîne vide", () => {
    expect(getDealDisplayName({ name: "   ", company_name: "ACME" })).toBe("ACME");
  });
});
