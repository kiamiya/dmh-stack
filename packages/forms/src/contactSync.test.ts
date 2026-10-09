import { describe, expect, it } from "vitest";
import { customValuesToWrite, fillEmptyContactPatch } from "./contactSync.js";

describe("fillEmptyContactPatch", () => {
  it("ne complète que les colonnes vides, jamais d'écrasement", () => {
    expect(
      fillEmptyContactPatch(
        { first_name: "Alice", last_name: "", phone: null, job_title: "CTO" },
        { first_name: "Alicia", last_name: "Martin", phone: "+33612345678", job_title: "CEO", company: "ACME", email: "a@b.fr" },
      ),
    ).toEqual({ last_name: "Martin", phone: "+33612345678" });
  });

  it("rien à compléter", () => {
    expect(fillEmptyContactPatch({ first_name: "Alice" }, {})).toEqual({});
  });
});

describe("customValuesToWrite", () => {
  it("écrit seulement les champs sans valeur actuelle", () => {
    const existing = new Map<string, unknown>([
      ["d-sector", "BTP"],
      ["d-tags", []],
      ["d-note", ""],
    ]);
    expect(customValuesToWrite(existing, { "d-sector": "Industrie", "d-tags": ["A"], "d-note": "x", "d-new": 3 })).toEqual({
      "d-tags": ["A"],
      "d-note": "x",
      "d-new": 3,
    });
  });
});
