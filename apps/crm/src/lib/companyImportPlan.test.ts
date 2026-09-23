import { describe, expect, it } from "vitest";
import { planCompanyImport } from "./companyImportPlan";
import type { ImportColumnDecision } from "./importColumnDecision";

const MAPPING = { name: "Nom", city: "Ville", website: "Site web" };

describe("planCompanyImport", () => {
  it("planifie une ligne valide", () => {
    const rows = [{ Nom: "ACME", Ville: "Lyon", "Site web": "https://acme.test" }];
    const plan = planCompanyImport(rows, MAPPING, new Set());
    expect(plan.toCreate).toEqual([
      {
        csvLine: 2,
        data: { name: "ACME", city: "Lyon", website: "https://acme.test" },
        customFieldValues: {},
      },
    ]);
    expect(plan.skipped).toEqual([]);
  });

  it("extrait les valeurs des colonnes non standard confirmées par l'agent d'import", () => {
    const rows = [{ Nom: "ACME", Ville: "Lyon", "Site web": "", Secteur: "Industrie" }];
    const decisions: ImportColumnDecision[] = [
      { column: "Secteur", action: "create_new", label: "Secteur", fieldType: "text", fieldKey: "secteur" },
    ];
    const plan = planCompanyImport(rows, MAPPING, new Set(), decisions);
    expect(plan.toCreate[0].customFieldValues).toEqual({ Secteur: "Industrie" });
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
    expect(plan.skipped).toEqual([{ csvLine: 3, reason: 'Entreprise en double dans le fichier : "acme"' }]);
  });

  it("S38-3 : une entreprise déjà en base part en mise à jour si la politique n'est pas 'skip'", () => {
    const rows = [{ Nom: "acme", Ville: "Lyon" }, { Nom: "Neuve", Ville: "" }];
    const plan = planCompanyImport(rows, { name: "Nom", city: "Ville" }, new Set(["acme"]), [], "overwrite");
    expect(plan.toUpdate.map((i) => i.data.name)).toEqual(["acme"]);
    expect(plan.toCreate.map((i) => i.data.name)).toEqual(["Neuve"]);
    expect(plan.skipped).toEqual([]);
  });
});
