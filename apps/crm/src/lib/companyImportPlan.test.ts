import { describe, expect, it } from "vitest";
import { planCompanyImport } from "./companyImportPlan";

const MAPPING = { name: "Nom", city: "Ville", website: "Site web" };

describe("planCompanyImport", () => {
  it("planifie une ligne valide", () => {
    const rows = [{ Nom: "ACME", Ville: "Lyon", "Site web": "https://acme.test" }];
    const plan = planCompanyImport(rows, MAPPING, new Set());
    expect(plan.toCreate).toEqual([
      { csvLine: 2, data: { name: "ACME", city: "Lyon", website: "https://acme.test" } },
    ]);
    expect(plan.skipped).toEqual([]);
  });

  it("rejette une ligne sans nom", () => {
    const rows = [{ Nom: "", Ville: "Lyon", "Site web": "" }];
    const plan = planCompanyImport(rows, MAPPING, new Set());
    expect(plan.toCreate).toEqual([]);
    expect(plan.skipped).toEqual([{ csvLine: 2, reason: "Nom d'entreprise manquant" }]);
  });

  it("ignore une entreprise déjà existante pour ce client (insensible à la casse)", () => {
    const rows = [{ Nom: "acme", Ville: "", "Site web": "" }];
    const plan = planCompanyImport(rows, MAPPING, new Set(["ACME"].map((n) => n.toLowerCase())));
    expect(plan.toCreate).toEqual([]);
    expect(plan.skipped).toEqual([{ csvLine: 2, reason: 'Entreprise déjà existante : "acme"' }]);
  });

  it("ne recrée pas deux fois la même entreprise au sein du même fichier", () => {
    const rows = [
      { Nom: "ACME", Ville: "Lyon", "Site web": "" },
      { Nom: "acme", Ville: "Paris", "Site web": "" },
    ];
    const plan = planCompanyImport(rows, MAPPING, new Set());
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.skipped).toEqual([{ csvLine: 3, reason: 'Entreprise déjà existante : "acme"' }]);
  });
});
