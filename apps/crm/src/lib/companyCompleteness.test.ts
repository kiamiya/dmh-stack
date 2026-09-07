import { describe, expect, it } from "vitest";
import { computeCompanyCompleteness } from "./companyCompleteness";

describe("computeCompanyCompleteness", () => {
  it("retourne 100 si tous les champs Pappers sont renseignés", () => {
    expect(
      computeCompanyCompleteness({ siren: "812449067", naf_label: "Métallurgie", employee_range: "50-250", revenue: 1000000, city: "Lyon" }),
    ).toBe(100);
  });

  it("retourne 0 si aucun champ n'est renseigné", () => {
    expect(computeCompanyCompleteness({ siren: null, naf_label: null, employee_range: null, revenue: null, city: null })).toBe(0);
  });

  it("calcule un ratio partiel arrondi", () => {
    expect(
      computeCompanyCompleteness({ siren: "812449067", naf_label: "Métallurgie", employee_range: null, revenue: null, city: null }),
    ).toBe(40); // 2/5
  });
});
