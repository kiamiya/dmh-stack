import { describe, expect, it } from "vitest";
import { computeConversionRate, computePipelineValueByStatus, computeWeightedPipelineValue } from "./opportunityStats";

const deals = [
  { status: "negotiation" as const, deal_value: 1000 },
  { status: "negotiation" as const, deal_value: 2000 },
  { status: "won" as const, deal_value: 5000 },
  { status: "lost" as const, deal_value: 3000 },
];

describe("computePipelineValueByStatus", () => {
  it("regroupe compte et valeur cumulée par statut, y compris à 0", () => {
    const rows = computePipelineValueByStatus(deals);
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.status === "negotiation")).toMatchObject({ count: 2, totalValue: 3000 });
    expect(rows.find((r) => r.status === "won")).toMatchObject({ count: 1, totalValue: 5000 });
    expect(rows.find((r) => r.status === "lost")).toMatchObject({ count: 1, totalValue: 3000 });
  });

  it("retourne des lignes à 0 pour un statut sans opportunité", () => {
    const rows = computePipelineValueByStatus([]);
    expect(rows.every((r) => r.count === 0 && r.totalValue === 0)).toBe(true);
  });
});

describe("computeConversionRate", () => {
  it("calcule le pourcentage de gagnées parmi les closes uniquement", () => {
    expect(computeConversionRate(deals)).toBe(50); // 1 won / (1 won + 1 lost)
  });

  it("retourne 0 si aucune opportunité n'est close", () => {
    expect(computeConversionRate([{ status: "negotiation" }])).toBe(0);
  });

  it("retourne 0 sur une liste vide", () => {
    expect(computeConversionRate([])).toBe(0);
  });

  it("retourne 100 si tout est gagné", () => {
    expect(computeConversionRate([{ status: "won" }, { status: "won" }])).toBe(100);
  });
});

describe("computeWeightedPipelineValue", () => {
  it("pondère uniquement les opportunités en négociation par leur probabilité", () => {
    const value = computeWeightedPipelineValue([
      { status: "negotiation", deal_value: 10000, probability: 50 },
      { status: "negotiation", deal_value: 4000, probability: 25 },
      { status: "won", deal_value: 5000, probability: 100 },
    ]);
    expect(value).toBe(6000); // 10000*0.5 + 4000*0.25 ; le "won" n'est pas compté
  });

  it("compte 0 pour une opportunité sans probabilité renseignée", () => {
    expect(computeWeightedPipelineValue([{ status: "negotiation", deal_value: 10000, probability: null }])).toBe(0);
  });

  it("retourne 0 sur une liste vide", () => {
    expect(computeWeightedPipelineValue([])).toBe(0);
  });
});
