import type { TaskType } from "@dmh/types";
import type { TaskRow } from "../services/tasks";

export type TaskPreset = "all" | "todo" | "overdue" | "today" | "mine" | "done";

export interface TaskFilters {
  preset: TaskPreset;
  types: TaskType[];
  highPriority: boolean;
  automationOnly: boolean;
}

export const EMPTY_TASK_FILTERS: TaskFilters = { preset: "all", types: [], highPriority: false, automationOnly: false };

function isToday(isoDate: string, now: Date): boolean {
  return isoDate === now.toISOString().slice(0, 10);
}

function isOverdue(task: TaskRow, now: Date): boolean {
  return task.due_date !== null && task.status !== "done" && new Date(task.due_date) < now;
}

/**
 * Pure : onglets système du mockup Claude Design (À faire/En retard/
 * Aujourd'hui/Mes tâches/Terminées) + filtres rapides (type/priorité/
 * origine) — combinés en ET logique, comme `filterProspects`.
 */
export function matchesTaskFilters(task: TaskRow, filters: TaskFilters, currentStaffId: string | null, now: Date = new Date()): boolean {
  if (filters.preset === "todo" && task.status === "done") return false;
  if (filters.preset === "overdue" && !isOverdue(task, now)) return false;
  if (filters.preset === "today" && !(task.due_date !== null && isToday(task.due_date, now))) return false;
  if (filters.preset === "mine" && task.assigned_to !== currentStaffId) return false;
  if (filters.preset === "done" && task.status !== "done") return false;

  if (filters.types.length > 0 && (!task.task_type || !filters.types.includes(task.task_type))) return false;
  if (filters.highPriority && task.priority !== "high") return false;
  if (filters.automationOnly && task.origin !== "automation") return false;

  return true;
}

export function filterTasks(tasks: TaskRow[], filters: TaskFilters, currentStaffId: string | null, now: Date = new Date()): TaskRow[] {
  return tasks.filter((t) => matchesTaskFilters(t, filters, currentStaffId, now));
}
