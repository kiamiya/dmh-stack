import { describe, expect, it } from "vitest";
import { formatImportToast, summarizeImportErrors } from "./importErrorSummary";

describe("summarizeImportErrors", () => {
  it("retourne null sans erreur", () => {
    expect(summarizeImportErrors([])).toBeNull();
  });

  it("regroupe une erreur systémique répétée sur toutes les lignes", () => {
    const msg = 'record "new" has no field "stage_id"';
    const summary = summarizeImportErrors([
      { csvLine: 2, error: msg },
      { csvLine: 3, error: msg },
      { csvLine: 4, error: msg },
    ]);
    expect(summary).toBe(`3 ligne(s) en erreur lors de l'écriture : « ${msg} » (lignes 2, 3, 4)`);
  });

  it("garde des messages distincts séparés, au singulier pour une seule ligne", () => {
    const summary = summarizeImportErrors([
      { csvLine: 2, error: "A" },
      { csvLine: 5, error: "B" },
      { csvLine: 7, error: "A" },
    ]);
    expect(summary).toBe("3 ligne(s) en erreur lors de l'écriture : « A » (lignes 2, 7) ; « B » (ligne 5)");
  });

  it("tronque la liste des lignes au-delà de 10", () => {
    const errors = Array.from({ length: 13 }, (_, i) => ({ csvLine: i + 2, error: "X" }));
    expect(summarizeImportErrors(errors)).toContain("(lignes 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 et 3 autre(s))");
  });
});

describe("formatImportToast", () => {
  it("distingue lignes ignorées et lignes en erreur", () => {
    expect(formatImportToast(["0 contact(s) créé(s)"], 1, 3)).toBe(
      "0 contact(s) créé(s), 1 ligne(s) ignorée(s), 3 ligne(s) en erreur.",
    );
  });

  it("n'ajoute rien quand tout est passé", () => {
    expect(formatImportToast(["2 entreprise(s) créée(s)"], 0, 0)).toBe("2 entreprise(s) créée(s).");
  });
});
