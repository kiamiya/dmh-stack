import { describe, expect, it } from "vitest";
import { escapeLikePattern, findCompanyByName, normalizeCompanyName } from "./crmLink.js";

describe("rattachement au CRM", () => {
  it("normalise casse, accents et espaces", () => {
    expect(normalizeCompanyName("  Société   Générale ")).toBe("societe generale");
  });

  it("retrouve l'entreprise existante, sinon null", () => {
    const companies = [
      { id: "1", name: "ACME Industrie" },
      { id: "2", name: "Béton & Cie" },
    ];
    expect(findCompanyByName(companies, "acme  industrie")).toEqual({ id: "1", name: "ACME Industrie" });
    expect(findCompanyByName(companies, "BETON & CIE")).toEqual({ id: "2", name: "Béton & Cie" });
    expect(findCompanyByName(companies, "ACME")).toBeNull();
  });

  it("escapeLikePattern : jokers neutralisés", () => {
    expect(escapeLikePattern("a_b%c@x.fr")).toBe(String.raw`a\_b\%c@x.fr`);
    expect(escapeLikePattern("plain@x.fr")).toBe("plain@x.fr");
  });
});
