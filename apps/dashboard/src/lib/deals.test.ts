import { describe, expect, it } from "vitest";
import { formatCurrency, validateDealForm } from "./deals.js";

describe("validateDealForm", () => {
  const valid = { companyName: "ACME SAS", dealValue: "15000", signedAt: "2026-01-15" };

  it("accepts a valid input", () => {
    expect(validateDealForm(valid)).toBeNull();
  });

  it("rejects an empty company name", () => {
    expect(validateDealForm({ ...valid, companyName: "  " })).toMatch(/entreprise/i);
  });

  it("rejects a non-numeric deal value", () => {
    expect(validateDealForm({ ...valid, dealValue: "abc" })).toMatch(/montant/i);
  });

  it("rejects a zero or negative deal value", () => {
    expect(validateDealForm({ ...valid, dealValue: "0" })).toMatch(/montant/i);
    expect(validateDealForm({ ...valid, dealValue: "-500" })).toMatch(/montant/i);
  });

  it("rejects an empty signed date", () => {
    expect(validateDealForm({ ...valid, signedAt: "" })).toMatch(/date/i);
  });

  it("rejects an invalid signed date", () => {
    expect(validateDealForm({ ...valid, signedAt: "not-a-date" })).toMatch(/date/i);
  });

  it("rejects a future signed date", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(validateDealForm({ ...valid, signedAt: future.toISOString().slice(0, 10) })).toMatch(
      /futur/i,
    );
  });
});

describe("formatCurrency", () => {
  it("formats a positive amount in EUR (fr-FR)", () => {
    expect(formatCurrency(1500)).toContain("1");
    expect(formatCurrency(1500)).toContain("€");
  });

  it("returns a placeholder for null", () => {
    expect(formatCurrency(null)).toBe("—");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0)).toContain("0");
  });
});
