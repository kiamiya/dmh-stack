import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/useSession";
import { useClients } from "../hooks/useClients";
import { useContacts } from "../hooks/useContacts";
import { useCompanies } from "../hooks/useCompanies";
import { useOpportunities } from "../hooks/useOpportunities";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "../lib/datetimeLocal";
import { getMeetingLink, upsertMeetingLink } from "../services/meetings";
import { useToast } from "./ui/toast";
import type { CalendarEventUpdate, UpcomingCalendarEvent } from "../services/calendarEvents";

export interface EditCalendarEventDialogProps {
  event: UpcomingCalendarEvent | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: (provider: "google" | "microsoft", eventId: string, patch: CalendarEventUpdate) => Promise<void>;
}

export function EditCalendarEventDialog({ event, onOpenChange, onUpdated }: EditCalendarEventDialogProps) {
  const { session } = useSession();
  const clients = useClients();
  const { contacts } = useContacts();
  const { companies } = useCompanies();
  const { deals } = useOpportunities();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [clientId, setClientId] = useState("");
  const [contactId, setContactId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [dealId, setDealId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredContacts = contacts.filter((c) => !clientId || c.client_id === clientId);
  const filteredCompanies = companies.filter((c) => !clientId || c.client_id === clientId);
  const filteredDeals = deals.filter((d) => !clientId || d.client_id === clientId);

  useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setStart(toDatetimeLocalValue(event.start));
    setEnd(toDatetimeLocalValue(event.end));
    setClientId("");
    setContactId("");
    setCompanyId("");
    setDealId("");
    setError(null);

    getMeetingLink(supabase, event.provider, event.id)
      .then((link) => {
        if (!link) return;
        setClientId(link.client_id);
        setContactId(link.contact_id ?? "");
        setCompanyId(link.company_id ?? "");
        setDealId(link.deal_id ?? "");
      })
      .catch(() => {
        // Pas de lien existant ou erreur de lecture — le formulaire reste vide, pas bloquant pour l'édition titre/horaires.
      });
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
    const staffId = session?.user.id;
    if (clientId && !staffId) {
      setError("Session invalide.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onUpdated(event.provider, event.id, { title: title.trim(), startIso, endIso });
      if (clientId && staffId) {
        await upsertMeetingLink(supabase, {
          clientId,
          staffId,
          title: title.trim(),
          startsAt: startIso,
          endsAt: endIso,
          provider: event.provider,
          externalEventId: event.id,
          contactId: contactId || null,
          companyId: companyId || null,
          dealId: dealId || null,
        });
      }
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

          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-sm font-medium text-foreground">Lier à</p>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-event-client">
                Client DMH
              </label>
              <select
                id="edit-event-client"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setContactId("");
                  setCompanyId("");
                  setDealId("");
                }}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              >
                <option value="">Aucun (ne pas lier)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-event-contact">
                Contact (optionnel)
              </label>
              <select
                id="edit-event-contact"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                disabled={!clientId}
                className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="">Aucun</option>
                {filteredContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-event-company">
                Entreprise (optionnel)
              </label>
              <select
                id="edit-event-company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={!clientId}
                className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="">Aucune</option>
                {filteredCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="edit-event-deal">
                Opportunité (optionnel)
              </label>
              <select
                id="edit-event-deal"
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                disabled={!clientId}
                className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="">Aucune</option>
                {filteredDeals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.company_name}
                  </option>
                ))}
              </select>
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
