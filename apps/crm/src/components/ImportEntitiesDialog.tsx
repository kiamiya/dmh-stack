import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabase";
import { useClients } from "../hooks/useClients";
import { listCompaniesForClient } from "../services/companies";
import { listContactEmailsForClient } from "../services/contacts";
import { parseCsv } from "../lib/csv";
import { autoDetectColumn } from "../lib/importColumnMapping";
import { planContactImport } from "../lib/contactImportPlan";
import { planCompanyImport } from "../lib/companyImportPlan";
import { importCompanies, importContacts } from "../services/entityImport";
import { useToast } from "./ui/toast";

export interface ImportEntitiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "contact" | "company";
  onImported: () => void;
}

const CONTACT_FIELDS = [
  { key: "firstName", label: "Prénom", required: true },
  { key: "lastName", label: "Nom", required: true },
  { key: "companyName", label: "Entreprise", required: true },
  { key: "jobTitle", label: "Poste", required: false },
  { key: "email", label: "Email", required: false },
  { key: "linkedinUrl", label: "URL LinkedIn", required: false },
] as const;

const COMPANY_FIELDS = [
  { key: "name", label: "Nom de l'entreprise", required: true },
  { key: "city", label: "Ville", required: false },
  { key: "website", label: "Site web", required: false },
] as const;

/**
 * Import CSV créant de nouvelles fiches (contrairement à `ImportListDialog`,
 * qui ne fait que rattacher des fiches déjà existantes à une liste). Pour
 * les contacts : crée aussi le prospect `to_enrich` associé, comme
 * `AddContactDialog` — si le client a une automatisation "Enrichir" active
 * sur les prospects créés, l'enrichissement Pappers/Dropcontact démarre
 * automatiquement, sans action supplémentaire ici. Pour les entreprises
 * seules : aucun prospect n'est créé (pas de contact associé), donc aucun
 * enrichissement automatique ne se déclenche pour cet import — limite
 * assumée de l'architecture actuelle (voir TESTING.md).
 */
