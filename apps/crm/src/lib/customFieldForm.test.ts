import { describe, expect, it } from "vitest";
import { parseSelectOptions, slugifyFieldKey, validateCustomFieldForm } from "./customFieldForm";

describe("slugifyFieldKey", () => {
  it("met en minuscules et remplace les espaces par des underscores", () => {
    expect(slugifyFieldKey("Secteur d'activité")).toBe("secteur_d_activite");
  });

  it("retire les accents", () => {
    expect(slugifyFieldKey("Numéro de téléphone pro")).toBe("numero_de_telephone_pro");
  });

  it("retire les underscores en début/fin", () => {
    expect(slugifyFieldKey("  Score !  ")).toBe("score");
  });

  it("retourne une chaîne vide pour un libellé sans lettre/chiffre", () => {
    expect(slugifyFieldKey("!!!")).toBe("");
  });
});

describe("parseSelectOptions", () => {
  it("découpe et nettoie la saisie brute", () => {
    expect(parseSelectOptions("Chaud, Tiède ,  Froid")).toEqual(["Chaud", "Tiède", "Froid"]);
  });

  it("ignore les entrées vides", () => {
    expect(parseSelectOptions("A,,B,")).toEqual(["A", "B"]);
  });
});

describe("validateCustomFieldForm", () => {
  const base = { label: "Secteur", fieldType: "text" as const, selectOptionsRaw: "", existingKeys: [] };

  it("accepte un formulaire texte valide", () => {
    expect(validateCustomFieldForm(base)).toBeNull();
  });

  it("refuse un libellé vide", () => {
    expect(validateCustomFieldForm({ ...base, label: "  " })).toMatch(/libellé/i);
  });

  it("refuse une clé déjà utilisée", () => {
    expect(validateCustomFieldForm({ ...base, existingKeys: ["secteur"] })).toMatch(/existe déjà/);
  });

  it("refuse un champ de type liste sans options", () => {
    expect(validateCustomFieldForm({ ...base, fieldType: "select", selectOptionsRaw: "" })).toMatch(
      /option/i,
    );
  });

  it("accepte un champ de type liste avec au moins une option", () => {
    expect(validateCustomFieldForm({ ...base, fieldType: "select", selectOptionsRaw: "A, B" })).toBeNull();
  });

  it("refuse un champ de type choix multiples sans options", () => {
    expect(validateCustomFieldForm({ ...base, fieldType: "multiselect", selectOptionsRaw: "" })).toMatch(
      /option/i,
    );
  });

  it("accepte un champ de type choix multiples avec au moins une option", () => {
    expect(validateCustomFieldForm({ ...base, fieldType: "multiselect", selectOptionsRaw: "VIP, Chaud" })).toBeNull();
  });
});
