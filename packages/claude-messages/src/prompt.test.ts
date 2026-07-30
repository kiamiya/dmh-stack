import { describe, expect, it } from "vitest";
import { buildMessagePrompt } from "./prompt.js";
import type { MessagePromptInput } from "./prompt.js";

const fullInput: MessagePromptInput = {
  companyName: "PM MECANIQUE INDUSTRIE",
  legalForm: "SAS",
  nafLabel: "Mécanique industrielle",
  employeeRange: "Entre 20 et 49 salariés",
  city: "LE CREUSOT",
  revenue: 979_039,
  contactFirstName: "Frederic",
  contactLastName: "Vaysse Labonde",
  jobTitle: "Président",
  monthsInRole: 18,
  dmhClientName: "ACME Conseil",
  dmhClientOfferDescription: "Accompagnement en transformation digitale pour PME industrielles.",
};

describe("buildMessagePrompt", () => {
  it("inclut le persona attendu dans le system prompt", () => {
    const { system } = buildMessagePrompt(fullInput);
    expect(system).toMatch(/expert en développement commercial B2B/);
    expect(system).toMatch(/PME industrielles/);
  });

  it("inclut toutes les informations disponibles dans le prompt utilisateur", () => {
    const { user } = buildMessagePrompt(fullInput);
    expect(user).toContain("PM MECANIQUE INDUSTRIE");
    expect(user).toContain("SAS");
    expect(user).toContain("Mécanique industrielle");
    expect(user).toContain("LE CREUSOT");
    expect(user).toContain("979 k€");
    expect(user).toContain("Frederic Vaysse Labonde");
    expect(user).toContain("Président");
    expect(user).toContain("18 mois");
    expect(user).toContain("ACME Conseil");
    expect(user).toContain("transformation digitale");
  });

  it("mentionne les contraintes de format du brief", () => {
    const { user } = buildMessagePrompt(fullInput);
    expect(user).toMatch(/3 à 4 phrases/);
    expect(user).toMatch(/J'espère que vous allez bien/);
    expect(user).toMatch(/150 et 200 caractères/);
    expect(user).toMatch(/angle différent/);
  });

  it("omet gracieusement les champs absents (naf, ville, CA, mois en poste)", () => {
    const minimalInput: MessagePromptInput = {
      ...fullInput,
      legalForm: null,
      nafLabel: null,
      employeeRange: null,
      city: null,
      revenue: null,
      jobTitle: null,
      monthsInRole: null,
    };

    const { user } = buildMessagePrompt(minimalInput);
    expect(user).not.toContain("Secteur :");
    expect(user).not.toContain("Ville :");
    expect(user).not.toContain("Chiffre d'affaires :");
    expect(user).not.toContain("En poste depuis");
    expect(user).toContain("PM MECANIQUE INDUSTRIE");
  });
});
