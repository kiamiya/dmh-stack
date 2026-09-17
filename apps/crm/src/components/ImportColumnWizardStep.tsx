import { useEffect, useState } from "react";
import type { CustomFieldDefinition, CustomFieldType } from "@dmh/types";
import type { ColumnAnalysisSuggestion } from "@dmh/import-agent";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { slugifyFieldKey, parseSelectOptions, validateCustomFieldForm } from "../lib/customFieldForm";
import type { ImportColumnDecision } from "../lib/importColumnDecision";

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texte",
  number: "Nombre",
  date: "Date",
  boolean: "Case à cocher",
  select: "Liste déroulante",
  multiselect: "Choix multiples (tags)",
};

type DraftAction = ImportColumnDecision["action"];

export interface ImportColumnWizardStepProps {
  columns: string[];
  sampleValuesByColumn: Record<string, string[]>;
  suggestionsByColumn: Record<string, ColumnAnalysisSuggestion | undefined>;
  existingCustomFields: CustomFieldDefinition[];
  analysisFailed: boolean;
  onComplete: (decisions: ImportColumnDecision[]) => void;
  onCancel: () => void;
}

function defaultDecisionForColumn(
  column: string,
  suggestion: ColumnAnalysisSuggestion | undefined,
): ImportColumnDecision {
  if (!suggestion) return { column, action: "ignore" };

  if (suggestion.suggestedAction === "map_existing" && suggestion.existingFieldId) {
    return {
      column,
      action: "map_existing",
      fieldDefinitionId: suggestion.existingFieldId,
      fieldKey: "",
    };
  }

  if (suggestion.suggestedAction === "create_new") {
    const label = suggestion.suggestedLabel?.trim() || column;
    const fieldType = (suggestion.suggestedType as CustomFieldType) || "text";
    return {
      column,
      action: "create_new",
      label,
      fieldType,
      fieldKey: slugifyFieldKey(label),
    };
  }

  return { column, action: "ignore" };
}

/**
 * Wizard séquentiel (une colonne non reconnue à la fois), pré-rempli par les
 * suggestions de `analyze-import-columns` mais toujours éditable — si
 * l'analyse Claude a échoué (`analysisFailed`), chaque colonne démarre sur
 * "Ignorer" sans suggestion, mais reste configurable manuellement (voir
 * `TESTING.md`).
 */
