import { describe, expect, it } from "vitest";
import {
  draftsFromOptions,
  hasOptionChanges,
  migrateFieldValue,
  summarizeOptionEdits,
  validateOptionDrafts,
} from "./fieldOptionsEdit";

const original = ["Critère 1 — à définir", "Critère 2 — à définir", "Critère 3 — à définir"];

describe("summarizeOptionEdits", () => {
  it("détecte renommage, suppression et ajout", () => {
    const drafts = draftsFromOptions(original);
    drafts[0].value = "Budget identifié";
    drafts.splice(1, 1);
    drafts.push({ original: null, value: " Décideur rencontré " });
    expect(summarizeOptionEdits(original, drafts)).toEqual({
      options: ["Budget identifié", "Critère 3 — à définir", "Décideur rencontré"],
      renames: { "Critère 1 — à définir": "Budget identifié" },
      removed: ["Critère 2 — à définir"],
    });
  });

  it("aucun changement si rien n'a bougé", () => {
    const summary = summarizeOptionEdits(original, draftsFromOptions(original));
    expect(hasOptionChanges(summary, original)).toBe(false);
  });

  it("un simple réordonnancement compte comme un changement", () => {
    const drafts = draftsFromOptions(original).reverse();
    expect(hasOptionChanges(summarizeOptionEdits(original, drafts), original)).toBe(true);
  });
});

describe("validateOptionDrafts", () => {
  it("refuse vide, liste vide et doublon insensible à la casse", () => {
    expect(validateOptionDrafts([])).toBe("Il faut au moins une option.");
    expect(validateOptionDrafts([{ original: null, value: "  " }])).toBe("Une option ne peut pas être vide.");
    expect(validateOptionDrafts([{ original: null, value: "HOT" }, { original: "hot", value: "hot" }])).toBe('Option en double : "hot".');
    expect(validateOptionDrafts(draftsFromOptions(original))).toBeNull();
  });
});

describe("migrateFieldValue", () => {
  const renames = { "Offre 1": "Audit énergétique" };
  const removed = ["Offre 2"];

  it("liste déroulante : renomme, vide si l'option est supprimée", () => {
    expect(migrateFieldValue("Offre 1", renames, removed)).toEqual({ changed: true, value: "Audit énergétique" });
    expect(migrateFieldValue("Offre 2", renames, removed)).toEqual({ changed: true, value: null });
    expect(migrateFieldValue("Offre 3", renames, removed)).toEqual({ changed: false, value: "Offre 3" });
  });

  it("choix multiples : renomme, retire, déduplique", () => {
    expect(migrateFieldValue(["Offre 1", "Offre 2", "Audit énergétique"], renames, removed)).toEqual({
      changed: true,
      value: ["Audit énergétique"],
    });
    expect(migrateFieldValue(["Offre 3"], renames, removed)).toEqual({ changed: false, value: ["Offre 3"] });
  });

  it("laisse les autres types intacts", () => {
    expect(migrateFieldValue(42, renames, removed)).toEqual({ changed: false, value: 42 });
    expect(migrateFieldValue(null, renames, removed)).toEqual({ changed: false, value: null });
  });
});
