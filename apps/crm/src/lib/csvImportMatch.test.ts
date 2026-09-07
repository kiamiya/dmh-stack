import { describe, expect, it } from "vitest";
import { matchCsvRows } from "./csvImportMatch";

const entities = [
  { id: "c1", key: "a@b.fr" },
  { id: "c2", key: "d@e.fr" },
  { id: "c3", key: null },
];

describe("matchCsvRows", () => {
  it("associe les lignes qui correspondent à une entité existante", () => {
    const rows = [{ Email: "a@b.fr" }, { Email: "d@e.fr" }];
    const result = matchCsvRows(rows, "Email", entities);
    expect(result.matchedIds.sort()).toEqual(["c1", "c2"]);
    expect(result.unmatchedCount).toBe(0);
  });

  it("compte les lignes sans correspondance, sans créer d'entité", () => {
    const rows = [{ Email: "a@b.fr" }, { Email: "inconnu@x.fr" }];
    const result = matchCsvRows(rows, "Email", entities);
    expect(result.matchedIds).toEqual(["c1"]);
    expect(result.unmatchedCount).toBe(1);
  });

  it("compare sans tenir compte de la casse ou des espaces", () => {
    const rows = [{ Email: "  A@B.FR  " }];
    const result = matchCsvRows(rows, "Email", entities);
    expect(result.matchedIds).toEqual(["c1"]);
    expect(result.unmatchedCount).toBe(0);
  });

  it("ignore les entités sans clé", () => {
    const rows = [{ Email: "" }];
    const result = matchCsvRows(rows, "Email", entities);
    expect(result.matchedIds).toEqual([]);
    expect(result.unmatchedCount).toBe(1);
  });

  it("ne compte une entité qu'une fois même si plusieurs lignes la matchent", () => {
    const rows = [{ Email: "a@b.fr" }, { Email: "a@b.fr" }];
    const result = matchCsvRows(rows, "Email", entities);
    expect(result.matchedIds).toEqual(["c1"]);
    expect(result.unmatchedCount).toBe(0);
  });

  it("retourne tout non-matché sur un tableau d'entités vide", () => {
    const result = matchCsvRows([{ Email: "a@b.fr" }], "Email", []);
    expect(result.matchedIds).toEqual([]);
    expect(result.unmatchedCount).toBe(1);
  });
});
