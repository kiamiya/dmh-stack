import { describe, expect, it } from "vitest";
import { buildMonthGrid } from "./monthGrid";

describe("buildMonthGrid", () => {
  it("retourne 6 semaines de 7 jours", () => {
    const grid = buildMonthGrid(2026, 8); // septembre 2026
    expect(grid).toHaveLength(6);
    grid.forEach((week) => expect(week).toHaveLength(7));
  });

  it("commence la semaine un lundi", () => {
    // septembre 2026 commence un mardi -> le lundi précédent est le 31 août
    const grid = buildMonthGrid(2026, 8);
    expect(grid[0][0].date).toBe("2026-08-31");
    expect(grid[0][1].date).toBe("2026-09-01");
  });

  it("marque correctement inCurrentMonth pour les jours de bordure", () => {
    const grid = buildMonthGrid(2026, 8);
    expect(grid[0][0].inCurrentMonth).toBe(false); // 31 août
    expect(grid[0][1].inCurrentMonth).toBe(true); // 1er septembre
  });

  it("marque isToday pour la date fournie", () => {
    const grid = buildMonthGrid(2026, 8, new Date(2026, 8, 15));
    const flat = grid.flat();
    const today = flat.find((d) => d.isToday);
    expect(today?.date).toBe("2026-09-15");
  });

  it("gère un mois commençant un lundi sans jour de bordure avant", () => {
    // juin 2026 commence un lundi
    const grid = buildMonthGrid(2026, 5);
    expect(grid[0][0].date).toBe("2026-06-01");
    expect(grid[0][0].inCurrentMonth).toBe(true);
  });
});
