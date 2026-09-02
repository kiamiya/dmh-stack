import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabase";
import { useClients } from "../hooks/useClients";
import { createCompany } from "../services/companies";
import { validateCompanyForm } from "../lib/companyForm";
import { useToast } from "./ui/toast";

export interface AddCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (company: { id: string; name: string }) => void;
  /** Pré-remplit et verrouille le client DMH — utilisé quand ce dialogue s'ouvre depuis "Ajouter un contact". */
  lockedClientId?: string;
}

export function AddCompanyDialog({ open, onOpenChange, onCreated, lockedClientId }: AddCompanyDialogProps) {
  const clients = useClients();
  const [clientId, setClientId] = useState(lockedClientId ?? "");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (lockedClientId) setClientId(lockedClientId);
  }, [lockedClientId, open]);

  function reset() {
    setClientId(lockedClientId ?? "");
    setName("");
    setCity("");
    setWebsite("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validateCompanyForm({ clientId, name, website });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const trimmedName = name.trim();
      const created = await createCompany(supabase, {
        clientId,
        name: trimmedName,
        city: city.trim() || null,
        website: website.trim() || null,
      });
      toast(`Entreprise "${trimmedName}" ajoutée.`, "success");
      onCreated?.({ id: created.id, name: trimmedName });
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
          <DialogTitle>Ajouter une entreprise</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="company-client">
              Client DMH
            </label>
            <select
              id="company-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={!!lockedClientId}
              className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:opacity-60"
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
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="company-name">
              Nom de l'entreprise
            </label>
            <input
              id="company-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="company-city">
              Ville (optionnel)
            </label>
            <input
              id="company-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="company-website">
              Site web (optionnel)
            </label>
            <input
              id="company-website"
              placeholder="https://…"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Le secteur, le SIREN et les autres champs seront complétés automatiquement par l'enrichissement
            Pappers.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "…" : "Ajouter l'entreprise"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
