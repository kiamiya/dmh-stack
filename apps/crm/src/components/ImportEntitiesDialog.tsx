import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { CustomFieldDefinition } from "@dmh/types";
import type { ColumnAnalysisSuggestion } from "@dmh/import-agent";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabase";
import { useClients } from "../hooks/useClients";
import { listCompaniesForClient } from "../services/companies";
import { listContactEmailsForClient } from "../services/contacts";
import { listFieldDefinitions } from "../services/customFields";
import { resolveImportCustomFieldColumnMap } from "../services/importCustomFieldResolution";
import { parseCsv } from "../lib/csv";
import { autoDetectColumn } from "../lib/importColumnMapping";
import { sampleColumnValues } from "../lib/importColumnDecision";
import type { ImportColumnDecision } from "../lib/importColumnDecision";
import { planContactImport } from "../lib/contactImportPlan";
import { planCompanyImport } from "../lib/companyImportPlan";
import { importCompanies, importContacts } from "../services/entityImport";
import { ImportColumnWizardStep } from "./ImportColumnWizardStep";
import { InvalidEmailCorrectionRow } from "./InvalidEmailCorrectionRow";
import { applyCellCorrection } from "../lib/importRowCorrection";
import { useToast } from "./ui/toast";
import { formatImportToast, summarizeImportErrors } from "../lib/importErrorSummary";
import type { ImportRowError } from "../services/entityImport";

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

type ImportStep = "mapping" | "analyzing" | "column-wizard" | "review";

