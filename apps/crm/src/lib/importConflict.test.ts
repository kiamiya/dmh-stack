import { describe, expect, it } from "vitest";
import { buildConflictPatch, shouldWriteCustomFieldValue } from "./importConflict";

const existing = { job_title: "CEO", linkedin_url: null, first_name: "Alice" };

describe("buildConflictPatch", () => {
  it("skip : jamais de patch", () => {
    expect(buildConflictPatch(existing, { job_title: "CTO", linkedin_url: "https://linkedin.com/in/a" }, "skip")).toEqual({});
  });

  it("fill_empty : ne complète que les champs vides", () => {
    expect(buildConflictPatch(existing, { job_title: "CTO", linkedin_url: "https://linkedin.com/in/a" }, "fill_empty")).toEqual({
      linkedin_url: "https://linkedin.com/in/a",
    });
  });

  it("fill_empty : traite une chaîne blanche existante comme vide", () => {
    expect(buildConflictPatch({ job_title: "  " }, { job_title: "CTO" }, "fill_empty")).toEqual({ job_title: "CTO" });
  });

  it("overwrite : remplace les valeurs différentes", () => {
    expect(buildConflictPatch(existing, { job_title: "CTO", first_name: "Alice" }, "overwrite")).toEqual({ job_title: "CTO" });
  });

  it("une valeur vide du fichier n'efface jamais l'existant", () => {
    expect(buildConflictPatch(existing, { job_title: "", first_name: null }, "overwrite")).toEqual({});
  });
});

describe("shouldWriteCustomFieldValue", () => {
  it("respecte la politique", () => {
    expect(shouldWriteCustomFieldValue("x", "skip")).toBe(false);
    expect(shouldWriteCustomFieldValue(undefined, "skip")).toBe(false);
    expect(shouldWriteCustomFieldValue("x", "fill_empty")).toBe(false);
    expect(shouldWriteCustomFieldValue(undefined, "fill_empty")).toBe(true);
    expect(shouldWriteCustomFieldValue("", "fill_empty")).toBe(true);
    expect(shouldWriteCustomFieldValue("x", "overwrite")).toBe(true);
  });
});
