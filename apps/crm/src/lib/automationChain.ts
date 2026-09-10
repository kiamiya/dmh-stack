import type { AutomationActionBranch, AutomationConditionOperator, AutomationTriggerType } from "@dmh/types";

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  record_created: "À la création",
  stage_changed: "Au changement d'étape",
};

const OPERATOR_LABELS: Record<AutomationConditionOperator, string> = {
  eq: "=",
  neq: "≠",
  gt: ">",
  lt: "<",
  contains: "contient",
  is_set: "est renseigné",
  is_not_set: "n'est pas renseigné",
};

/** Pure : libellé du bloc "déclencheur" de la chaîne visuelle. */
export function summarizeTrigger(triggerType: AutomationTriggerType): string {
  return TRIGGER_LABELS[triggerType];
}

/** Pure : libellé du bloc "conditions" — une ligne par condition, combinées en ET (seule combinaison supportée par le moteur, migration 017). */
export function summarizeConditions(conditions: Array<{ field: string; operator: AutomationConditionOperator; value: unknown }>): string {
  if (conditions.length === 0) return "Aucune condition";
  return conditions
    .map((c) => (c.operator === "is_set" ? `${c.field} ${OPERATOR_LABELS.is_set}` : `${c.field} ${OPERATOR_LABELS[c.operator]} ${String(c.value)}`))
    .join(" ET ");
}

const PROVIDER_LABELS: Record<string, string> = {
  pappers: "Pappers",
  dropcontact: "Dropcontact",
};

/** Pure : libellé du bloc "action" d'une branche — `create_task` (migration 017) ou `trigger_enrichment` (migration 030). */
export function summarizeAction(actions: Array<{ action_type: string; action_config: Record<string, unknown> }>): string {
  const createTask = actions.find((a) => a.action_type === "create_task");
  if (createTask) {
    const title = typeof createTask.action_config.title === "string" ? createTask.action_config.title : "";
    return `Créer tâche : "${title}"`;
  }
  const enrich = actions.find((a) => a.action_type === "trigger_enrichment");
  if (enrich) {
    const provider = typeof enrich.action_config.provider === "string" ? enrich.action_config.provider : "";
    return `Enrichir via ${PROVIDER_LABELS[provider] ?? (provider || "?")}`;
  }
  return "Aucune action";
}

export interface BranchedActions<T> {
  always: T[];
  ifTrue: T[];
  ifFalse: T[];
}

/** Pure : répartit les actions d'une règle par branche (migration 030 — `always` par défaut, rétro-compatible avec les règles créées avant les branches Oui/Non). */
export function splitActionsByBranch<T extends { branch: AutomationActionBranch }>(actions: T[]): BranchedActions<T> {
  return {
    always: actions.filter((a) => a.branch === "always"),
    ifTrue: actions.filter((a) => a.branch === "if_true"),
    ifFalse: actions.filter((a) => a.branch === "if_false"),
  };
}