export function ImportColumnWizardStep({
  columns,
  sampleValuesByColumn,
  suggestionsByColumn,
  existingCustomFields,
  analysisFailed,
  onComplete,
  onCancel,
}: ImportColumnWizardStepProps) {
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<ImportColumnDecision[]>(() =>
    columns.map((column) => defaultDecisionForColumn(column, suggestionsByColumn[column])),
  );
  const [error, setError] = useState<string | null>(null);

  const column = columns[index];
  const decision = decisions[index];
  const suggestion = suggestionsByColumn[column];
  const samples = sampleValuesByColumn[column] ?? [];

  const [action, setAction] = useState<DraftAction>(decision.action);
  const [mapExistingId, setMapExistingId] = useState(
    decision.action === "map_existing" ? decision.fieldDefinitionId : "",
  );
  const [label, setLabel] = useState(decision.action === "create_new" ? decision.label : column);
  const [fieldType, setFieldType] = useState<CustomFieldType>(
    decision.action === "create_new" ? decision.fieldType : "text",
  );
  const [selectOptionsRaw, setSelectOptionsRaw] = useState(
    decision.action === "create_new" ? (decision.selectOptions ?? []).join(", ") : "",
  );

  // Réinitialise les champs de saisie locaux quand on change de colonne (précédent/suivant).
  useEffect(() => {
    const current = decisions[index];
    setAction(current.action);
    setMapExistingId(current.action === "map_existing" ? current.fieldDefinitionId : "");
    setLabel(current.action === "create_new" ? current.label : columns[index]);
    setFieldType(current.action === "create_new" ? current.fieldType : "text");
    setSelectOptionsRaw(current.action === "create_new" ? (current.selectOptions ?? []).join(", ") : "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function buildCurrentDecision(): { decision: ImportColumnDecision; error: string | null } {
    if (action === "ignore") {
      return { decision: { column, action: "ignore" }, error: null };
    }
    if (action === "map_existing") {
      if (!mapExistingId) return { decision: decisions[index], error: "Choisis un champ personnalisé existant." };
      const field = existingCustomFields.find((f) => f.id === mapExistingId);
      return {
        decision: { column, action: "map_existing", fieldDefinitionId: mapExistingId, fieldKey: field?.field_key ?? "" },
        error: null,
      };
    }

    const otherCreateKeys = decisions
      .filter((d, i) => i !== index && d.action === "create_new")
      .map((d) => (d as { fieldKey: string }).fieldKey);
    const existingKeys = [...existingCustomFields.map((f) => f.field_key), ...otherCreateKeys];
    const validationError = validateCustomFieldForm({ label, fieldType, selectOptionsRaw, existingKeys });
    if (validationError) return { decision: decisions[index], error: validationError };

    return {
      decision: {
        column,
        action: "create_new",
        label: label.trim(),
        fieldType,
        fieldKey: slugifyFieldKey(label),
        selectOptions:
          fieldType === "select" || fieldType === "multiselect" ? parseSelectOptions(selectOptionsRaw) : undefined,
      },
      error: null,
    };
  }

  function goNext() {
    const { decision: resolved, error: validationError } = buildCurrentDecision();
    if (validationError) {
      setError(validationError);
      return;
    }
    const next = decisions.slice();
    next[index] = resolved;
    setDecisions(next);

    if (index === columns.length - 1) {
      onComplete(next);
    } else {
      setIndex(index + 1);
    }
  }

  function goPrevious() {
    const { decision: resolved, error: validationError } = buildCurrentDecision();
    if (!validationError) {
      const next = decisions.slice();
      next[index] = resolved;
      setDecisions(next);
    }
    setIndex(Math.max(0, index - 1));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        Colonne non reconnue {index + 1} / {columns.length}
      </p>

      {analysisFailed && (
        <p className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          Analyse automatique indisponible — configure chaque colonne manuellement.
        </p>
      )}

      <div className="rounded-md border border-border p-3">
        <p className="text-sm font-medium text-foreground">"{column}"</p>
        {samples.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {samples.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
        )}
        {suggestion && !analysisFailed && (
          <p className="mt-2 text-xs text-muted-foreground">
            Suggestion : {suggestion.rationale} (confiance {Math.round(suggestion.confidence * 100)}%)
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={action === "ignore"} onChange={() => setAction("ignore")} />
          Ignorer cette colonne
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={action === "map_existing"} onChange={() => setAction("map_existing")} />
          Rattacher à un champ personnalisé existant
        </label>
        {action === "map_existing" && (
          <select
            value={mapExistingId}
            onChange={(e) => setMapExistingId(e.target.value)}
            className="ml-6 w-[calc(100%-1.5rem)] rounded-md border border-border px-2 py-1.5 text-sm"
          >
            <option value="">Choisir un champ…</option>
            {existingCustomFields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label} ({FIELD_TYPE_LABELS[f.field_type]})
              </option>
            ))}
          </select>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={action === "create_new"} onChange={() => setAction("create_new")} />
          Créer un nouveau champ personnalisé
        </label>
        {action === "create_new" && (
          <div className="ml-6 space-y-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Libellé du champ"
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            />
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            >
              {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {(fieldType === "select" || fieldType === "multiselect") && (
              <input
                value={selectOptionsRaw}
                onChange={(e) => setSelectOptionsRaw(e.target.value)}
                placeholder="Options séparées par des virgules"
                className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
              />
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={index === 0 ? onCancel : goPrevious}>
          {index === 0 ? "Annuler" : "Précédent"}
        </Button>
        <Button type="button" onClick={goNext}>
          {index === columns.length - 1 ? "Terminer" : "Suivant"}
        </Button>
      </div>
    </div>
  );
}
