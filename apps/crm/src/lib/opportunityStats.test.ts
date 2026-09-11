import { describe, expect, it } from "vitest";
import {
  computeAverageCycleDays,
  computeConversionRate,
  computeDealAgeDays,
  computeDealWeightedValue,
  computeNextActionForDeal,
  computePipelineValueByStatus,
  computeWeightedPipelineValue,
} from "./opportunityStats";

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

describe("computeDealWeightedValue", () => {
  it("pondère une opportunité en négociation par sa probabilité", () => {
    expect(computeDealWeightedValue({ status: "negotiation", deal_value: 10000, probability: 50 })).toBe(5000);
  });

  it("compte 0 sans probabilité renseignée", () => {
    expect(computeDealWeightedValue({ status: "negotiation", deal_value: 10000, probability: null })).toBe(0);
  });

  it("retourne null pour une opportunité déjà close", () => {
    expect(computeDealWeightedValue({ status: "won", deal_value: 10000, probability: 100 })).toBeNull();
    expect(computeDealWeightedValue({ status: "lost", deal_value: 10000, probability: 20 })).toBeNull();
  });
});

describe("computeDealAgeDays", () => {
  it("calcule le nombre de jours écoulés depuis la création", () => {
    const now = new Date("2026-09-10T00:00:00Z");
    expect(computeDealAgeDays({ created_at: "2026-09-01T00:00:00Z" }, now)).toBe(9);
  });
});

describe("computeAverageCycleDays", () => {
  it("calcule le cycle moyen en jours pour les opportunités gagnées uniquement", () => {
    const deals = [
      { status: "won" as const, created_at: "2026-08-01T00:00:00Z", signed_at: "2026-08-11T00:00:00Z" },
      { status: "won" as const, created_at: "2026-08-01T00:00:00Z", signed_at: "2026-08-21T00:00:00Z" },
      { status: "lost" as const, created_at: "2026-08-01T00:00:00Z", signed_at: null },
    ];
    expect(computeAverageCycleDays(deals)).toBe(15); // (10 + 20) / 2
  });

  it("retourne null sans opportunité gagnée", () => {
    expect(computeAverageCycleDays([{ status: "negotiation", created_at: "2026-08-01T00:00:00Z", signed_at: null }])).toBeNull();
  });
});

describe("computeNextActionForDeal", () => {
  const tasks = [
    { deal_id: "d1", title: "Relancer", due_date: "2026-09-15", status: "to_do" },
    { deal_id: "d1", title: "Envoyer devis", due_date: "2026-09-12", status: "to_do" },
    { deal_id: "d1", title: "Ancienne tâche", due_date: "2026-09-05", status: "done" },
    { deal_id: "d2", title: "Autre deal", due_date: "2026-09-01", status: "to_do" },
  ];

  it("retourne la tâche non terminée à l'échéance la plus proche", () => {
    expect(computeNextActionForDeal("d1", tasks)).toEqual({ title: "Envoyer devis", dueDate: "2026-09-12" });
  });

  it("retourne null sans tâche ouverte liée", () => {
    expect(computeNextActionForDeal("d3", tasks)).toBeNull();
  });
});
