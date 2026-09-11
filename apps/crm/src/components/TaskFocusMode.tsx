import { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import type { TaskRow } from "../services/tasks";
import { taskRelatedLink } from "../lib/taskLinks";

export interface TaskFocusModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** File de tâches à dépiler (déjà filtrée/triée par l'appelant — ex. non terminées, par échéance). */
  tasks: TaskRow[];
  onComplete: (id: string) => Promise<void>;
  onReschedule: (id: string, dueDate: string) => Promise<void>;
}

/**
 * Dépiler les tâches une à une (inspiration HubSpot, CR du 11/09/2026) —
 * la fiche liée s'ouvre dans un nouvel onglet ("ouverture automatique de
 * la fiche contact liée") plutôt que de naviguer et interrompre la file
 * en cours ; "Terminer"/"Replanifier" avancent automatiquement à la
 * tâche suivante.
 */
export function TaskFocusMode({ open, onOpenChange, tasks, onComplete, onReschedule }: TaskFocusModeProps) {
  const [index, setIndex] = useState(0);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDueDate, setNewDueDate] = useState("");
  const [busy, setBusy] = useState(false);

  const task = tasks[index];
  const related = task ? taskRelatedLink(task) : null;

  function reset() {
    setIndex(0);
    setRescheduling(false);
    setNewDueDate("");
  }

  function goNext() {
    setRescheduling(false);
    setNewDueDate("");
    setIndex((i) => i + 1);
  }

  async function handleComplete() {
    if (!task) return;
    setBusy(true);
    try {
      await onComplete(task.id);
      goNext();
    } finally {
      setBusy(false);
    }
  }

  async function handleReschedule() {
    if (!task || !newDueDate) return;
    setBusy(true);
    try {
      await onReschedule(task.id, newDueDate);
      goNext();
    } finally {
      setBusy(false);
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
      <DialogHeader>
        <DialogTitle>
          Dépiler les tâches {tasks.length > 0 && `(${Math.min(index + 1, tasks.length)} / ${tasks.length})`}
        </DialogTitle>
      </DialogHeader>
      <DialogContent className="space-y-3">
        {!task ? (
          <p className="text-center text-sm text-muted-foreground">
            {tasks.length === 0 ? "Aucune tâche à traiter." : "File terminée — bravo !"}
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <span className="font-heading text-lg text-foreground">{task.title}</span>
              {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
              <p className="text-xs text-muted-foreground">
                Échéance : {task.due_date ? new Date(task.due_date).toLocaleDateString("fr-FR") : "—"}
              </p>
            </div>
            {related && (
              <Link
                to={related.to}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm text-accent underline"
              >
                Ouvrir la fiche {related.label} →
              </Link>
            )}
            {rescheduling && (
              <div className="flex items-end gap-2 border-t border-border pt-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Nouvelle échéance</label>
                  <input
                    type="date"
                    autoFocus
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="rounded-md border border-border px-2 py-1.5 text-sm"
                  />
                </div>
                <Button size="sm" disabled={!newDueDate || busy} onClick={handleReschedule}>
                  Valider
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Fermer
        </Button>
        {task && !rescheduling && (
          <>
            <Button variant="outline" onClick={goNext} disabled={busy}>
              Passer
            </Button>
            <Button variant="outline" onClick={() => setRescheduling(true)} disabled={busy}>
              Replanifier
            </Button>
            <Button onClick={handleComplete} disabled={busy}>
              {busy ? "…" : "Terminer"}
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}
