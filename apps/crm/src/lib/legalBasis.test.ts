import { describe, expect, it } from "vitest";
import { DEFAULT_IMPORT_LEGAL_BASIS, LEGAL_BASIS_OPTIONS, legalBasisLabel, parseLegalBasis } from "./legalBasis";

describe("legalBasis", () => {
  it("propose les 6 bases juridiques HubSpot, défaut = intérêt légitime prospect", () => {
    expect(LEGAL_BASIS_OPTIONS).toHaveLength(6);
    expect(DEFAULT_IMPORT_LEGAL_BASIS).toBe("legitimate_interest_prospect");
    expect(LEGAL_BASIS_OPTIONS.map((o) => o.value)).toContain(DEFAULT_IMPORT_LEGAL_BASIS);
  });

  it("libellé : null = non renseignée", () => {
    expect(legalBasisLabel(null)).toBe("Non renseignée");
    expect(legalBasisLabel("consent")).toBe("Consentement explicite");
  });

  it("parse : valeur inconnue ou vide = null", () => {
    expect(parseLegalBasis("contract")).toBe("contract");
    expect(parseLegalBasis("")).toBeNull();
    expect(parseLegalBasis("n'importe quoi")).toBeNull();
  });
});
