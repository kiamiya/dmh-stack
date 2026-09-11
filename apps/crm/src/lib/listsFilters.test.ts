import { describe, expect, it } from "vitest";
import { filterListRows } from "./listsFilters";
import type { ListOverviewRow } from "./listsOverview";

function row(overrides: Partial<ListOverviewRow>): ListOverviewRow {
  return {
    id: "l1",
    name: "Liste",
    entityType: "contact",
    mode: "static",
    clientId: "c1",
    clientName: "Client A",
    memberCount: 10,
    criteriaCount: null,
    enrichmentRate: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    createdBy: null,
    folderId: null,
    folderName: null,
    ...overrides,
  };
}

describe("filterListRows", () => {
  const rows = [
    row({ id: "a", clientId: "c1", entityType: "contact", mode: "static" }),
    row({ id: "b", clientId: "c2", entityType: "company", mode: "dynamic" }),
    row({ id: "c", clientId: "c1", entityType: "opportunity", mode: "dynamic" }),
    row({ id: "d", clientId: "c1", entityType: "contact", mode: "static", folderId: "f1", folderName: "Prospection" }),
  ];

  it("retourne tout sans filtre", () => {
    expect(filterListRows(rows, {})).toHaveLength(4);
  });

  it("filtre par client", () => {
    expect(filterListRows(rows, { clientId: "c1" }).map((r) => r.id)).toEqual(["a", "c", "d"]);
  });

  it("filtre par type d'entité", () => {
    expect(filterListRows(rows, { entityType: "company" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("filtre par mode", () => {
    expect(filterListRows(rows, { mode: "dynamic" }).map((r) => r.id)).toEqual(["b", "c"]);
  });

  it("combine les filtres (ET)", () => {
    expect(filterListRows(rows, { clientId: "c1", mode: "dynamic" }).map((r) => r.id)).toEqual(["c"]);
  });

  it("ignore une valeur de filtre vide", () => {
    expect(filterListRows(rows, { clientId: "", entityType: "", mode: "" })).toHaveLength(4);
  });

  it("filtre par dossier", () => {
    expect(filterListRows(rows, { folderIds: ["f1"] }).map((r) => r.id)).toEqual(["d"]);
  });

  it("ignore le filtre dossier si le tableau est vide", () => {
    expect(filterListRows(rows, { folderIds: [] })).toHaveLength(4);
  });

  it("exclut les listes non classées quand un dossier est sélectionné", () => {
    expect(filterListRows(rows, { folderIds: ["f1", "f2"] }).map((r) => r.id)).toEqual(["d"]);
  });
});
