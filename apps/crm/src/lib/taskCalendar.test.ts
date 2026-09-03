import { describe, expect, it } from "vitest";
import { buildMonthGrid, groupTasksByDueDate } from "./taskCalendar";
import type { TaskRow } from "../services/tasks";

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

describe("groupTasksByDueDate", () => {
  const base: TaskRow = {
    id: "1",
    title: "t",
    description: null,
    due_date: null,
    status: "to_do",
    assigned_to: null,
    contact_id: null,
    company_id: null,
    deal_id: null,
    contacts: null,
    companies: null,
    deals: null,
  };

  it("regroupe les tâches par jour", () => {
    const tasks: TaskRow[] = [
      { ...base, id: "1", due_date: "2026-09-15" },
      { ...base, id: "2", due_date: "2026-09-15" },
      { ...base, id: "3", due_date: "2026-09-16" },
    ];
    const groups = groupTasksByDueDate(tasks);
    expect(groups["2026-09-15"]).toHaveLength(2);
    expect(groups["2026-09-16"]).toHaveLength(1);
  });

  it("ignore les tâches sans échéance", () => {
    const tasks: TaskRow[] = [{ ...base, id: "1", due_date: null }];
    expect(groupTasksByDueDate(tasks)).toEqual({});
  });
});
