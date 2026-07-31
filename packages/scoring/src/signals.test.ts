import { describe, expect, it } from "vitest";
import { extractScoringSignals } from "./signals.js";

const NOW = new Date("2026-07-31T00:00:00Z");

describe("extractScoringSignals", () => {
  it("extracts representatives with computed monthsInRole", () => {
    const raw = {
      representants: [
        { nom_complet: "Frederic Vaysse Labonde", qualite: "Président", date_prise_de_poste: "2019-03-01" },
      ],
    };
    const result = extractScoringSignals(raw, NOW);
    expect(result.representatives).toEqual([
      { fullName: "Frederic Vaysse Labonde", title: "Président", monthsInRole: 88 },
    ]);
  });

  it("handles a representative recently appointed (<12 months)", () => {
    const raw = {
      representants: [{ nom_complet: "Nouvelle Direction", qualite: "Directeur Général", date_prise_de_poste: "2026-01-15" }],
    };
    const result = extractScoringSignals(raw, NOW);
    expect(result.representatives[0].monthsInRole).toBeLessThan(12);
  });

  it("returns an empty array when representants is missing", () => {
    expect(extractScoringSignals({}, NOW).representatives).toEqual([]);
  });

  it("returns an empty array when representants is not an array", () => {
    expect(extractScoringSignals({ representants: "not-an-array" }, NOW).representatives).toEqual([]);
  });

  it("defaults missing fullName/title to safe fallbacks", () => {
    const result = extractScoringSignals({ representants: [{}] }, NOW);
    expect(result.representatives).toEqual([{ fullName: "?", title: null, monthsInRole: null }]);
  });

  it("extracts and sorts the 3 most recent finance years, most recent first", () => {
    const raw = {
      finances: [
        { annee: 2020, chiffre_affaires: 100 },
        { annee: 2023, chiffre_affaires: 400, taux_croissance_chiffre_affaires: 0.1 },
        { annee: 2022, chiffre_affaires: 300 },
        { annee: 2021, chiffre_affaires: 200 },
      ],
    };
    const result = extractScoringSignals(raw, NOW);
    expect(result.financeHistory).toEqual([
      { year: 2023, revenue: 400, growthRate: 0.1 },
      { year: 2022, revenue: 300, growthRate: null },
      { year: 2021, revenue: 200, growthRate: null },
    ]);
  });

  it("ignores finance entries without a numeric annee", () => {
    const raw = { finances: [{ chiffre_affaires: 100 }, { annee: 2023, chiffre_affaires: 400 }] };
    const result = extractScoringSignals(raw, NOW);
    expect(result.financeHistory).toHaveLength(1);
  });

  it("returns an empty finance history when finances is missing", () => {
    expect(extractScoringSignals({}, NOW).financeHistory).toEqual([]);
  });

  it("never throws on completely unexpected input", () => {
    expect(() => extractScoringSignals(null, NOW)).not.toThrow();
    expect(() => extractScoringSignals("garbage", NOW)).not.toThrow();
    expect(() => extractScoringSignals(42, NOW)).not.toThrow();
  });
});
