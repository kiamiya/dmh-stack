import type { TaskStatus } from "@dmh/types";
import { getTaskStatusColor, getTaskStatusLabel } from "./taskStatus";
import type { StatusCount } from "./dashboardStats";

const ALL_TASK_STATUSES: TaskStatus[] = ["to_do", "in_progress", "done"];

/** Pure : nombre de tâches par statut (les 3, y compris à 0) — même shape que `StatusCount` (dashboardStats.ts) pour réutiliser `StatusBarList`. */
export function computeTaskCountsByStatus(tasks: Array<{ status: TaskStatus }>): StatusCount[] {
  return ALL_TASK_STATUSES.map((status) => ({
    status,
    label: getTaskStatusLabel(status),
    color: getTaskStatusColor(status),
    count: tasks.filter((t) => t.status === status).length,
  }));
}

/** Pure : tâches en retard — échéance passée et pas encore terminées. */
export function computeOverdueTasks<T extends { due_date: string | null; status: TaskStatus }>(
  tasks: T[],
  now: Date = new Date(),
): T[] {
  const todayStr = now.toISOString().slice(0, 10);
  return tasks.filter((t) => t.due_date !== null && t.due_date < todayStr && t.status !== "done");
}

/** Pure : tâches dont l'échéance est aujourd'hui et pas encore terminées — pour le rappel dans l'en-tête. */
export function computeTasksDueToday<T extends { due_date: string | null; status: TaskStatus }>(
  tasks: T[],
  now: Date = new Date(),
): T[] {
  const todayStr = now.toISOString().slice(0, 10);
  return tasks.filter((t) => t.due_date === todayStr && t.status !== "done");
}
