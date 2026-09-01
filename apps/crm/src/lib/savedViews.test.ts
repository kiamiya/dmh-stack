import { describe, expect, it, vi } from "vitest";
import { createSavedView, loadSavedViews, removeSavedView, saveSavedViews } from "./savedViews";
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
