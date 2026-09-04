import type { AutomationConditionOperator, CustomFieldEntityType } from "@dmh/types";
import { useFieldDefinitions } from "../hooks/useFieldDefinitions";
import { Button } from "./ui/button";

export interface RuleConditionDraft {
  field: string;
  operator: AutomationConditionOperator;
  value: string;
}

export interface RuleGroupDraft {
  conditions: RuleConditionDraft[];
}

const OPERATOR_LABELS: Record<AutomationConditionOperator, string> = {
  eq: "égal à",
  neq: "différent de",
  gt: "supérieur à",
  lt: "inférieur à",
  contains: "contient",
  is_set: "est renseigné",
};

const BASE_FIELDS: Record<CustomFieldEntityType, Array<{ value: string; label: string }>> = {
  contact: [
    { value: "first_name", label: "Prénom" },
    { value: "last_name", label: "Nom" },
    { value: "job_title", label: "Poste" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Téléphone" },
    { value: "linkedin_url", label: "URL LinkedIn" },
  ],
  company: [
    { value: "name", label: "Nom" },
    { value: "city", label: "Ville" },
    { value: "naf_label", label: "Secteur" },
    { value: "website", label: "Site web" },
  ],
  opportunity: [
    { value: "company_name", label: "Entreprise" },
    { value: "deal_value", label: "Montant" },
    { value: "status", label: "Statut" },
    { value: "probability", label: "Probabilité" },
  ],
};

function emptyCondition(defaultField: string): RuleConditionDraft {
  return { field: defaultField, operator: "eq", value: "" };
}

export interface RuleGroupsEditorProps {
  entityType: CustomFieldEntityType;
  clientId: string;
  groups: RuleGroupDraft[];
  onChange: (next: RuleGroupDraft[]) => void;
}

/**
 * Éditeur de critères à 2 niveaux — ET entre les conditions d'un groupe,
 * OU entre les groupes (modèle HubSpot) — pour les listes dynamiques
 * (S26). Distinct de `ConditionRowsEditor` (Automations, ET uniquement,
 * évalué côté serveur en plpgsql) pour ne pas casser son usage existant.
 * Le champ d'une condition est un menu déroulant (colonnes de base de
 * l'entité + champs personnalisés du client, tags/multiselect inclus)
 * plutôt qu'une saisie libre du nom de colonne.
 */
export function RuleGroupsEditor({ entityType, clientId, groups, onChange }: RuleGroupsEditorProps) {
  const { definitions } = useFieldDefinitions(entityType);
  const customFields = definitions.filter((d) => d.client_id === clientId);
  const baseFields = BASE_FIELDS[entityType];
  const defaultField = baseFields[0]?.value ?? "";

  function addGroup() {
    onChange([...groups, { conditions: [emptyCondition(defaultField)] }]);
  }

  function removeGroup(groupIndex: number) {
    onChange(groups.filter((_, i) => i !== groupIndex));
  }

  function addCondition(groupIndex: number) {
    onChange(groups.map((g, i) => (i === groupIndex ? { conditions: [...g.conditions, emptyCondition(defaultField)] } : g)));
  }

  function updateCondition(groupIndex: number, condIndex: number, patch: Partial<RuleConditionDraft>) {
    onChange(
      groups.map((g, i) =>
        i === groupIndex ? { conditions: g.conditions.map((c, j) => (j === condIndex ? { ...c, ...patch } : c)) } : g,
      ),
    );
  }

  function removeCondition(groupIndex: number, condIndex: number) {
    onChange(groups.map((g, i) => (i === groupIndex ? { conditions: g.conditions.filter((_, j) => j !== condIndex) } : g)));
  }

  return (
    <div className="space-y-2">
      {groups.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && <div className="my-2 text-center text-xs font-semibold text-muted-foreground">OU</div>}
          <div className="space-y-2 rounded-md border border-border p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Groupe {gi + 1} (toutes les conditions doivent être vraies)
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeGroup(gi)}>
                Supprimer le groupe
              </Button>
            </div>
            {group.conditions.map((cond, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <select
                  value={cond.field}
                  onChange={(e) => updateCondition(gi, ci, { field: e.target.value })}
                  className="flex-1 rounded-md border border-border px-2 py-1.5 text-sm"
                >
                  <optgroup label="Champs">
                    {baseFields.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                  {customFields.length > 0 && (
                    <optgroup label="Personnalisés">
                      {customFields.map((d) => (
                        <option key={d.field_key} value={d.field_key}>
                          {d.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <select
                  value={cond.operator}
                  onChange={(e) => updateCondition(gi, ci, { operator: e.target.value as AutomationConditionOperator })}
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
                    onChange={(e) => updateCondition(gi, ci, { value: e.target.value })}
                    placeholder="Valeur"
                    className="flex-1 rounded-md border border-border px-2 py-1.5 text-sm"
                  />
                )}
                <Button type="button" variant="ghost" size="sm" onClick={() => removeCondition(gi, ci)}>
                  ✕
                </Button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => addCondition(gi)}>
              + Condition (ET)
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addGroup}>
        + Groupe (OU)
      </Button>
    </div>
  );
}
