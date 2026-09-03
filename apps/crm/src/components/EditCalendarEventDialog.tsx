import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "../lib/datetimeLocal";
import { useToast } from "./ui/toast";
import type { CalendarEventUpdate, UpcomingCalendarEvent } from "../services/calendarEvents";

export interface EditCalendarEventDialogProps {
  event: UpcomingCalendarEvent | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: (provider: "google" | "microsoft", eventId: string, patch: CalendarEventUpdate) => Promise<void>;
}

export function EditCalendarEventDialog({ event, onOpenChange, onUpdated }: EditCalendarEventDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setStart(toDatetimeLocalValue(event.start));
    setEnd(toDatetimeLocalValue(event.end));
    setError(null);
  }, [event]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!event) return;
    if (!title.trim()) {
      setError("Le titre est requis.");
      return;
    }
    const startIso = fromDatetimeLocalValue(start);
    const endIso = fromDatetimeLocalValue(end);
    if (endIso <= startIso) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onUpdated(event.provider, event.id, { title: title.trim(), startIso, endIso });
      toast("Événement mis à jour.", "success");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!event} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Modifier l'événement</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-event-title">
              Titre
            </label>
            <input
              id="edit-event-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-event-start">
                Début
              </label>
              <input
                id="edit-event-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-event-end">
                Fin
              </label>
              <input
                id="edit-event-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
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
