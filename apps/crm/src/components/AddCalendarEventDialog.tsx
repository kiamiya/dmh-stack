import { useState } from "react";
import type { FormEvent } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useClients } from "../hooks/useClients";
import { useContacts } from "../hooks/useContacts";
import { useCompanies } from "../hooks/useCompanies";
import { useOpportunities } from "../hooks/useOpportunities";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "../lib/datetimeLocal";
import { useToast } from "./ui/toast";
import type { NewCalendarEventInput } from "../hooks/useUpcomingCalendarEvents";
import type { CalendarConnection } from "../services/calendarConnections";

export interface AddCalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connections: CalendarConnection[];
  onCreated: (provider: "google" | "microsoft", input: NewCalendarEventInput) => Promise<void>;
}

const nowLocal = () => toDatetimeLocalValue(new Date().toISOString());

export function AddCalendarEventDialog({ open, onOpenChange, connections, onCreated }: AddCalendarEventDialogProps) {
  const clients = useClients();
  const { contacts } = useContacts();
  const { companies } = useCompanies();
  const { deals } = useOpportunities();
  const { toast } = useToast();

  const [provider, setProvider] = useState<"google" | "microsoft" | "">(connections[0]?.provider ?? "");
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(nowLocal);
  const [end, setEnd] = useState(nowLocal);
  const [contactId, setContactId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [dealId, setDealId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredContacts = contacts.filter((c) => !clientId || c.client_id === clientId);
  const filteredCompanies = companies.filter((c) => !clientId || c.client_id === clientId);
  const filteredDeals = deals.filter((d) => !clientId || d.client_id === clientId);

  function reset() {
    setProvider(connections[0]?.provider ?? "");
    setClientId("");
    setTitle("");
    setStart(nowLocal());
    setEnd(nowLocal());
    setContactId("");
    setCompanyId("");
    setDealId("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!provider) {
      setError("Choisis un calendrier connecté.");
      return;
    }
    if (!clientId) {
      setError("Le client DMH est requis.");
      return;
    }
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
      await onCreated(provider, {
        title: title.trim(),
        startIso,
        endIso,
        clientId,
        contactId: contactId || null,
        companyId: companyId || null,
        dealId: dealId || null,
      });
      toast(`Événement "${title.trim()}" créé.`, "success");
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
          <DialogTitle>Ajouter un événement</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="event-provider">
              Calendrier
            </label>
            <select
              id="event-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as "google" | "microsoft")}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Sélectionner…</option>
              {connections.map((c) => (
                <option key={c.provider} value={c.provider}>
                  {c.provider === "google" ? "Google Calendar" : "Microsoft / Outlook"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="event-client">
              Client DMH
            </label>
            <select
              id="event-client"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setContactId("");
                setCompanyId("");
                setDealId("");
              }}
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
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="event-title">
              Titre
            </label>
            <input
              id="event-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="event-start">
                Début
              </label>
              <input
                id="event-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="event-end">
                Fin
              </label>
              <input
                id="event-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="event-contact">
              Contact lié (optionnel)
            </label>
            <select
              id="event-contact"
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
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="event-company">
              Entreprise liée (optionnel)
            </label>
            <select
              id="event-company"
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
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="event-deal">
              Opportunité liée (optionnel)
            </label>
            <select
              id="event-deal"
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
          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "…" : "Créer l'événement"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
