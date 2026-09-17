import { describe, expect, it } from "vitest";
import { buildImportColumnAnalysisPrompt } from "./prompt.js";
import type { ImportColumnAnalysisPromptInput } from "./prompt.js";

const BASE_INPUT: ImportColumnAnalysisPromptInput = {
  entityType: "contact",
  mappedStandardFields: [{ key: "email", label: "Email" }],
  existingCustomFields: [],
  columns: [{ name: "Secteur d'activité", sampleValues: ["Industrie", "BTP"] }],
};

describe("buildImportColumnAnalysisPrompt", () => {
  it("liste les colonnes non reconnues avec leurs valeurs échantillonnées", () => {
    const prompt = buildImportColumnAnalysisPrompt(BASE_INPUT);
    expect(prompt.user).toContain('"Secteur d\'activité"');
    expect(prompt.user).toContain('"Industrie"');
    expect(prompt.user).toContain('"BTP"');
  });

  it("liste les champs standards déjà mappés pour contexte", () => {
    const prompt = buildImportColumnAnalysisPrompt(BASE_INPUT);
    expect(prompt.user).toContain("Email (email)");
  });

  it("indique l'absence de champ personnalisé existant quand la liste est vide", () => {
    const prompt = buildImportColumnAnalysisPrompt(BASE_INPUT);
    expect(prompt.user).toContain("Aucun champ personnalisé n'est encore défini");
  });

  it("liste les champs personnalisés existants avec leur id, pour permettre map_existing", () => {
    const prompt = buildImportColumnAnalysisPrompt({
      ...BASE_INPUT,
      existingCustomFields: [
        { id: "field-1", fieldKey: "secteur", label: "Secteur", fieldType: "text", selectOptions: null },
      ],
    });
    expect(prompt.user).toContain("id=field-1");
    expect(prompt.user).toContain("Secteur");
    expect(prompt.user).toContain("map_existing");
  });

  it("inclut les options d'un champ select existant", () => {
    const prompt = buildImportColumnAnalysisPrompt({
      ...BASE_INPUT,
      existingCustomFields: [
        {
          id: "field-1",
          fieldKey: "taille",
          label: "Taille",
          fieldType: "select",
          selectOptions: ["Petite", "Grande"],
        },
      ],
    });
    expect(prompt.user).toContain("options: Petite, Grande");
  });

  it("gère une colonne sans valeur observée", () => {
    const prompt = buildImportColumnAnalysisPrompt({
      ...BASE_INPUT,
      columns: [{ name: "Colonne vide", sampleValues: [] }],
    });
    expect(prompt.user).toContain('"Colonne vide" — valeurs observées : (aucune)');
  });

  it("adapte le libellé de l'entité (entreprises)", () => {
    const prompt = buildImportColumnAnalysisPrompt({ ...BASE_INPUT, entityType: "company" });
    expect(prompt.user).toContain("des entreprises");
  });

  it("n'ajoute pas de section de champs standards si aucun n'est mappé", () => {
    const prompt = buildImportColumnAnalysisPrompt({ ...BASE_INPUT, mappedStandardFields: [] });
    expect(prompt.user).not.toContain("Champs standards déjà associés");
  });

  it("retourne le même system prompt quel que soit l'entityType", () => {
    const contactPrompt = buildImportColumnAnalysisPrompt(BASE_INPUT);
    const companyPrompt = buildImportColumnAnalysisPrompt({ ...BASE_INPUT, entityType: "company" });
    expect(contactPrompt.system).toBe(companyPrompt.system);
  });
});
