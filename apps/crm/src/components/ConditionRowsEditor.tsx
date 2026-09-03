import type { AutomationConditionOperator } from "@dmh/types";
import { Button } from "./ui/button";

export interface ConditionDraft {
  field: string;
  operator: AutomationConditionOperator;
  value: string;
}

const OPERATOR_LABELS: Record<AutomationConditionOperator, string> = {
  eq: "égal à",
  neq: "différent de",
  gt: "supérieur à",
  lt: "inférieur à",
  contains: "contient",
  is_set: "est renseigné",
};

export interface ConditionRowsEditorProps {
  conditions: ConditionDraft[];
  onChange: (next: ConditionDraft[]) => void;
  label?: string;
}

/** Éditeur de conditions réutilisé par Automations.tsx (S12) et Contacts.tsx (S13, segments) — même forme {field, operator, value}. */
export function ConditionRowsEditor({ conditions, onChange, label = "Conditions (toutes doivent être vraies)" }: ConditionRowsEditorProps) {
  function addRow() {
    onChange([...conditions, { field: "", operator: "eq", value: "" }]);
  }

  function updateRow(index: number, patch: Partial<ConditionDraft>) {
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeRow(index: number) {
    onChange(conditions.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button type="button" variant="ghost" size="sm" onClick={addRow}>
          + Condition
        </Button>
      </div>
      {conditions.map((cond, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={cond.field}
            onChange={(e) => updateRow(i, { field: e.target.value })}
            placeholder="Champ (ex. job_title, email)"
            className="flex-1 rounded-md border border-border px-2 py-1.5 text-sm"
          />
          <select
            value={cond.operator}
            onChange={(e) => updateRow(i, { operator: e.target.value as AutomationConditionOperator })}
            className="rounded-md border border-border px-2 py-1.5 text-sm"
          >
            {(Object.keys(OPERATOR_LABELS) as AutomationConditionOperator[]).map((op) => (
              <option key={op} value={op}>
                {OPERATOR_LABELS[op]}
              </option>
            ))}
          </select>
          {cond.operator !== "is_set" && (
            <input
              value={cond.value}
              onChange={(e) => updateRow(i, { value: e.target.value })}
              placeholder="Valeur"
              className="flex-1 rounded-md border border-border px-2 py-1.5 text-sm"
            />
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(i)}>
            ✕
          </Button>
        </div>
      ))}
    </div>
  );
}
