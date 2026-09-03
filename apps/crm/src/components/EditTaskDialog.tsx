import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useContacts } from "../hooks/useContacts";
import { useCompanies } from "../hooks/useCompanies";
import { useOpportunities } from "../hooks/useOpportunities";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { validateTaskForm } from "../lib/taskForm";
import { ALL_TASK_STATUSES, getTaskStatusLabel } from "../lib/taskStatus";
import { useToast } from "./ui/toast";
import type { TaskRow, TaskUpdate } from "../services/tasks";
import type { TaskStatus } from "@dmh/types";

export interface EditTaskDialogProps {
  task: TaskRow | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: (id: string, patch: TaskUpdate) => Promise<void>;
}

export function EditTaskDialog({ task, onOpenChange, onUpdated }: EditTaskDialogProps) {
  const { contacts } = useContacts();
  const { companies } = useCompanies();
  const { deals } = useOpportunities();
  const staff = useStaffMembers();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [contactId, setContactId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [dealId, setDealId] = useState("");
  const [status, setStatus] = useState<TaskStatus>("to_do");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDueDate(task.due_date ? task.due_date.slice(0, 10) : "");
    setAssignedTo(task.assigned_to ?? "");
    setContactId(task.contact_id ?? "");
    setCompanyId(task.company_id ?? "");
    setDealId(task.deal_id ?? "");
    setStatus(task.status);
    setError(null);
  }, [task]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!task) return;
    const validationError = validateTaskForm({ title });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onUpdated(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate || null,
        assignedTo: assignedTo || null,
        contactId: contactId || null,
        companyId: companyId || null,
        dealId: dealId || null,
        status,
      });
      toast(`Tâche "${title.trim()}" mise à jour.`, "success");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!task} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Modifier la tâche</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-task-title">
              Titre
            </label>
            <input
              id="edit-task-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-task-description">
              Description (optionnel)
            </label>
            <textarea
              id="edit-task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-task-due-date">
                Échéance (optionnel)
              </label>
              <input
                id="edit-task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-task-assigned">
                Assigné à (optionnel)
              </label>
              <select
                id="edit-task-assigned"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              >
                <option value="">Non assigné</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-task-status">
              Statut
            </label>
            <select
              id="edit-task-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              {ALL_TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {getTaskStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-task-contact">
              Contact lié (optionnel)
            </label>
            <select
              id="edit-task-contact"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Aucun</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-task-company">
              Entreprise liée (optionnel)
            </label>
            <select
              id="edit-task-company"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Aucune</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-task-deal">
              Opportunité liée (optionnel)
            </label>
            <select
              id="edit-task-deal"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Aucune</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.company_name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
