import { useState } from "react";
import type { FormEvent } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useClients } from "../hooks/useClients";
import { useContacts } from "../hooks/useContacts";
import { useCompanies } from "../hooks/useCompanies";
import { useOpportunities } from "../hooks/useOpportunities";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { useSession } from "../lib/useSession";
import { validateTaskForm } from "../lib/taskForm";
import { useToast } from "./ui/toast";
import type { TaskInsert } from "../services/tasks";

export interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (input: TaskInsert) => Promise<void>;
}

export function AddTaskDialog({ open, onOpenChange, onCreated }: AddTaskDialogProps) {
  const clients = useClients();
  const { contacts } = useContacts();
  const { companies } = useCompanies();
  const { deals } = useOpportunities();
  const staff = useStaffMembers();
  const { session } = useSession();
  const { toast } = useToast();

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [contactId, setContactId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [dealId, setDealId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setClientId("");
    setTitle("");
    setDescription("");
    setDueDate("");
    setAssignedTo("");
    setContactId("");
    setCompanyId("");
    setDealId("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validateTaskForm({ title });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!clientId) {
      setError("Le client DMH est requis.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onCreated({
        clientId,
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate || null,
        assignedTo: assignedTo || null,
        contactId: contactId || null,
        companyId: companyId || null,
        dealId: dealId || null,
        // `tasks.created_by` référence staff_members : un compte client (non-staff,
        // autorisé par RLS `client_user_access` à créer une tâche) casserait la
        // contrainte FK si on y mettait son propre uid tel quel.
        createdBy: session?.user.id && staff.some((s) => s.id === session.user.id) ? session.user.id : null,
      });
      toast(`Tâche "${title.trim()}" ajoutée.`, "success");
      reset();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Ajouter une tâche</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="task-client">
              Client DMH
            </label>
            <select
              id="task-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Sélectionner…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="task-title">
              Titre
            </label>
            <input
              id="task-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="task-description">
              Description (optionnel)
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="task-due-date">
                Échéance (optionnel)
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="task-assigned">
                Assigné à (optionnel)
              </label>
              <select
                id="task-assigned"
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
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="task-contact">
              Contact lié (optionnel)
            </label>
            <select
              id="task-contact"
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
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="task-company">
              Entreprise liée (optionnel)
            </label>
            <select
              id="task-company"
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
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="task-deal">
              Opportunité liée (optionnel)
            </label>
            <select
              id="task-deal"
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
            {submitting ? "…" : "Ajouter la tâche"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
