import { describe, expect, it } from "vitest";
import { previewCompanyUpdates, previewContactUpdates } from "./importUpdatePreview";
import type { ExistingCompanyFields, ExistingContactFields } from "./importUpdatePreview";
import type { ContactImportPlanItem } from "./contactImportPlan";
import type { CompanyImportPlanItem } from "./companyImportPlan";

const bob: ExistingContactFields = {
  first_name: "Bob",
  last_name: "Test",
  job_title: "CTO",
  linkedin_url: null,
  legal_basis: "legitimate_interest_prospect",
};

function contactItem(data: Partial<ContactImportPlanItem["data"]> = {}, custom: Record<string, string | null> = {}): ContactImportPlanItem {
  return {
    csvLine: 2,
    data: { firstName: "Bob", lastName: "Test", companyName: "Acme", jobTitle: null, email: "BOB@acme.test", linkedinUrl: null, ...data },
    customFieldValues: custom,
  };
}

const byEmail = new Map([["bob@acme.test", bob]]);

describe("previewContactUpdates", () => {
  it("fill_empty : un poste déjà renseigné n'est pas compté comme mise à jour (cas A10)", () => {
    expect(previewContactUpdates([contactItem({ jobTitle: "CEO" })], byEmail, "fill_empty", "legitimate_interest_prospect")).toEqual({
      toChange: 0,
      unchanged: 1,
    });
  });

  it("fill_empty : un champ vide complété compte comme mise à jour", () => {
    const item = contactItem({ linkedinUrl: "https://linkedin.com/in/bob" });
    expect(previewContactUpdates([item], byEmail, "fill_empty", null).toChange).toBe(1);
  });

  it("overwrite : une valeur différente compte, une valeur identique non", () => {
    expect(previewContactUpdates([contactItem({ jobTitle: "CEO" })], byEmail, "overwrite", null).toChange).toBe(1);
    expect(previewContactUpdates([contactItem({ jobTitle: "CTO" })], byEmail, "overwrite", null).toChange).toBe(0);
  });

  it("base juridique absente sur la fiche : compte comme mise à jour", () => {
    const noBasis = new Map([["bob@acme.test", { ...bob, legal_basis: null }]]);
    expect(previewContactUpdates([contactItem()], noBasis, "fill_empty", "legitimate_interest_prospect").toChange).toBe(1);
  });

  it("valeur de champ personnalisé : comptée à mettre à jour (majorant)", () => {
    expect(previewContactUpdates([contactItem({}, { Secteur: "BTP" })], byEmail, "fill_empty", null).toChange).toBe(1);
    expect(previewContactUpdates([contactItem({}, { Secteur: null })], byEmail, "fill_empty", null).toChange).toBe(0);
  });
});

describe("previewCompanyUpdates", () => {
  const existing = new Map<string, ExistingCompanyFields>([["acme", { city: "Paris", website: null }]]);
  const item = (data: Partial<CompanyImportPlanItem["data"]>): CompanyImportPlanItem => ({
    csvLine: 2,
    data: { name: "ACME", city: null, website: null, ...data },
    customFieldValues: {},
  });

  it("répartit selon la politique", () => {
    expect(previewCompanyUpdates([item({ city: "Lyon" })], existing, "fill_empty")).toEqual({ toChange: 0, unchanged: 1 });
    expect(previewCompanyUpdates([item({ city: "Lyon" })], existing, "overwrite")).toEqual({ toChange: 1, unchanged: 0 });
    expect(previewCompanyUpdates([item({ website: "acme.fr" })], existing, "fill_empty")).toEqual({ toChange: 1, unchanged: 0 });
  });
});
