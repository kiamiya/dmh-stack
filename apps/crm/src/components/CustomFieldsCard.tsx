import { useState } from "react";
import type { CustomFieldDefinition, CustomFieldEntityType } from "@dmh/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useFieldDefinitions } from "../hooks/useFieldDefinitions";
import { useCustomFieldValues } from "../hooks/useCustomFieldValues";

export interface CustomFieldsCardProps {
  entityType: CustomFieldEntityType;
  entityId: string;
  clientId: string;
  /** S38-9 : n'afficher qu'une section (défaut : les deux). */
  section?: "system" | "custom";
  /** S38-9 : bloc personnalisé — uniquement ces champs, sous ce titre. */
  onlyFieldKeys?: string[];
  title?: string;
  /** S38-9 : champs déjà affichés dans un bloc personnalisé, à ne pas répéter. */
  excludeFieldKeys?: Set<string>;
}

/**
 * Cartes de champs réutilisées par ContactDetail/CompanyDetail — rendu dynamique selon `field_type` (S9).
 * S38-6 : "Fiche de prospection" (champs système, communs à tous les clients) puis "Champs personnalisés"
 * (propres au client de la fiche uniquement — avant S38-6, les champs de tous les clients s'affichaient).
 */
export function CustomFieldsCard({
  entityType,
  entityId,
  clientId,
  section,
  onlyFieldKeys,
  title,
  excludeFieldKeys,
}: CustomFieldsCardProps) {
  const { definitions, loading: definitionsLoading } = useFieldDefinitions(entityType, clientId);
  const { values, save } = useCustomFieldValues(entityType, entityId);
  const [savingId, setSavingId] = useState<string | null>(null);

  if (definitionsLoading) return null;
  if (definitions.length === 0) return null;

  async function handleChange(fieldDefinitionId: string, value: string | number | boolean | string[] | null) {
    setSavingId(fieldDefinitionId);
    try {
      await save({ clientId, entityType, entityId, fieldDefinitionId, value });
    } finally {
      setSavingId(null);
    }
  }

  function renderField(def: CustomFieldDefinition) {
    const current = values.find((v) => v.field_definition_id === def.id)?.value ?? null;
    const saving = savingId === def.id;

    if (def.field_type === "boolean") {
      return (
        <label key={def.id} className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={current === true}
            disabled={saving}
            onChange={(e) => handleChange(def.id, e.target.checked)}
          />
          {def.label}
        </label>
      );
    }

    if (def.field_type === "multiselect") {
      const currentTags = Array.isArray(current) ? current : [];
      const toggleTag = (option: string) => {
        const next = currentTags.includes(option) ? currentTags.filter((t) => t !== option) : [...currentTags, option];
        handleChange(def.id, next);
      };
      return (
        <div key={def.id}>
          <label className="mb-1 block text-xs text-muted-foreground">{def.label}</label>
          <div className="flex flex-wrap gap-2">
            {(def.select_options ?? []).map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-foreground"
              >
                <input type="checkbox" checked={currentTags.includes(opt)} disabled={saving} onChange={() => toggleTag(opt)} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (def.field_type === "select") {
      return (
        <div key={def.id}>
          <label className="mb-1 block text-xs text-muted-foreground">{def.label}</label>
          <select
            value={typeof current === "string" ? current : ""}
            disabled={saving}
            onChange={(e) => handleChange(def.id, e.target.value || null)}
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            {(def.select_options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div key={def.id}>
        <label className="mb-1 block text-xs text-muted-foreground">{def.label}</label>
        <input
          type={def.field_type === "number" ? "number" : def.field_type === "date" ? "date" : "text"}
          defaultValue={current === null ? "" : String(current)}
          disabled={saving}
          onBlur={(e) => {
            const raw = e.target.value;
            const parsed = def.field_type === "number" ? (raw ? Number(raw) : null) : raw || null;
            handleChange(def.id, parsed);
          }}
          className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
        />
      </div>
    );
  }

  const shown = definitions.filter((d) => !excludeFieldKeys?.has(d.field_key));
  const sections = onlyFieldKeys
    ? [
        {
          title: title ?? "Champs",
          defs: onlyFieldKeys
            .map((key) => definitions.find((d) => d.field_key === key))
            .filter((d): d is CustomFieldDefinition => d !== undefined),
        },
      ]
    : [
        ...(section !== "custom" ? [{ title: "Fiche de prospection", defs: shown.filter((d) => d.is_system) }] : []),
        ...(section !== "system" ? [{ title: "Champs personnalisés", defs: shown.filter((d) => !d.is_system) }] : []),
      ].filter((s) => s.defs.length > 0);

  return (
    <>
      {sections.map((s) => (
        <Card key={s.title}>
          <CardHeader>
            <CardTitle>{s.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {s.defs.length > 0 ? s.defs.map(renderField) : <p className="text-sm text-muted-foreground">Aucun champ dans ce bloc.</p>}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