const CUSTOM_FIELD_DECISION_LABEL: Record<ImportColumnDecision["action"], (d: ImportColumnDecision, existing: CustomFieldDefinition[]) => string> = {
  ignore: () => "ignorée",
  map_existing: (d, existing) => {
    const field = d.action === "map_existing" ? existing.find((f) => f.id === d.fieldDefinitionId) : undefined;
    return `rattachée au champ existant "${field?.label ?? "?"}"`;
  },
  create_new: (d) => (d.action === "create_new" ? `nouveau champ "${d.label}" (${d.fieldType})` : ""),
};

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
 *
 * Agent d'import (demande de Delphine, 2026-09-17) : les colonnes du fichier
 * qui ne correspondent à aucun champ standard ne sont plus silencieusement
 * ignorées — un wizard séquentiel, pré-rempli par une analyse Claude
 * (`analyze-import-columns`), guide l'utilisateur colonne par colonne pour
 * décider de les ignorer, les rattacher à un champ personnalisé existant, ou
 * en créer un nouveau. Si l'analyse échoue, le wizard reste utilisable
 * manuellement (voir TESTING.md).
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

  const [step, setStep] = useState<ImportStep>("mapping");
  const [unmappedColumns, setUnmappedColumns] = useState<string[]>([]);
  const [existingCustomFields, setExistingCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [suggestions, setSuggestions] = useState<ColumnAnalysisSuggestion[]>([]);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [columnDecisions, setColumnDecisions] = useState<ImportColumnDecision[]>([]);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  function reset() {
    setClientId("");
    setFileName("");
    setRows([]);
    setMapping({});
    setError(null);
    setStep("mapping");
    setUnmappedColumns([]);
    setExistingCustomFields([]);
    setSuggestions([]);
    setAnalysisFailed(false);
    setColumnDecisions([]);
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
        columnDecisions,
      );
    }
    return planCompanyImport(
      rows,
      { name: mapping.name, city: mapping.city || undefined, website: mapping.website || undefined },
      new Set(),
      columnDecisions,
    );
  }, [rows, mapping, missingRequiredMapping, entityType, columnDecisions]);

  // S38-2 : lignes écartées pour email mal formé (corrigeables sur place) vs autres motifs.
  const skippedRows: Array<{ csvLine: number; reason: string; invalidEmail?: { rowIndex: number; value: string } }> =
    plan?.skipped ?? [];
  const invalidEmailRows = skippedRows.filter(
    (s): s is typeof s & { invalidEmail: { rowIndex: number; value: string } } => s.invalidEmail !== undefined,
  );
  const otherSkipped = skippedRows.filter((s) => s.invalidEmail === undefined);

  async function handleContinueFromMapping() {
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
    setError(null);

    const mappedColumns = new Set(Object.values(mapping).filter(Boolean));
    const unmapped = columns.filter((c) => !mappedColumns.has(c));

    if (unmapped.length === 0) {
      setColumnDecisions([]);
      setStep("review");
      return;
    }

    setUnmappedColumns(unmapped);
    setStep("analyzing");

    const customFieldEntityType = entityType;
    let allDefinitions: CustomFieldDefinition[] = [];
    try {
      allDefinitions = await listFieldDefinitions(supabase, customFieldEntityType);
    } catch {
      allDefinitions = [];
    }
    const clientDefinitions = allDefinitions.filter((d) => d.client_id === clientId);
    setExistingCustomFields(clientDefinitions);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("analyze-import-columns", {
        body: {
          entityType: customFieldEntityType,
          mappedStandardFields: fields.filter((f) => mapping[f.key]).map((f) => ({ key: f.key, label: f.label })),
          existingCustomFields: clientDefinitions.map((f) => ({
            id: f.id,
            fieldKey: f.field_key,
            label: f.label,
            fieldType: f.field_type,
            selectOptions: f.select_options,
          })),
          columns: unmapped.map((c) => ({ name: c, sampleValues: sampleColumnValues(rows, c) })),
        },
      });
      if (invokeError) throw invokeError;
      setSuggestions(data?.suggestions ?? []);
      setAnalysisFailed(false);
    } catch {
      setSuggestions([]);
      setAnalysisFailed(true);
    }

    setStep("column-wizard");
  }

  function handleColumnWizardComplete(decisions: ImportColumnDecision[]) {
    setColumnDecisions(decisions);
    setStep("review");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const customFieldColumnMap = await resolveImportCustomFieldColumnMap(
        supabase,
        clientId,
        entityType,
        columnDecisions,
      );

      let rowErrors: ImportRowError[] = [];
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
          columnDecisions,
        );
        const companyIdByName = new Map(existingCompanies.map((c) => [c.name.toLowerCase(), c.id]));
        const result = await importContacts(supabase, clientId, contactPlan, companyIdByName, customFieldColumnMap);

        const parts = [`${result.contactsCreated} contact(s) créé(s)`];
        if (result.companiesCreated > 0) parts.push(`${result.companiesCreated} entreprise(s) créée(s)`);
        toast(formatImportToast(parts, contactPlan.skipped.length, result.errors.length), result.errors.length > 0 ? "destructive" : "success");
        rowErrors = result.errors;
      } else {
        const existingCompanies = await listCompaniesForClient(supabase, clientId);
        const companyPlan = planCompanyImport(
          rows,
          { name: mapping.name, city: mapping.city || undefined, website: mapping.website || undefined },
          new Set(existingCompanies.map((c) => c.name.toLowerCase())),
          columnDecisions,
        );
        const result = await importCompanies(supabase, clientId, companyPlan, customFieldColumnMap);

        toast(
          formatImportToast([`${result.companiesCreated} entreprise(s) créée(s)`], companyPlan.skipped.length, result.errors.length),
          result.errors.length > 0 ? "destructive" : "success",
        );
        rowErrors = result.errors;
      }

      onImported();
      // Erreurs d'écriture en base : on garde la fenêtre ouverte avec le vrai
      // message (S38-1 — un simple compteur avait masqué un trigger cassé).
      const errorSummary = summarizeImportErrors(rowErrors);
      if (errorSummary) {
        setError(errorSummary);
        return;
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const suggestionsByColumn: Record<string, ColumnAnalysisSuggestion | undefined> = {};
  for (const s of suggestions) suggestionsByColumn[s.column] = s;
  const sampleValuesByColumn: Record<string, string[]> = {};
  for (const c of unmappedColumns) sampleValuesByColumn[c] = sampleColumnValues(rows, c);

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
        {step === "mapping" && (
          <>
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
            {entityType === "contact" && (
              <p className="text-xs text-muted-foreground">
                Chaque contact importé entre dans le pipeline d'enrichissement (statut "à enrichir"), comme une
                création manuelle. L'entreprise est réutilisée si son nom correspond déjà à une entreprise existante
                pour ce client.
              </p>
            )}
            {entityType === "company" && (
              <p className="text-xs text-muted-foreground">
                Aucun prospect n'est créé pour un import d'entreprises seules (l'enrichissement automatique nécessite
                un contact associé) — les entreprises déjà existantes (même nom) ne sont pas recréées.
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </>
        )}

        {step === "analyzing" && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Analyse des colonnes non reconnues en cours…
          </p>
        )}

        {step === "column-wizard" && (
          <ImportColumnWizardStep
            columns={unmappedColumns}
            sampleValuesByColumn={sampleValuesByColumn}
            suggestionsByColumn={suggestionsByColumn}
            existingCustomFields={existingCustomFields}
            analysisFailed={analysisFailed}
            onComplete={handleColumnWizardComplete}
            onCancel={() => setStep("mapping")}
          />
        )}

        {step === "review" && (
          <>
            {plan && (
              <p className="text-sm text-foreground">
                {plan.toCreate.length} ligne(s) prête(s) à importer
                {plan.skipped.length > 0 && <> · {plan.skipped.length} ligne(s) ignorée(s)</>}
              </p>
            )}
            {invalidEmailRows.length > 0 && (
              <div className="space-y-1 rounded-md border border-destructive/40 p-3">
                <p className="text-xs font-medium text-foreground">
                  {invalidEmailRows.length} email(s) mal formé(s) — corrige-les ou importe ces contacts sans email
                  (sinon ces lignes ne seront pas importées)
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {invalidEmailRows.map((s) => (
                    <InvalidEmailCorrectionRow
                      key={`${s.csvLine}-${s.invalidEmail.value}`}
                      csvLine={s.csvLine}
                      value={s.invalidEmail.value}
                      onCorrect={(value) => setRows((prev) => applyCellCorrection(prev, s.invalidEmail.rowIndex, mapping.email, value))}
                    />
                  ))}
                </ul>
              </div>
            )}
            {otherSkipped.length > 0 && (
              <ul className="max-h-24 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
                {otherSkipped.slice(0, 10).map((s) => (
                  <li key={s.csvLine}>
                    Ligne {s.csvLine} : {s.reason}
                  </li>
                ))}
                {otherSkipped.length > 10 && <li>… et {otherSkipped.length - 10} autre(s)</li>}
              </ul>
            )}
            {columnDecisions.length > 0 && (
              <div className="space-y-1 rounded-md border border-border p-3">
                <p className="text-xs font-medium text-foreground">Champs personnalisés</p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {columnDecisions.map((d) => (
                    <li key={d.column}>
                      "{d.column}" — {CUSTOM_FIELD_DECISION_LABEL[d.action](d, existingCustomFields)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </>
        )}
      </DialogContent>
      <DialogFooter>
        {step === "mapping" && (
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={handleContinueFromMapping} disabled={!plan || plan.toCreate.length === 0}>
              Continuer
            </Button>
          </>
        )}
        {step === "review" && (
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting || !plan || plan.toCreate.length === 0}>
              {submitting ? "…" : "Importer"}
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}
