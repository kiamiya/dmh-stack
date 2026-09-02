import { describe, expect, it } from "vitest";
import { validateDealForm } from "./dealForm";

describe("validateDealForm", () => {
  it("accepte un formulaire valide sans date de signature (négociation)", () => {
    expect(validateDealForm({ companyName: "ACME SAS", dealValue: "10000", signedAt: "" })).toBeNull();
  });

  it("accepte une date de signature valide et passée", () => {
    expect(
      validateDealForm({ companyName: "ACME SAS", dealValue: "10000", signedAt: "2026-01-01" }),
    ).toBeNull();
  });

  it("refuse un nom d'entreprise vide", () => {
    expect(validateDealForm({ companyName: "  ", dealValue: "10000", signedAt: "" })).toMatch(/entreprise/i);
  });

  it("refuse un montant non numérique ou nul", () => {
    expect(validateDealForm({ companyName: "ACME SAS", dealValue: "0", signedAt: "" })).toMatch(/montant/i);
    expect(validateDealForm({ companyName: "ACME SAS", dealValue: "abc", signedAt: "" })).toMatch(/montant/i);
  });

  it("refuse une date de signature dans le futur", () => {
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    expect(validateDealForm({ companyName: "ACME SAS", dealValue: "10000", signedAt: future })).toMatch(
      /futur/,
    );
  });
});