export function ImportEntitiesDialog({ open, onOpenChange, entityType, onImported }: ImportEntitiesDialogProps) {
  const clients = useClients();
  const { toast } = useToast();
  const fields = entityType === "contact" ? CONTACT_FIELDS : COMPANY_FIELDS;

  const [clientId, setClientId] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  function reset() {
    setClientId("");
    setFileName("");
    setRows([]);
    setMapping({});
    setError(null);
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    const detectedColumns = parsed.length > 0 ? Object.keys(parsed[0]) : [];
    const detected: Record<string, string> = {};
    for (const field of fields) {
      detected[field.key] = autoDetectColumn(detectedColumns, field.key);
    }
    setMapping(detected);
  }

  const missingRequiredMapping = fields.some((f) => f.required && !mapping[f.key]);

  const plan = useMemo(() => {
    if (rows.length === 0 || missingRequiredMapping) return null;
    if (entityType === "contact") {
      return planContactImport(
        rows,
        {
          firstName: mapping.firstName,
          lastName: mapping.lastName,
          companyName: mapping.companyName,
          jobTitle: mapping.jobTitle || undefined,
          email: mapping.email || undefined,
          linkedinUrl: mapping.linkedinUrl || undefined,
        },
        new Set(),
      );
    }
    return planCompanyImport(
      rows,
      { name: mapping.name, city: mapping.city || undefined, website: mapping.website || undefined },
      new Set(),
    );
  }, [rows, mapping, missingRequiredMapping, entityType]);

  async function handleSubmit() {
    if (!clientId) {
      setError("Le client DMH est requis.");
      return;
    }
    if (rows.length === 0) {
      setError("Choisis un fichier CSV.");
      return;
    }
    if (missingRequiredMapping) {
      setError("Associe une colonne du fichier à chaque champ obligatoire.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (entityType === "contact") {
        const [existingCompanies, existingEmails] = await Promise.all([
          listCompaniesForClient(supabase, clientId),
          listContactEmailsForClient(supabase, clientId),
        ]);
        const contactPlan = planContactImport(
          rows,
          {
            firstName: mapping.firstName,
            lastName: mapping.lastName,
            companyName: mapping.companyName,
            jobTitle: mapping.jobTitle || undefined,
            email: mapping.email || undefined,
            linkedinUrl: mapping.linkedinUrl || undefined,
          },
          new Set(existingEmails.map((e) => e.toLowerCase())),
        );
        const companyIdByName = new Map(existingCompanies.map((c) => [c.name.toLowerCase(), c.id]));
        const result = await importContacts(supabase, clientId, contactPlan, companyIdByName);

        const parts = [`${result.contactsCreated} contact(s) créé(s)`];
        if (result.companiesCreated > 0) parts.push(`${result.companiesCreated} entreprise(s) créée(s)`);
        if (contactPlan.skipped.length > 0 || result.errors.length > 0) {
          parts.push(`${contactPlan.skipped.length + result.errors.length} ligne(s) ignorée(s)`);
        }
        toast(parts.join(", ") + ".", result.errors.length > 0 ? "destructive" : "success");
      } else {
        const existingCompanies = await listCompaniesForClient(supabase, clientId);
        const companyPlan = planCompanyImport(
          rows,
          { name: mapping.name, city: mapping.city || undefined, website: mapping.website || undefined },
          new Set(existingCompanies.map((c) => c.name.toLowerCase())),
        );
        const result = await importCompanies(supabase, clientId, companyPlan);

        const parts = [`${result.companiesCreated} entreprise(s) créée(s)`];
        if (companyPlan.skipped.length > 0 || result.errors.length > 0) {
          parts.push(`${companyPlan.skipped.length + result.errors.length} ligne(s) ignorée(s)`);
        }
        toast(parts.join(", ") + ".", result.errors.length > 0 ? "destructive" : "success");
      }

      onImported();
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
      <DialogHeader>
        <DialogTitle>Importer {entityType === "contact" ? "des contacts" : "des entreprises"}</DialogTitle>
      </DialogHeader>
      <DialogContent className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-muted-foreground" htmlFor="import-entities-client">
            Client DMH
          </label>
          <select
            id="import-entities-client"
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
          <label className="mb-1 block text-sm text-muted-foreground" htmlFor="import-entities-file">
            Fichier CSV
          </label>
          <input
            id="import-entities-file"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="w-full text-sm"
          />
          {fileName && (
            <p className="mt-1 text-xs text-muted-foreground">
              {fileName} — {rows.length} ligne(s) détectée(s)
            </p>
          )}
        </div>
        {columns.length > 0 && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <p className="text-xs font-medium text-foreground">Correspondance des colonnes</p>
            {fields.map((field) => (
              <div key={field.key} className="flex items-center gap-2">
                <label className="w-40 shrink-0 text-sm text-muted-foreground">
                  {field.label}
                  {field.required && " *"}
                </label>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                >
                  <option value="">{field.required ? "Choisir une colonne…" : "Ignorer"}</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
        {plan && (
          <p className="text-sm text-foreground">
            {plan.toCreate.length} ligne(s) prête(s) à importer
            {plan.skipped.length > 0 && <> · {plan.skipped.length} ligne(s) ignorée(s)</>}
          </p>
        )}
        {plan && plan.skipped.length > 0 && (
          <ul className="max-h-24 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
            {plan.skipped.slice(0, 10).map((s) => (
              <li key={s.csvLine}>
                Ligne {s.csvLine} : {s.reason}
              </li>
            ))}
            {plan.skipped.length > 10 && <li>… et {plan.skipped.length - 10} autre(s)</li>}
          </ul>
        )}
        {entityType === "contact" && (
          <p className="text-xs text-muted-foreground">
            Chaque contact importé entre dans le pipeline d'enrichissement (statut "à enrichir"), comme une création
            manuelle. L'entreprise est réutilisée si son nom correspond déjà à une entreprise existante pour ce
            client.
          </p>
        )}
        {entityType === "company" && (
          <p className="text-xs text-muted-foreground">
            Aucun prospect n'est créé pour un import d'entreprises seules (l'enrichissement automatique nécessite un
            contact associé) — les entreprises déjà existantes (même nom) ne sont pas recréées.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={submitting || !plan || plan.toCreate.length === 0}>
          {submitting ? "…" : "Importer"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
