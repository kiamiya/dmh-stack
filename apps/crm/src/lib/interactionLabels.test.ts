import { describe, expect, it } from "vitest";
import { ALL_INTERACTION_TYPES, getInteractionTypeLabel } from "./interactionLabels";

describe("ALL_INTERACTION_TYPES", () => {
  it("contient les 13 types d'interaction, sans doublon", () => {
    expect(ALL_INTERACTION_TYPES).toHaveLength(13);
    expect(new Set(ALL_INTERACTION_TYPES).size).toBe(13);
  });

  it("chaque type a un libellé FR", () => {
    for (const type of ALL_INTERACTION_TYPES) {
      expect(getInteractionTypeLabel(type)).toBeTruthy();
    }
  });
});
