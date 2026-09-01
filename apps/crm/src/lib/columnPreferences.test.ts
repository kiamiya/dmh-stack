import { describe, expect, it, vi } from "vitest";
import { applyColumnOrder, loadColumnPreferences, moveColumn, saveColumnPreferences } from "./columnPreferences";

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

describe("loadColumnPreferences", () => {
  it("retourne null si rien n'est sauvegardé", () => {
    expect(loadColumnPreferences(fakeStorage())).toBeNull();
  });

  it("retourne les préférences valides", () => {
    const storage = fakeStorage({ "dmh-crm-prospects-columns": JSON.stringify({ order: ["a", "b"], hidden: ["b"] }) });
    expect(loadColumnPreferences(storage)).toEqual({ order: ["a", "b"], hidden: ["b"] });
  });

  it("retourne null si le JSON est corrompu", () => {
    const storage = fakeStorage({ "dmh-crm-prospects-columns": "{not json" });
    expect(loadColumnPreferences(storage)).toBeNull();
  });

  it("retourne null si la forme est invalide", () => {
    const storage = fakeStorage({ "dmh-crm-prospects-columns": JSON.stringify({ foo: "bar" }) });
    expect(loadColumnPreferences(storage)).toBeNull();
  });
});

describe("saveColumnPreferences", () => {
  it("écrit les préférences en JSON", () => {
    const storage = fakeStorage();
    saveColumnPreferences(storage, { order: ["a"], hidden: [] });
    expect(storage._data["dmh-crm-prospects-columns"]).toBe(JSON.stringify({ order: ["a"], hidden: [] }));
  });

  it("ne lève pas si setItem échoue (quota, navigation privée...)", () => {
    const storage = { setItem: vi.fn(() => { throw new Error("quota"); }) };
    expect(() => saveColumnPreferences(storage, { order: [], hidden: [] })).not.toThrow();
  });
});

describe("applyColumnOrder", () => {
  it("respecte l'ordre sauvegardé", () => {
    expect(applyColumnOrder(["a", "b", "c"], ["c", "a", "b"])).toEqual(["c", "a", "b"]);
  });

  it("ajoute en fin les colonnes nouvelles absentes de la préférence", () => {
    expect(applyColumnOrder(["a", "b", "c"], ["b"])).toEqual(["b", "a", "c"]);
  });

  it("ignore les ids sauvegardés qui n'existent plus", () => {
    expect(applyColumnOrder(["a", "b"], ["z", "b", "a"])).toEqual(["b", "a"]);
  });
});

describe("moveColumn", () => {
  it("monte un élément d'une position", () => {
    expect(moveColumn(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
  });

  it("descend un élément d'une position", () => {
    expect(moveColumn(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
  });

  it("ne fait rien si déjà en première position et qu'on monte", () => {
    expect(moveColumn(["a", "b", "c"], "a", -1)).toEqual(["a", "b", "c"]);
  });

  it("ne fait rien si déjà en dernière position et qu'on descend", () => {
    expect(moveColumn(["a", "b", "c"], "c", 1)).toEqual(["a", "b", "c"]);
  });

  it("ne fait rien pour un id inconnu", () => {
    expect(moveColumn(["a", "b"], "z", 1)).toEqual(["a", "b"]);
  });
});
