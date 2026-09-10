import { describe, expect, it } from "vitest";
import { planContactImport } from "./contactImportPlan";

const MAPPING = {
  firstName: "Prénom",
  lastName: "Nom",
  companyName: "Entreprise",
  jobTitle: "Poste",
  email: "Email",
  linkedinUrl: "LinkedIn",
};

describe("planContactImport", () => {
  it("planifie une ligne valide", () => {
    const rows = [
      { Prénom: "Alice", Nom: "Fictive", Entreprise: "ACME", Poste: "CEO", Email: "alice@acme.test", LinkedIn: "" },
    ];
    const plan = planContactImport(rows, MAPPING, new Set());
    expect(plan.toCreate).toEqual([
      {
        csvLine: 2,
        data: {
          firstName: "Alice",
          lastName: "Fictive",
          companyName: "ACME",
          jobTitle: "CEO",
          email: "alice@acme.test",
          linkedinUrl: null,
        },
      },
    ]);
    expect(plan.skipped).toEqual([]);
  });

  it("rejette une ligne sans prénom ou nom", () => {
    const rows = [{ Prénom: "", Nom: "Fictive", Entreprise: "ACME", Poste: "", Email: "", LinkedIn: "" }];
    const plan = planContactImport(rows, MAPPING, new Set());
    expect(plan.toCreate).toEqual([]);
    expect(plan.skipped).toEqual([{ csvLine: 2, reason: "Prénom ou nom manquant" }]);
  });

  it("rejette une ligne sans entreprise", () => {
    const rows = [{ Prénom: "Alice", Nom: "Fictive", Entreprise: "", Poste: "", Email: "", LinkedIn: "" }];
    const plan = planContactImport(rows, MAPPING, new Set());
    expect(plan.skipped).toEqual([{ csvLine: 2, reason: "Entreprise manquante" }]);
  });

  it("rejette un email déjà présent en base", () => {
    const rows = [
      { Prénom: "Alice", Nom: "Fictive", Entreprise: "ACME", Poste: "", Email: "alice@acme.test", LinkedIn: "" },
    ];
    const plan = planContactImport(rows, MAPPING, new Set(["alice@acme.test"]));
    expect(plan.toCreate).toEqual([]);
    expect(plan.skipped).toEqual([{ csvLine: 2, reason: 'Email déjà utilisé : "alice@acme.test"' }]);
  });

  it("rejette un email en double au sein du même fichier (insensible à la casse)", () => {
    const rows = [
      { Prénom: "Alice", Nom: "Fictive", Entreprise: "ACME", Poste: "", Email: "Alice@Acme.test", LinkedIn: "" },
      { Prénom: "Alice2", Nom: "Fictive2", Entreprise: "ACME", Poste: "", Email: "alice@acme.test", LinkedIn: "" },
    ];
    const plan = planContactImport(rows, MAPPING, new Set());
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.skipped).toEqual([{ csvLine: 3, reason: 'Email déjà utilisé : "alice@acme.test"' }]);
  });

  it("accepte des lignes sans email (optionnel)", () => {
    const rows = [
      { Prénom: "Alice", Nom: "Fictive", Entreprise: "ACME", Poste: "", Email: "", LinkedIn: "" },
      { Prénom: "Bob", Nom: "Exemple", Entreprise: "ACME", Poste: "", Email: "", LinkedIn: "" },
    ];
    const plan = planContactImport(rows, MAPPING, new Set());
    expect(plan.toCreate).toHaveLength(2);
    expect(plan.skipped).toEqual([]);
  });
});
