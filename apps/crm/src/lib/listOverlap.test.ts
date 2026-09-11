import { describe, expect, it } from "vitest";
import { computeListOverlap } from "./listOverlap";

describe("computeListOverlap", () => {
  it("calcule le chevauchement exact entre deux listes", () => {
    const result = computeListOverlap(["a", "b", "c"], ["b", "c", "d"]);
    expect(result).toEqual({
      totalA: 3,
      totalB: 3,
      overlapCount: 2,
      onlyInA: 1,
      onlyInB: 1,
      overlapPercentOfA: 67,
      overlapPercentOfB: 67,
    });
  });

  it("ignore les doublons au sein d'une même liste", () => {
    const result = computeListOverlap(["a", "a", "b"], ["b"]);
    expect(result.totalA).toBe(2);
    expect(result.overlapCount).toBe(1);
  });

  it("deux listes disjointes n'ont aucun chevauchement", () => {
    const result = computeListOverlap(["a", "b"], ["c", "d"]);
    expect(result.overlapCount).toBe(0);
    expect(result.overlapPercentOfA).toBe(0);
    expect(result.overlapPercentOfB).toBe(0);
  });

  it("une liste vide donne un pourcentage à 0, jamais NaN", () => {
    const result = computeListOverlap([], ["a"]);
    expect(result.overlapPercentOfA).toBe(0);
    expect(result.overlapPercentOfB).toBe(0);
  });

  it("deux listes identiques se chevauchent à 100%", () => {
    const result = computeListOverlap(["a", "b"], ["a", "b"]);
    expect(result.overlapPercentOfA).toBe(100);
    expect(result.overlapPercentOfB).toBe(100);
  });
});
