import { describe, expect, it } from "vitest";
import { buildScoringPrompt } from "./prompt.js";
import type { ScoringSignals } from "./signals.js";

const emptySignals: ScoringSignals = { representatives: [], financeHistory: [] };

describe("buildScoringPrompt", () => {
  it("includes the company name and NAF/employee facts", () => {
    const { user } = buildScoringPrompt({
      companyName: "PM MECANIQUE INDUSTRIE",
      nafLabel: "Mécanique industrielle",
      employeeRange: "Entre 20 et 49 salariés",
      website: null,
      signals: emptySignals,
    });
    expect(user).toContain("PM MECANIQUE INDUSTRIE");
    expect(user).toContain("Mécanique industrielle");
    expect(user).toContain("Entre 20 et 49 salariés");
  });

  it("reports no website when website is null", () => {
    const { user } = buildScoringPrompt({
      companyName: "ACME",
      nafLabel: null,
      employeeRange: null,
      website: null,
      signals: emptySignals,
    });
    expect(user).toContain("Site web renseigné : non");
  });

  it("reports the website URL when present", () => {
    const { user } = buildScoringPrompt({
      companyName: "ACME",
      nafLabel: null,
      employeeRange: null,
      website: "https://acme.example",
      signals: emptySignals,
    });
    expect(user).toContain("oui (https://acme.example)");
  });

  it("lists representatives with title and tenure", () => {
    const { user } = buildScoringPrompt({
      companyName: "ACME",
      nafLabel: null,
      employeeRange: null,
      website: null,
      signals: {
        representatives: [{ fullName: "Jean Dupont", title: "Président", monthsInRole: 6 }],
        financeHistory: [],
      },
    });
    expect(user).toContain("Jean Dupont");
    expect(user).toContain("Président");
    expect(user).toContain("en poste depuis 6 mois");
  });

  it("lists finance history with growth rate when available", () => {
    const { user } = buildScoringPrompt({
      companyName: "ACME",
      nafLabel: null,
      employeeRange: null,
      website: null,
      signals: {
        representatives: [],
        financeHistory: [{ year: 2023, revenue: 979039, growthRate: 0.1 }],
      },
    });
    expect(user).toContain("2023");
    expect(user).toContain("979 k€");
    expect(user).toContain("+0.1%");
  });

  it("includes all 4 positive and 4 negative signals from the brief", () => {
    const { user } = buildScoringPrompt({
      companyName: "ACME",
      nafLabel: null,
      employeeRange: null,
      website: null,
      signals: emptySignals,
    });
    expect(user).toContain("moins de 12 mois");
    expect(user).toContain("20 et 200 salariés");
    expect(user).toContain("sous-traitance mécanique");
    expect(user).toContain("stagnant ou en légère baisse");
    expect(user).toContain("Plus de 500 salariés");
    expect(user).toContain("appels d'offres publics");
    expect(user).toContain("forte croissance");
    expect(user).toContain("directeur commercial");
  });

  it("asks for exactly score + justification in the response", () => {
    const { user } = buildScoringPrompt({
      companyName: "ACME",
      nafLabel: null,
      employeeRange: null,
      website: null,
      signals: emptySignals,
    });
    expect(user).toContain("score");
    expect(user).toContain("justification");
  });
});
