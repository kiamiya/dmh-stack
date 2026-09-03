import type { TaskRow } from "../services/tasks";

export type { CalendarDay } from "./monthGrid";
export { buildMonthGrid } from "./monthGrid";

/** Pure : regroupe les tâches par date d'échéance ("YYYY-MM-DD") — ignore les tâches sans échéance. */
export function groupTasksByDueDate(tasks: TaskRow[]): Record<string, TaskRow[]> {
  const groups: Record<string, TaskRow[]> = {};
  for (const task of tasks) {
    if (!task.due_date) continue;
    const key = task.due_date.slice(0, 10);
    (groups[key] ??= []).push(task);
  }
  return groups;
}
