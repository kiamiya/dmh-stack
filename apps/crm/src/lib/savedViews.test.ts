import { describe, expect, it, vi } from "vitest";
import { createSavedView, duplicateSavedView, loadSavedViews, removeSavedView, renameSavedView, saveSavedViews } from "./savedViews";
import { EMPTY_PROSPECT_FILTERS } from "./prospectFilters";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    _data: data,
  };
}

describe("loadSavedViews", () => {
  it("retourne [] si rien n'est sauvegardé", () => {
    expect(loadSavedViews(fakeStorage())).toEqual([]);
  });

  it("retourne [] si le JSON est corrompu", () => {
    expect(loadSavedViews(fakeStorage({ "dmh-crm-saved-views": "{not json" }))).toEqual([]);
  });

  it("retourne les vues sauvegardées", () => {
    const view = createSavedView("v1", "Ma vue", EMPTY_PROSPECT_FILTERS, "2026-08-01T00:00:00Z");
    const storage = fakeStorage({ "dmh-crm-saved-views": JSON.stringify([view]) });
    expect(loadSavedViews(storage)).toEqual([view]);
  });
});

describe("saveSavedViews", () => {
  it("écrit les vues en JSON", () => {
    const storage = fakeStorage();
    const view = createSavedView("v1", "Ma vue", EMPTY_PROSPECT_FILTERS, "2026-08-01T00:00:00Z");
    saveSavedViews(storage, [view]);
    expect(JSON.parse(storage._data["dmh-crm-saved-views"]!)).toEqual([view]);
  });

  it("ne lève pas si setItem échoue", () => {
    const storage = { setItem: vi.fn(() => { throw new Error("quota"); }) };
    expect(() => saveSavedViews(storage, [])).not.toThrow();
  });
});

describe("createSavedView", () => {
  it("trimme le nom", () => {
    const view = createSavedView("v1", "  Ma vue  ", EMPTY_PROSPECT_FILTERS, "2026-08-01T00:00:00Z");
    expect(view.name).toBe("Ma vue");
  });
});

describe("removeSavedView", () => {
  it("retire uniquement la vue ciblée", () => {
    const v1 = createSavedView("v1", "A", EMPTY_PROSPECT_FILTERS, "2026-08-01T00:00:00Z");
    const v2 = createSavedView("v2", "B", EMPTY_PROSPECT_FILTERS, "2026-08-01T00:00:00Z");
    expect(removeSavedView([v1, v2], "v1")).toEqual([v2]);
  });
});

describe("renameSavedView", () => {
  it("renomme la vue ciblée et trimme le nom", () => {
    const v1 = createSavedView("v1", "A", EMPTY_PROSPECT_FILTERS, "2026-08-01T00:00:00Z");
    const [renamed] = renameSavedView([v1], "v1", "  B  ");
    expect(renamed.name).toBe("B");
  });

  it("n'a aucun effet si l'id est introuvable", () => {
    const v1 = createSavedView("v1", "A", EMPTY_PROSPECT_FILTERS, "2026-08-01T00:00:00Z");
    expect(renameSavedView([v1], "missing", "B")).toEqual([v1]);
  });
});

describe("duplicateSavedView", () => {
  it("ajoute une copie avec un nouvel id, suffixée (copie)", () => {
    const v1 = createSavedView("v1", "A", EMPTY_PROSPECT_FILTERS, "2026-08-01T00:00:00Z");
    const result = duplicateSavedView([v1], "v1", "v2", "2026-08-02T00:00:00Z");
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ id: "v2", name: "A (copie)", filters: EMPTY_PROSPECT_FILTERS, createdAt: "2026-08-02T00:00:00Z" });
  });

  it("retourne la liste inchangée si l'id source est introuvable", () => {
    const v1 = createSavedView("v1", "A", EMPTY_PROSPECT_FILTERS, "2026-08-01T00:00:00Z");
    expect(duplicateSavedView([v1], "missing", "v2", "2026-08-02T00:00:00Z")).toEqual([v1]);
  });
});
