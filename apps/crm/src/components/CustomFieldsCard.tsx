import { useState } from "react";
import type { CustomFieldEntityType } from "@dmh/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useFieldDefinitions } from "../hooks/useFieldDefinitions";
import { useCustomFieldValues } from "../hooks/useCustomFieldValues";

export interface CustomFieldsCardProps {
  entityType: CustomFieldEntityType;
  entityId: string;
  clientId: string;
}

/** Carte "Champs personnalisés" réutilisée par ContactDetail/CompanyDetail — rendu dynamique selon `field_type` (S9). */
export function CustomFieldsCard({ entityType, entityId, clientId }: CustomFieldsCardProps) {
  const { definitions, loading: definitionsLoading } = useFieldDefinitions(entityType);
  const { values, save } = useCustomFieldValues(entityType, entityId);
  const [savingId, setSavingId] = useState<string | null>(null);

  if (definitionsLoading) return null;
  if (definitions.length === 0) return null;

  async function handleChange(fieldDefinitionId: string, value: string | number | boolean | null) {
    setSavingId(fieldDefinitionId);
    try {
      await save({ clientId, entityType, entityId, fieldDefinitionId, value });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Champs personnalisés</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {definitions.map((def) => {
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
        })}
      </CardContent>
    </Card>
  );
}
