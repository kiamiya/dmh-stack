import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabase";
import { useClients } from "../hooks/useClients";
import { listCompaniesForClient } from "../services/companies";
import type { CompanyOption } from "../services/companies";
import { createContact, findContactByEmail } from "../services/contacts";
import type { ContactDuplicateMatch } from "../services/contacts";
import { createProspect } from "../services/prospects";
import { validateContactForm } from "../lib/contactForm";
import { useToast } from "./ui/toast";
import { AddCompanyDialog } from "./AddCompanyDialog";
import { SearchableSelect } from "./ui/searchable-select";

export interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé une fois le contact ET le prospect créés (statut `to_enrich`), avec l'id du contact créé — permet de rafraîchir la liste ou de lier directement le contact ailleurs (ex. à une opportunité). */
  onCreated?: (contact: { id: string }) => void;
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
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate] = useState<ContactDuplicateMatch | null>(null);
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

  /** Alerte de doublons (CR du 11/09/2026) : avertit sans bloquer — un email légitimement partagé (assistante, standard) reste possible. */
  useEffect(() => {
    if (!clientId || !email.trim()) {
      setDuplicate(null);
      return;
    }
    let cancelled = false;
    findContactByEmail(supabase, clientId, email)
      .then((match) => {
        if (!cancelled) setDuplicate(match);
      })
      .catch(() => {
        if (!cancelled) setDuplicate(null);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, email]);

  function reset() {
    setClientId("");
    setCompanies([]);
    setCompanyId("");
    setFirstName("");
    setLastName("");
    setJobTitle("");
    setEmail("");
    setPhone("");
    setLinkedinUrl("");
    setError(null);
    setDuplicate(null);
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
        phone: phone.trim() || null,
      });
      await createProspect(supabase, { clientId, contactId: contact.id, companyId });

      toast(`${firstName.trim()} ${lastName.trim()} ajouté(e) au pipeline (à enrichir).`, "success");
      onCreated?.(contact);
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground" htmlFor="contact-last-name">
                  Nom
                </label>
                <input
                  id="contact-last-name"
                  autoFocus
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground" htmlFor="contact-first-name">
                  Prénom
                </label>
                <input
                  id="contact-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
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
              {duplicate && (
                <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
                  Un contact avec cet email existe déjà pour ce client :{" "}
                  <Link to={`/contacts/${duplicate.id}`} target="_blank" className="underline">
                    {duplicate.first_name} {duplicate.last_name}
                  </Link>
                  . Vérifie avant de continuer, pour ne pas créer de doublon.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="contact-phone">
                Téléphone (optionnel)
              </label>
              <input
                id="contact-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="contact-company">
                Entreprise
              </label>
              <div className="flex gap-2">
                <SearchableSelect
                  value={companyId}
                  onChange={setCompanyId}
                  disabled={!clientId}
                  placeholder={clientId ? "Sélectionner…" : "Choisir un client DMH d'abord"}
                  options={companies.map((c) => ({ value: c.id, label: c.name }))}
                />
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
