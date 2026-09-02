import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabase";
import { useClients } from "../hooks/useClients";
import { listCompaniesForClient } from "../services/companies";
import type { CompanyOption } from "../services/companies";
import { createContact } from "../services/contacts";
import { createProspect } from "../services/prospects";
import { validateContactForm } from "../lib/contactForm";
import { useToast } from "./ui/toast";
import { AddCompanyDialog } from "./AddCompanyDialog";

export interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé une fois le contact ET le prospect créés (statut `to_enrich`) — permet de rafraîchir la liste. */
  onCreated?: () => void;
}

/**
 * Crée un contact identifié manuellement (ex. sur LinkedIn) et le prospect
 * `to_enrich` associé en une seule action, pour qu'il entre directement dans
 * le pipeline d'enrichissement — même point d'entrée que l'import Pharow.
 * L'entreprise doit déjà exister pour le client choisi ; un raccourci "+
 * Nouvelle entreprise" permet de la créer sans quitter ce formulaire.
 */
export function AddContactDialog({ open, onOpenChange, onCreated }: AddContactDialogProps) {
  const clients = useClients();
  const [clientId, setClientId] = useState("");
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

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

  function reset() {
    setClientId("");
    setCompanies([]);
    setCompanyId("");
    setFirstName("");
    setLastName("");
    setJobTitle("");
    setEmail("");
    setLinkedinUrl("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validateContactForm({ clientId, companyId, firstName, lastName, email, linkedinUrl });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const contact = await createContact(supabase, {
        clientId,
        companyId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        jobTitle: jobTitle.trim() || null,
        email: email.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
      });
      await createProspect(supabase, { clientId, contactId: contact.id, companyId });

      toast(`${firstName.trim()} ${lastName.trim()} ajouté(e) au pipeline (à enrichir).`, "success");
      onCreated?.();
      reset();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) reset();
          onOpenChange(next);
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un contact</DialogTitle>
          </DialogHeader>
          <DialogContent className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="contact-client">
                Client DMH
              </label>
              <select
                id="contact-client"
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
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="contact-company">
                Entreprise
              </label>
              <div className="flex gap-2">
                <select
                  id="contact-company"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  disabled={!clientId}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:opacity-60"
                >
                  <option value="">{clientId ? "Sélectionner…" : "Choisir un client d'abord"}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!clientId}
                  onClick={() => setAddCompanyOpen(true)}
                  className="shrink-0"
                >
                  + Entreprise
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground" htmlFor="contact-first-name">
                  Prénom
                </label>
                <input
                  id="contact-first-name"
                  autoFocus
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground" htmlFor="contact-last-name">
                  Nom
                </label>
                <input
                  id="contact-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="contact-job-title">
                Poste (optionnel)
              </label>
              <input
                id="contact-job-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="contact-linkedin">
                URL LinkedIn (optionnel)
              </label>
              <input
                id="contact-linkedin"
                placeholder="https://www.linkedin.com/in/…"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="contact-email">
                Email (optionnel)
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "…" : "Ajouter le contact"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <AddCompanyDialog
        open={addCompanyOpen}
        onOpenChange={setAddCompanyOpen}
        lockedClientId={clientId}
        onCreated={(company) => {
          setCompanies((prev) => [...prev, company].sort((a, b) => a.name.localeCompare(b.name)));
          setCompanyId(company.id);
        }}
      />
    </>
  );
}
