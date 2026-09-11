import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTasks } from "../hooks/useTasks";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { AddTaskDialog } from "../components/AddTaskDialog";
import { EditTaskDialog } from "../components/EditTaskDialog";
import { TaskCalendarView } from "../components/TaskCalendarView";
import { TaskFocusMode } from "../components/TaskFocusMode";
import { PageHeader } from "../components/ui/page-header";
import { ALL_TASK_STATUSES, getTaskStatusColor, getTaskStatusLabel } from "../lib/taskStatus";
import { taskRelatedLink } from "../lib/taskLinks";
import type { TaskRow } from "../services/tasks";
import type { TaskStatus } from "@dmh/types";
import { useToast } from "../components/ui/toast";

export function TasksPage() {
  const { tasks, loading, error, create, changeStatus, update } = useTasks();
  const staff = useStaffMembers();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [focusOpen, setFocusOpen] = useState(false);

  /** File "à dépiler" (CR du 11/09/2026) : tâches non terminées, échéance la plus proche d'abord (celles sans échéance en dernier). */
  const focusQueue = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "done")
        .sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        }),
    [tasks],
  );

  async function handleStatusChange(id: string, status: TaskStatus) {
    try {
      await changeStatus(id, status);
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

  return (
    <div className="space-y-3 p-6">
      <PageHeader
        kicker="Prospection · suivi des relances"
        title="Tâches"
        actions={
          <>
            <div className="flex rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`rounded px-2 py-1 text-xs font-medium ${view === "list" ? "bg-secondary" : "text-muted-foreground"}`}
              >
                Liste
              </button>
              <button
                type="button"
                onClick={() => setView("calendar")}
                className={`rounded px-2 py-1 text-xs font-medium ${view === "calendar" ? "bg-secondary" : "text-muted-foreground"}`}
              >
                Calendrier
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setFocusOpen(true)} disabled={focusQueue.length === 0}>
              Dépiler ({focusQueue.length})
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              + Tâche
            </Button>
          </>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!loading && !error && view === "calendar" && (
        <TaskCalendarView tasks={tasks} onSelectTask={setEditingTask} />
      )}

      {!loading && !error && view === "list" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Assigné à</TableHead>
              <TableHead>Lié à</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium text-foreground">
                  <button type="button" onClick={() => setEditingTask(t)} className="hover:underline">
                    {t.title}
                  </button>
                </TableCell>
                <TableCell>{t.due_date ? new Date(t.due_date).toLocaleDateString("fr-FR") : "—"}</TableCell>
                <TableCell>{staff.find((s) => s.id === t.assigned_to)?.name ?? "—"}</TableCell>
                <TableCell>
                  {(() => {
                    const link = taskRelatedLink(t);
                    return link ? (
                      <Link to={link.to} className="hover:underline">
                        {link.label}
                      </Link>
                    ) : (
                      "—"
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}
                    className="rounded-md border border-border px-2 py-1 text-sm"
                  >
                    {ALL_TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {getTaskStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                  <Badge variant={getTaskStatusColor(t.status)} className="ml-2">
                    {getTaskStatusLabel(t.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucune tâche.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <AddTaskDialog open={addOpen} onOpenChange={setAddOpen} onCreated={create} />
      <EditTaskDialog
        task={editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        onUpdated={update}
      />
      <TaskFocusMode
        open={focusOpen}
        onOpenChange={setFocusOpen}
        tasks={focusQueue}
        onComplete={(id) => changeStatus(id, "done")}
        onReschedule={(id, dueDate) => update(id, { dueDate })}
      />
    </div>
  );
}
