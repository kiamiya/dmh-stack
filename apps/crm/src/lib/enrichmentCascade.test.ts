import { describe, expect, it } from "vitest";
import { ENRICHMENT_CASCADE, computeCascadeStepCounts } from "./enrichmentCascade";

const prospects = [
  { status: "to_enrich" as const },
  { status: "enriched_pappers" as const },
  { status: "enriched_pappers" as const },
  { status: "enriched_contact" as const },
  { status: "won" as const },
];

describe("computeCascadeStepCounts", () => {
  it("compte les prospects par statut d'étape réel", () => {
    const counts = computeCascadeStepCounts(prospects);
    expect(counts).toHaveLength(2);
    expect(counts.find((c) => c.provider === "Pappers")).toMatchObject({ status: "enriched_pappers", count: 2 });
    expect(counts.find((c) => c.provider === "Dropcontact")).toMatchObject({ status: "enriched_contact", count: 1 });
  });

  it("retourne 0 pour une étape sans prospect", () => {
    const counts = computeCascadeStepCounts([]);
    expect(counts.every((c) => c.count === 0)).toBe(true);
  });

  it("respecte l'ordre déclaré dans ENRICHMENT_CASCADE", () => {
    const counts = computeCascadeStepCounts(prospects);
    expect(counts.map((c) => c.order)).toEqual(ENRICHMENT_CASCADE.map((s) => s.order));
  });
});
