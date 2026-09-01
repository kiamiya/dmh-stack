import { describe, expect, it } from "vitest";
import {
  FUNNEL_STAGES,
  computeFunnelFromHistory,
  computeStatusCounts,
  computeWeeklyCounts,
  topProspectsByScore,
} from "./dashboardStats";

describe("computeStatusCounts", () => {
  it("retourne les 12 statuts, y compris ceux à 0", () => {
    const result = computeStatusCounts([{ status: "ready" }, { status: "ready" }, { status: "won" }]);
    expect(result).toHaveLength(12);
    expect(result.find((r) => r.status === "ready")!.count).toBe(2);
    expect(result.find((r) => r.status === "won")!.count).toBe(1);
    expect(result.find((r) => r.status === "lost")!.count).toBe(0);
  });
});

describe("computeFunnelFromHistory", () => {
  it("compte les prospects distincts ayant atteint chaque étape, pas seulement le statut courant", () => {
    // p1 : to_enrich -> ready -> qualified (a bien "atteint" ready, même s'il n'y est plus)
    // p2 : to_enrich -> ready
    // p3 : to_enrich
    const history = [
      { prospect_id: "p1", new_status: "to_enrich" as const },
      { prospect_id: "p1", new_status: "ready" as const },
      { prospect_id: "p1", new_status: "qualified" as const },
      { prospect_id: "p2", new_status: "to_enrich" as const },
      { prospect_id: "p2", new_status: "ready" as const },
      { prospect_id: "p3", new_status: "to_enrich" as const },
    ];
    const result = computeFunnelFromHistory(history, ["to_enrich", "ready", "qualified"]);
    expect(result.map((r) => r.reached)).toEqual([3, 2, 1]);
  });

  it("la première étape n'a pas de taux de conversion", () => {
    const result = computeFunnelFromHistory([{ prospect_id: "p1", new_status: "to_enrich" }], ["to_enrich"]);
    expect(result[0]!.conversionRate).toBeNull();
  });

  it("calcule le taux de conversion en %, arrondi à 1 décimale", () => {
    const history = [
      { prospect_id: "p1", new_status: "to_enrich" as const },
      { prospect_id: "p2", new_status: "to_enrich" as const },
      { prospect_id: "p3", new_status: "to_enrich" as const },
      { prospect_id: "p1", new_status: "ready" as const },
    ];
    const result = computeFunnelFromHistory(history, ["to_enrich", "ready"]);
    expect(result[1]!.conversionRate).toBeCloseTo(33.3, 1);
  });

  it("ne divise pas par zéro si une étape précédente est vide", () => {
    const result = computeFunnelFromHistory([], ["to_enrich", "ready"]);
    expect(result[1]!.conversionRate).toBeNull();
  });

  it("FUNNEL_STAGES exclut lost/not_interested", () => {
    expect(FUNNEL_STAGES).not.toContain("lost");
    expect(FUNNEL_STAGES).not.toContain("not_interested");
  });
});

describe("topProspectsByScore", () => {
  const make = (id: string, score: number | null) => ({ id, companies: { name: `Entreprise ${id}`, ai_score: score } });

  it("trie par score décroissant et limite à N", () => {
    const prospects = [make("a", 3), make("b", 9), make("c", 5)];
    const result = topProspectsByScore(prospects, 2);
    expect(result.map((r) => r.id)).toEqual(["b", "c"]);
  });

  it("ignore les prospects sans score", () => {
    const prospects = [make("a", null), make("b", 7)];
    expect(topProspectsByScore(prospects)).toHaveLength(1);
  });
});

describe("computeWeeklyCounts", () => {
  const NOW = new Date("2026-08-26T12:00:00Z"); // mercredi

  it("retourne le nombre de semaines demandé, dans l'ordre chronologique", () => {
    const result = computeWeeklyCounts([], 4, NOW);
    expect(result).toHaveLength(4);
    expect(new Date(result[0]!.weekStart).getTime()).toBeLessThan(new Date(result[3]!.weekStart).getTime());
  });

  it("regroupe correctement les dates dans leur semaine (lundi-dimanche)", () => {
    // 2026-08-24 est un lundi, 2026-08-26 un mercredi de la même semaine
    const result = computeWeeklyCounts(["2026-08-24T09:00:00Z", "2026-08-26T09:00:00Z"], 2, NOW);
    const lastWeek = result[result.length - 1]!;
    expect(lastWeek.weekStart).toBe("2026-08-24");
    expect(lastWeek.count).toBe(2);
  });

  it("ignore les dates en dehors de la fenêtre demandée", () => {
    const result = computeWeeklyCounts(["2020-01-01T00:00:00Z"], 2, NOW);
    expect(result.reduce((sum, b) => sum + b.count, 0)).toBe(0);
  });
});
