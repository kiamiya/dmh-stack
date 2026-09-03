import { describe, expect, it } from "vitest";
import { groupTasksByDueDate } from "./taskCalendar";
import type { TaskRow } from "../services/tasks";

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
