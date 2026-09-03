import { describe, expect, it } from "vitest";
import { computeOverdueTasks, computeTaskCountsByStatus, computeTasksDueToday } from "./taskStats";

describe("computeTaskCountsByStatus", () => {
  it("compte les tâches par statut, y compris à 0", () => {
    const tasks = [{ status: "to_do" as const }, { status: "to_do" as const }, { status: "done" as const }];
    const rows = computeTaskCountsByStatus(tasks);
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.status === "to_do")?.count).toBe(2);
    expect(rows.find((r) => r.status === "in_progress")?.count).toBe(0);
    expect(rows.find((r) => r.status === "done")?.count).toBe(1);
  });
});

describe("computeOverdueTasks", () => {
  const now = new Date("2026-09-03T12:00:00Z");

  it("retourne les tâches dont l'échéance est passée et non terminées", () => {
    const tasks = [
      { id: "1", due_date: "2026-09-01", status: "to_do" as const },
      { id: "2", due_date: "2026-09-10", status: "to_do" as const },
      { id: "3", due_date: "2026-09-01", status: "done" as const },
      { id: "4", due_date: null, status: "to_do" as const },
    ];
    const overdue = computeOverdueTasks(tasks, now);
    expect(overdue.map((t) => t.id)).toEqual(["1"]);
  });

  it("retourne un tableau vide si rien n'est en retard", () => {
    expect(computeOverdueTasks([{ due_date: null, status: "to_do" as const }], now)).toEqual([]);
  });
});

describe("computeTasksDueToday", () => {
  const now = new Date("2026-09-03T12:00:00Z");

  it("retourne les tâches dont l'échéance est aujourd'hui et non terminées", () => {
    const tasks = [
      { id: "1", due_date: "2026-09-03", status: "to_do" as const },
      { id: "2", due_date: "2026-09-01", status: "to_do" as const },
      { id: "3", due_date: "2026-09-03", status: "done" as const },
      { id: "4", due_date: null, status: "to_do" as const },
    ];
    expect(computeTasksDueToday(tasks, now).map((t) => t.id)).toEqual(["1"]);
  });

  it("retourne un tableau vide si rien n'est dû aujourd'hui", () => {
    expect(computeTasksDueToday([{ due_date: "2026-09-10", status: "to_do" as const }], now)).toEqual([]);
  });
});
