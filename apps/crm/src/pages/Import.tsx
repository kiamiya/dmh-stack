import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ChangeEvent } from "react";
import type { CustomFieldDefinition } from "@dmh/types";
import type { ColumnAnalysisSuggestion } from "@dmh/import-agent";
import { Button } from "../components/ui/button";
import { PageHeader } from "../components/ui/page-header";
import { supabase } from "../lib/supabase";
import { useClients } from "../hooks/useClients";
import { listCompaniesForClient } from "../services/companies";
import { listClientFieldOptions, listFieldDefinitions } from "../services/customFields";
import { resolveDefinitionsForClient } from "../lib/customFieldScope";
import { resolveImportCustomFieldColumnMap } from "../services/importCustomFieldResolution";
import { parseCsv } from "../lib/csv";
import { autoDetectColumn } from "../lib/importColumnMapping";
import { sampleColumnValues } from "../lib/importColumnDecision";
import type { ImportColumnDecision } from "../lib/importColumnDecision";
import { planContactImport } from "../lib/contactImportPlan";
import { planCompanyImport } from "../lib/companyImportPlan";
import {
  importCompanies,
  importContacts,
  listCompaniesForImportConflict,
  listContactsForImportConflict,
  updateExistingCompanies,
  updateExistingContacts,
} from "../services/entityImport";
import type { ExistingCompanyForImport, ExistingContactForImport } from "../services/entityImport";
import { IMPORT_CONFLICT_POLICY_OPTIONS } from "../lib/importConflict";
import type { ImportConflictPolicy } from "../lib/importConflict";
import type { ContactLegalBasis } from "@dmh/types";
import { DEFAULT_IMPORT_LEGAL_BASIS, LEGAL_BASIS_OPTIONS, parseLegalBasis } from "../lib/legalBasis";
import { ImportColumnWizardStep } from "../components/ImportColumnWizardStep";
import { InvalidEmailCorrectionRow } from "../components/InvalidEmailCorrectionRow";
import { applyCellCorrection } from "../lib/importRowCorrection";
import { useToast } from "../components/ui/toast";
import {
  buildImportTemplateCsv,
  describeImportColumns,
  groupImportFields,
  IMPORT_FIELD_GROUP_LABEL,
  importFieldsFor,
} from "../lib/importFields";
import type { ImportEntityType } from "../lib/importFields";
import { formatImportToast, summarizeImportErrors } from "../lib/importErrorSummary";
import type { ImportRowError } from "../services/entityImport";

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
 *
 * S38-4 (retour de Delphine du 17/09, modèle HubSpot) : page plein écran
 * (`/import/contacts`, `/import/companies`) au lieu d'une modale, modèle CSV
 * téléchargeable, indicateurs de correspondance (coché/non coché) et
 * distinction propriétés du contact / de l'entreprise.
 */
