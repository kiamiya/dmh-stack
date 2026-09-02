import type { TaskStatus } from "@dmh/types";
import type { badgeVariants } from "../components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const LABELS: Record<TaskStatus, string> = {
  to_do: "À faire",
  in_progress: "En cours",
  done: "Terminée",
};

const COLORS: Record<TaskStatus, BadgeVariant> = {
  to_do: "default",
  in_progress: "blue",
  done: "green",
};

export function getTaskStatusLabel(status: TaskStatus): string {
  return LABELS[status];
}

export function getTaskStatusColor(status: TaskStatus): BadgeVariant {
  return COLORS[status];
}

export const ALL_TASK_STATUSES: TaskStatus[] = ["to_do", "in_progress", "done"];
