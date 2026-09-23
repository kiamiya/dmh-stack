import { describe, expect, it } from "vitest";
import { applyCellCorrection } from "./importRowCorrection";
import { planContactImport } from "./contactImportPlan";

const rows = [
  { Prénom: "Alice", Nom: "Fictive", Entreprise: "ACME", Email: "alice@acme.test" },
  { Prénom: "Bob", Nom: "Exemple", Entreprise: "ACME", Email: "acmetest.test" },
];

describe("applyCellCorrection", () => {
  it("corrige la seule cellule visée sans muter l'original", () => {
    const next = applyCellCorrection(rows, 1, "Email", "bob@acme.test");
    expect(next[1].Email).toBe("bob@acme.test");
    expect(rows[1].Email).toBe("acmetest.test");
    expect(next[0]).toBe(rows[0]);
  });

  it("ignore un index hors bornes", () => {
    expect(applyCellCorrection(rows, 5, "Email", "x@y.z")).toBe(rows);
    expect(applyCellCorrection(rows, -1, "Email", "x@y.z")).toBe(rows);
  });

  it("une correction rend la ligne importable ; vider l'email l'importe sans email", () => {
    const mapping = { firstName: "Prénom", lastName: "Nom", companyName: "Entreprise", email: "Email" };
    expect(planContactImport(rows, mapping, new Set()).toCreate).toHaveLength(1);
    expect(planContactImport(applyCellCorrection(rows, 1, "Email", "bob@acme.test"), mapping, new Set()).toCreate).toHaveLength(2);
    const cleared = planContactImport(applyCellCorrection(rows, 1, "Email", ""), mapping, new Set());
    expect(cleared.toCreate[1].data.email).toBeNull();
  });
});