export function ImportPage() {
  const { entity } = useParams();
  const entityType: ImportEntityType = entity === "companies" ? "company" : "contact";
  const navigate = useNavigate();
  const returnTo = entityType === "contact" ? "/" : "/?view=companies";
  const clients = useClients();
  const { toast } = useToast();
  const fields = importFieldsFor(entityType);

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
  // S38-3 : fiches déjà en base (chargées à la sortie de l'étape de correspondance) + politique de conflit.
  const [existingContacts, setExistingContacts] = useState<ExistingContactForImport[]>([]);
  const [existingCompanies, setExistingCompanies] = useState<ExistingCompanyForImport[]>([]);
  const [conflictPolicy, setConflictPolicy] = useState<ImportConflictPolicy>("skip");
  // S38-5 : base juridique RGPD appliquée aux contacts importés.
  const [legalBasis, setLegalBasis] = useState<ContactLegalBasis>(DEFAULT_IMPORT_LEGAL_BASIS);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

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
        new Set(existingContacts.map((c) => c.email.toLowerCase())),
        columnDecisions,
        conflictPolicy,
      );
    }
    return planCompanyImport(
      rows,
      { name: mapping.name, city: mapping.city || undefined, website: mapping.website || undefined },
      new Set(existingCompanies.map((c) => c.name.toLowerCase())),
      columnDecisions,
      conflictPolicy,
    );
  }, [rows, mapping, missingRequiredMapping, entityType, columnDecisions, existingContacts, existingCompanies, conflictPolicy]);

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

    try {
      if (entityType === "contact") setExistingContacts(await listContactsForImportConflict(supabase, clientId));
      else setExistingCompanies(await listCompaniesForImportConflict(supabase, clientId));
    } catch (err) {
      setError((err as Error).message);
      return;
    }

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
    // S38-6 : champs système + champs de ce client, avec ses options — proposés en priorité par l'agent d'import.
    let clientDefinitions: CustomFieldDefinition[] = [];
    try {
      const [allDefinitions, overrides] = await Promise.all([
        listFieldDefinitions(supabase, customFieldEntityType),
        listClientFieldOptions(supabase, clientId),
      ]);
      clientDefinitions = resolveDefinitionsForClient(allDefinitions, clientId, overrides);
    } catch {
      clientDefinitions = [];
    }
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
        const [companiesForClient, contactsForConflict] = await Promise.all([
          listCompaniesForClient(supabase, clientId),
          listContactsForImportConflict(supabase, clientId),
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
          new Set(contactsForConflict.map((c) => c.email.toLowerCase())),
          columnDecisions,
          conflictPolicy,
        );
        const companyIdByName = new Map(companiesForClient.map((c) => [c.name.toLowerCase(), c.id]));
        const result = await importContacts(supabase, clientId, contactPlan, companyIdByName, customFieldColumnMap, legalBasis);
        const updates = await updateExistingContacts(
          supabase,
          clientId,
          contactPlan.toUpdate,
          new Map(contactsForConflict.map((c) => [c.email.toLowerCase(), c])),
          conflictPolicy,
          customFieldColumnMap,
          legalBasis,
        );

        const parts = [`${result.contactsCreated} contact(s) créé(s)`];
        if (updates.updated > 0) parts.push(`${updates.updated} mis à jour`);
        if (result.companiesCreated > 0) parts.push(`${result.companiesCreated} entreprise(s) créée(s)`);
        rowErrors = [...result.errors, ...updates.errors];
        toast(formatImportToast(parts, contactPlan.skipped.length, rowErrors.length), rowErrors.length > 0 ? "destructive" : "success");
      } else {
        const companiesForConflict = await listCompaniesForImportConflict(supabase, clientId);
        const companyPlan = planCompanyImport(
          rows,
          { name: mapping.name, city: mapping.city || undefined, website: mapping.website || undefined },
          new Set(companiesForConflict.map((c) => c.name.toLowerCase())),
          columnDecisions,
          conflictPolicy,
        );
        const result = await importCompanies(supabase, clientId, companyPlan, customFieldColumnMap);
        const updates = await updateExistingCompanies(
          supabase,
          clientId,
          companyPlan.toUpdate,
          new Map(companiesForConflict.map((c) => [c.name.toLowerCase(), c])),
          conflictPolicy,
          customFieldColumnMap,
        );

        const parts = [`${result.companiesCreated} entreprise(s) créée(s)`];
        if (updates.updated > 0) parts.push(`${updates.updated} mise(s) à jour`);
        rowErrors = [...result.errors, ...updates.errors];
        toast(formatImportToast(parts, companyPlan.skipped.length, rowErrors.length), rowErrors.length > 0 ? "destructive" : "success");
      }

      // Erreurs d'écriture en base : on garde la fenêtre ouverte avec le vrai
      // message (S38-1 — un simple compteur avait masqué un trigger cassé).
      const errorSummary = summarizeImportErrors(rowErrors);
      if (errorSummary) {
        setError(errorSummary);
        return;
      }
      navigate(returnTo);
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
    <div className="space-y-4 p-6">
      <PageHeader
        kicker="Import CSV"
        title={entityType === "contact" ? "Importer des contacts" : "Importer des entreprises"}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                buildImportTemplateCsv(entityType),
                entityType === "contact" ? "modele-import-contacts.csv" : "modele-import-entreprises.csv",
              )
            }
          >
            Télécharger le modèle CSV
          </Button>
        }
      />
      <div className="space-y-4 rounded-md border border-border bg-card p-4">
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
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-md border border-border p-3">
                  <p className="text-xs font-medium text-foreground">Correspondance des champs</p>
                  {groupImportFields(fields).map(({ group, fields: groupFields }) => (
                    <div key={group} className="space-y-2">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        {IMPORT_FIELD_GROUP_LABEL[group]}
                      </p>
                      {groupFields.map((field) => {
                        const mapped = Boolean(mapping[field.key]);
                        return (
                          <div key={field.key} className="flex items-center gap-2">
                            <span
                              aria-label={mapped ? "Associé" : "Non associé"}
                              className={`w-4 shrink-0 text-center text-sm ${
                                mapped ? "text-success" : field.required ? "text-destructive" : "text-muted-foreground"
                              }`}
                            >
                              {mapped ? "✓" : "○"}
                            </span>
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
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-xs font-medium text-foreground">Colonnes du fichier</p>
                  <table className="w-full table-fixed text-xs">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="w-1/3 pb-1 font-medium">Colonne</th>
                        <th className="w-1/3 pb-1 font-medium">Exemple</th>
                        <th className="w-1/3 pb-1 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {describeImportColumns(columns, mapping, fields).map((c) => (
                        <tr key={c.column} className="border-t border-border">
                          <td className="truncate py-1 pr-2 text-foreground">{c.column}</td>
                          <td className="truncate py-1 pr-2 text-muted-foreground">
                            {sampleColumnValues(rows, c.column)[0] ?? "—"}
                          </td>
                          <td className="py-1">
                            {c.status === "mapped" ? (
                              <span className="text-success">✓ {c.fieldLabel}</span>
                            ) : (
                              <span className="text-muted-foreground">○ à configurer à l'étape suivante</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
            {entityType === "contact" && (
              <div className="space-y-1 rounded-md border border-border p-3">
                <label className="block text-xs font-medium text-foreground" htmlFor="import-legal-basis">
                  Base juridique du traitement (RGPD) *
                </label>
                <select
                  id="import-legal-basis"
                  value={legalBasis}
                  onChange={(e) => setLegalBasis(parseLegalBasis(e.target.value) ?? DEFAULT_IMPORT_LEGAL_BASIS)}
                  className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                >
                  {LEGAL_BASIS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Appliquée à tous les contacts de cet import (et aux contacts existants qui n'en ont pas encore). En
                  prospection B2B, "Intérêt légitime — prospect" est la base habituelle ; le consentement explicite
                  concerne surtout le B2C.
                </p>
              </div>
            )}
            <fieldset className="space-y-1 rounded-md border border-border p-3">
              <legend className="px-1 text-xs font-medium text-foreground">
                Si {entityType === "contact" ? "un contact existe déjà (même email)" : "une entreprise existe déjà (même nom)"}
              </legend>
              {IMPORT_CONFLICT_POLICY_OPTIONS.map((o) => (
                <label key={o.value} className="flex cursor-pointer items-start gap-2 text-xs">
                  <input
                    type="radio"
                    name="import-conflict-policy"
                    value={o.value}
                    checked={conflictPolicy === o.value}
                    onChange={() => setConflictPolicy(o.value)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-foreground">{o.label}</span>
                    <span className="block text-muted-foreground">{o.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            {plan && (
              <p className="text-sm text-foreground">
                {plan.toCreate.length} à créer
                {plan.toUpdate.length > 0 && <> · {plan.toUpdate.length} fiche(s) existante(s) à mettre à jour</>}
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
      </div>
      <div className="flex justify-end gap-2">
        {step === "mapping" && (
          <>
            <Button type="button" variant="outline" onClick={() => navigate(returnTo)}>
              Annuler
            </Button>
            <Button type="button" onClick={handleContinueFromMapping} disabled={!plan || plan.toCreate.length === 0}>
              Continuer
            </Button>
          </>
        )}
        {step === "review" && (
          <>
            <Button type="button" variant="outline" onClick={() => navigate(returnTo)}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !plan || plan.toCreate.length + plan.toUpdate.length === 0}
            >
              {submitting ? "…" : "Importer"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
