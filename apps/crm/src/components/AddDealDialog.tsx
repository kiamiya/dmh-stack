import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabase";
import { useClients } from "../hooks/useClients";
import { listCompaniesForClient } from "../services/companies";
import type { CompanyOption } from "../services/companies";
import { listContactsForCompany } from "../services/contactCompanies";
import type { ContactRelationRow } from "../services/contactCompanies";
import { validateDealForm } from "../lib/dealForm";
import { useToast } from "./ui/toast";
import { usePipelineStages } from "../hooks/usePipelineStages";
import { SearchableSelect } from "./ui/searchable-select";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { useSession } from "../lib/useSession";
import { createTask } from "../services/tasks";

export interface AddDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (input: {
    clientId: string;
    companyName: string;
    name?: string | null;
    dealValue: number;
    companyId?: string | null;
    contactId?: string | null;
    signedAt?: string | null;
    pipelineId?: string | null;
    stageId?: string | null;
    assignedTo?: string | null;
  }) => Promise<{ id: string }>;
}

export function AddDealDialog({ open, onOpenChange, onCreated }: AddDealDialogProps) {
  const clients = useClients();
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [contacts, setContacts] = useState<ContactRelationRow[]>([]);
  const [contactId, setContactId] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [signedAt, setSignedAt] = useState("");
  const [stageId, setStageId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDueDate, setFollowUpDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { pipeline, stages } = usePipelineStages(clientId);
  const staff = useStaffMembers();
  const { session } = useSession();
  // `tasks.created_by` référence staff_members : un compte client (non-staff) casserait la contrainte FK si on y mettait son propre uid tel quel (même pattern que AddTaskDialog.tsx).
  const createdBy = session?.user.id && staff.some((s) => s.id === session.user.id) ? session.user.id : null;

  useEffect(() => {
    const firstOpenStage = stages.find((s) => !s.is_won && !s.is_lost) ?? stages[0];
    setStageId(firstOpenStage?.id ?? "");
  }, [stages]);

  useEffect(() => {
    if (!clientId) {
      setCompanies([]);
      setCompanyId("");
      return;
    }
    listCompaniesForClient(supabase, clientId)
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, [clientId]);

  useEffect(() => {
    if (!companyId) {
      setContacts([]);
      setContactId("");
      return;
    }
    listContactsForCompany(supabase, companyId)
      .then(setContacts)
      .catch(() => setContacts([]));
  }, [companyId]);

  function reset() {
    setClientId("");
    setName("");
    setCompanies([]);
    setCompanyId("");
    setContacts([]);
    setContactId("");
    setDealValue("");
    setSignedAt("");
    setStageId("");
    setAssignedTo("");
    setScheduleFollowUp(false);
    setFollowUpDueDate("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const companyName = companies.find((c) => c.id === companyId)?.name ?? "";
    const validationError = validateDealForm({ companyName, dealValue, signedAt });
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
      const deal = await onCreated({
        clientId,
        companyName,
        name: name.trim() || null,
        dealValue: Number(dealValue),
        companyId: companyId || null,
        contactId: contactId || null,
        signedAt: signedAt || null,
        pipelineId: pipeline?.id ?? null,
        stageId: stageId || null,
        assignedTo: assignedTo || null,
      });

      if (scheduleFollowUp && followUpDueDate) {
        await createTask(supabase, {
          clientId,
          title: `Relance — ${name.trim() || companyName}`,
          dueDate: followUpDueDate,
          contactId: contactId || null,
          companyId: companyId || null,
          dealId: deal.id,
          createdBy,
        });
      }

      toast(`Opportunité "${name.trim() || companyName}" créée.`, "success");
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
          <DialogTitle>Ajouter une opportunité</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="deal-client">
              Client DMH
            </label>
            <select
              id="deal-client"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setCompanyId("");
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
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="deal-name">
              Nom de l'opportunité (optionnel)
            </label>
            <input
              id="deal-name"
              placeholder="ex. Renouvellement 2027, Upsell ligne 2…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="deal-company">
              Entreprise
            </label>
            <SearchableSelect
              value={companyId}
              onChange={setCompanyId}
              disabled={!clientId}
              placeholder={clientId ? "Sélectionner…" : "Choisir un client d'abord"}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="deal-contact">
              Contact (optionnel)
            </label>
            <SearchableSelect
              value={contactId}
              onChange={setContactId}
              disabled={!companyId}
              placeholder="Aucun"
              options={contacts.map((rel) => ({
                value: rel.contact_id,
                label: rel.contacts ? `${rel.contacts.first_name} ${rel.contacts.last_name}` : rel.contact_id,
              }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="deal-stage">
              Étape
            </label>
            <select
              id="deal-stage"
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              disabled={!clientId || stages.length === 0}
              className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:opacity-60"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="deal-assigned">
              Commercial (optionnel)
            </label>
            <select
              id="deal-assigned"
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="deal-value">
                Montant (€)
              </label>
              <input
                id="deal-value"
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="deal-signed-at">
                Date de signature (optionnel)
              </label>
              <input
                id="deal-signed-at"
                type="date"
                value={signedAt}
                onChange={(e) => setSignedAt(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="space-y-2 rounded-md border border-border p-3">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={scheduleFollowUp}
                onChange={(e) => setScheduleFollowUp(e.target.checked)}
              />
              Planifier une tâche de relance manuelle
            </label>
            {scheduleFollowUp && (
              <div>
                <label className="mb-1 block text-sm text-muted-foreground" htmlFor="deal-followup-date">
                  Échéance de la relance
                </label>
                <input
                  id="deal-followup-date"
                  type="date"
                  value={followUpDueDate}
                  onChange={(e) => setFollowUpDueDate(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "…" : "Ajouter l'opportunité"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
