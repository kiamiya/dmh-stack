import { describe, expect, it } from "vitest";
import { DASHBOARD_BLOCKS, getDashboardBlockLabel } from "./dashboardBlocks";

describe("DASHBOARD_BLOCKS", () => {
  it("a des clés uniques et non vides", () => {
    const keys = DASHBOARD_BLOCKS.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((k) => k.length > 0)).toBe(true);
  });

  it("a un libellé et une catégorie pour chaque bloc", () => {
    expect(DASHBOARD_BLOCKS.every((b) => b.label.length > 0 && b.category.length > 0)).toBe(true);
  });
});

describe("getDashboardBlockLabel", () => {
  it("retourne le libellé du catalogue", () => {
    expect(getDashboardBlockLabel("funnel")).toBe("Funnel de conversion");
  });

  it("retourne la clé telle quelle si inconnue", () => {
    expect(getDashboardBlockLabel("inconnu")).toBe("inconnu");
  });
});
