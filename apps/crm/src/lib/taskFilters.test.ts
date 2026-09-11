import { describe, expect, it } from "vitest";
import { EMPTY_TASK_FILTERS, filterTasks } from "./taskFilters";
import type { TaskRow } from "../services/tasks";

function baseTask(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: "t1",
    title: "Relancer",
    description: null,
    due_date: null,
    status: "to_do",
    assigned_to: null,
    contact_id: null,
    company_id: null,
    deal_id: null,
    task_type: null,
    priority: "normal",
    origin: "manual",
    contacts: null,
    companies: null,
    deals: null,
    ...overrides,
  };
}

const now = new Date("2026-09-11T12:00:00Z");

describe("filterTasks", () => {
  it("preset 'all' ne filtre rien", () => {
    const tasks = [baseTask({ id: "1" }), baseTask({ id: "2", status: "done" })];
    expect(filterTasks(tasks, EMPTY_TASK_FILTERS, null, now)).toHaveLength(2);
  });

  it("preset 'todo' exclut les tâches terminées", () => {
    const tasks = [baseTask({ id: "1", status: "to_do" }), baseTask({ id: "2", status: "done" })];
    expect(filterTasks(tasks, { ...EMPTY_TASK_FILTERS, preset: "todo" }, null, now).map((t) => t.id)).toEqual(["1"]);
  });

  it("preset 'overdue' : échéance passée, pas terminée", () => {
    const tasks = [
      baseTask({ id: "1", due_date: "2026-09-01", status: "to_do" }),
      baseTask({ id: "2", due_date: "2026-09-01", status: "done" }),
      baseTask({ id: "3", due_date: "2026-09-20", status: "to_do" }),
      baseTask({ id: "4", due_date: null, status: "to_do" }),
    ];
    expect(filterTasks(tasks, { ...EMPTY_TASK_FILTERS, preset: "overdue" }, null, now).map((t) => t.id)).toEqual(["1"]);
  });

  it("preset 'today' : échéance aujourd'hui", () => {
    const tasks = [baseTask({ id: "1", due_date: "2026-09-11" }), baseTask({ id: "2", due_date: "2026-09-12" })];
    expect(filterTasks(tasks, { ...EMPTY_TASK_FILTERS, preset: "today" }, null, now).map((t) => t.id)).toEqual(["1"]);
  });

  it("preset 'mine' : assignée au staff courant", () => {
    const tasks = [baseTask({ id: "1", assigned_to: "s1" }), baseTask({ id: "2", assigned_to: "s2" })];
    expect(filterTasks(tasks, { ...EMPTY_TASK_FILTERS, preset: "mine" }, "s1", now).map((t) => t.id)).toEqual(["1"]);
  });

  it("preset 'done' : uniquement terminées", () => {
    const tasks = [baseTask({ id: "1", status: "done" }), baseTask({ id: "2", status: "to_do" })];
    expect(filterTasks(tasks, { ...EMPTY_TASK_FILTERS, preset: "done" }, null, now).map((t) => t.id)).toEqual(["1"]);
  });

  it("filtre par type (OU entre plusieurs types sélectionnés)", () => {
    const tasks = [
      baseTask({ id: "1", task_type: "call" }),
      baseTask({ id: "2", task_type: "email" }),
      baseTask({ id: "3", task_type: "meeting" }),
    ];
    expect(filterTasks(tasks, { ...EMPTY_TASK_FILTERS, types: ["call", "email"] }, null, now).map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("filtre par priorité haute", () => {
    const tasks = [baseTask({ id: "1", priority: "high" }), baseTask({ id: "2", priority: "normal" })];
    expect(filterTasks(tasks, { ...EMPTY_TASK_FILTERS, highPriority: true }, null, now).map((t) => t.id)).toEqual(["1"]);
  });

  it("filtre par origine automatisation", () => {
    const tasks = [baseTask({ id: "1", origin: "automation" }), baseTask({ id: "2", origin: "manual" })];
    expect(filterTasks(tasks, { ...EMPTY_TASK_FILTERS, automationOnly: true }, null, now).map((t) => t.id)).toEqual(["1"]);
  });

  it("combine plusieurs critères (ET logique)", () => {
    const tasks = [
      baseTask({ id: "1", status: "to_do", priority: "high" }),
      baseTask({ id: "2", status: "to_do", priority: "normal" }),
      baseTask({ id: "3", status: "done", priority: "high" }),
    ];
    expect(filterTasks(tasks, { ...EMPTY_TASK_FILTERS, preset: "todo", highPriority: true }, null, now).map((t) => t.id)).toEqual(["1"]);
  });
});
