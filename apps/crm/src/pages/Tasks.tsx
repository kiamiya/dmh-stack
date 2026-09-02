import { useState } from "react";
import { useTasks } from "../hooks/useTasks";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { AddTaskDialog } from "../components/AddTaskDialog";
import { ALL_TASK_STATUSES, getTaskStatusColor, getTaskStatusLabel } from "../lib/taskStatus";
import type { TaskRow } from "../services/tasks";
import type { TaskStatus } from "@dmh/types";
import { useToast } from "../components/ui/toast";

function relatedRecordLabel(task: TaskRow): string {
  if (task.contacts) return `${task.contacts.first_name} ${task.contacts.last_name}`;
  if (task.companies) return task.companies.name;
  if (task.deals) return task.deals.company_name;
  return "—";
}

export function TasksPage() {
  const { tasks, loading, error, create, changeStatus } = useTasks();
  const staff = useStaffMembers();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  async function handleStatusChange(id: string, status: TaskStatus) {
    try {
      await changeStatus(id, status);
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-3 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Tâches</h1>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          + Tâche
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!loading && !error && (
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
                <TableCell className="font-medium text-foreground">{t.title}</TableCell>
                <TableCell>{t.due_date ? new Date(t.due_date).toLocaleDateString("fr-FR") : "—"}</TableCell>
                <TableCell>{staff.find((s) => s.id === t.assigned_to)?.name ?? "—"}</TableCell>
                <TableCell>{relatedRecordLabel(t)}</TableCell>
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
    </div>
  );
}
