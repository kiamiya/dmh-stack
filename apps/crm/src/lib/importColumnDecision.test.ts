import { describe, expect, it } from "vitest";
import {
  buildFieldDefinitionInsertsForNewFields,
  extractCustomFieldRawValues,
  sampleColumnValues,
  validateColumnDecisions,
} from "./importColumnDecision";
import type { ImportColumnDecision } from "./importColumnDecision";

describe("sampleColumnValues", () => {
  it("échantillonne les valeurs non vides d'une colonne", () => {
    const rows = [{ Secteur: "Industrie" }, { Secteur: "" }, { Secteur: "BTP" }];
    expect(sampleColumnValues(rows, "Secteur")).toEqual(["Industrie", "BTP"]);
  });

  it("déduplique les valeurs identiques", () => {
    const rows = [{ Secteur: "Industrie" }, { Secteur: "Industrie" }, { Secteur: "BTP" }];
    expect(sampleColumnValues(rows, "Secteur")).toEqual(["Industrie", "BTP"]);
  });

  it("respecte la limite du nombre de valeurs retournées", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ Secteur: `Valeur${i}` }));
    expect(sampleColumnValues(rows, "Secteur", 3)).toHaveLength(3);
  });

  it("tronque une valeur trop longue à 80 caractères", () => {
    const longValue = "x".repeat(100);
    const rows = [{ Notes: longValue }];
    const [sample] = sampleColumnValues(rows, "Notes");
    expect(sample).toBe(`${"x".repeat(80)}…`);
  });

  it("ne scanne que les maxRowsScanned premières lignes", () => {
    const rows = [
      { Secteur: "" },
      { Secteur: "Trouvée dans les 2 premières lignes" },
      { Secteur: "Trop loin, jamais scannée" },
    ];
    expect(sampleColumnValues(rows, "Secteur", 5, 2)).toEqual(["Trouvée dans les 2 premières lignes"]);
  });

  it("retourne un tableau vide si la colonne n'a aucune valeur", () => {
    const rows = [{ Secteur: "" }, { Secteur: "   " }];
    expect(sampleColumnValues(rows, "Secteur")).toEqual([]);
  });
});

describe("extractCustomFieldRawValues", () => {
  const decisions: ImportColumnDecision[] = [
    { column: "Secteur", action: "create_new", label: "Secteur", fieldType: "text", fieldKey: "secteur" },
    { column: "Taille", action: "map_existing", fieldDefinitionId: "field-1", fieldKey: "taille" },
    { column: "Colonne inutile", action: "ignore" },
  ];

  it("extrait la valeur des colonnes non ignorées, trim, null si vide", () => {
    const row = { Secteur: " Industrie ", Taille: "", "Colonne inutile": "peu importe" };
    expect(extractCustomFieldRawValues(row, decisions)).toEqual({
      Secteur: "Industrie",
      Taille: null,
    });
  });

  it("n'inclut jamais les colonnes ignorées", () => {
    const row = { Secteur: "Industrie", Taille: "Grande", "Colonne inutile": "x" };
    const values = extractCustomFieldRawValues(row, decisions);
    expect(values).not.toHaveProperty("Colonne inutile");
  });
});

describe("buildFieldDefinitionInsertsForNewFields", () => {
  it("construit une définition par décision create_new", () => {
    const decisions: ImportColumnDecision[] = [
      { column: "Secteur", action: "create_new", label: "Secteur", fieldType: "text", fieldKey: "secteur" },
    ];
    expect(buildFieldDefinitionInsertsForNewFields(decisions)).toEqual([
      { fieldKey: "secteur", label: "Secteur", fieldType: "text", selectOptions: null },
    ]);
  });

  it("déduplique par fieldKey même si plusieurs colonnes le partagent", () => {
    const decisions: ImportColumnDecision[] = [
      { column: "Secteur", action: "create_new", label: "Secteur", fieldType: "text", fieldKey: "secteur" },
      { column: "Secteur (bis)", action: "create_new", label: "Secteur bis", fieldType: "text", fieldKey: "secteur" },
    ];
    expect(buildFieldDefinitionInsertsForNewFields(decisions)).toHaveLength(1);
  });

  it("ignore les décisions ignore et map_existing", () => {
    const decisions: ImportColumnDecision[] = [
      { column: "Colonne", action: "ignore" },
      { column: "Taille", action: "map_existing", fieldDefinitionId: "field-1", fieldKey: "taille" },
    ];
    expect(buildFieldDefinitionInsertsForNewFields(decisions)).toEqual([]);
  });

  it("conserve les selectOptions pour un champ select", () => {
    const decisions: ImportColumnDecision[] = [
      {
        column: "Taille",
        action: "create_new",
        label: "Taille",
        fieldType: "select",
        fieldKey: "taille",
        selectOptions: ["Petite", "Grande"],
      },
    ];
    expect(buildFieldDefinitionInsertsForNewFields(decisions)[0].selectOptions).toEqual(["Petite", "Grande"]);
  });
});

describe("validateColumnDecisions", () => {
  it("retourne null quand les décisions sont cohérentes", () => {
    const decisions: ImportColumnDecision[] = [
      { column: "Secteur", action: "create_new", label: "Secteur", fieldType: "text", fieldKey: "secteur" },
      { column: "Taille", action: "map_existing", fieldDefinitionId: "field-1", fieldKey: "taille" },
      { column: "Colonne", action: "ignore" },
    ];
    expect(validateColumnDecisions(decisions)).toBeNull();
  });

  it("détecte deux colonnes ciblant le même champ existant", () => {
    const decisions: ImportColumnDecision[] = [
      { column: "Secteur", action: "map_existing", fieldDefinitionId: "field-1", fieldKey: "secteur" },
      { column: "Domaine", action: "map_existing", fieldDefinitionId: "field-1", fieldKey: "secteur" },
    ];
    const error = validateColumnDecisions(decisions);
    expect(error).toContain("Secteur");
    expect(error).toContain("Domaine");
  });

  it("détecte deux colonnes créant le même fieldKey", () => {
    const decisions: ImportColumnDecision[] = [
      { column: "Secteur", action: "create_new", label: "Secteur", fieldType: "text", fieldKey: "secteur" },
      { column: "Domaine", action: "create_new", label: "Secteur ", fieldType: "text", fieldKey: "secteur" },
    ];
    const error = validateColumnDecisions(decisions);
    expect(error).toContain("secteur");
  });
});
