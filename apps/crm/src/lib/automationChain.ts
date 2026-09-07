import type { AutomationConditionOperator, AutomationTriggerType } from "@dmh/types";

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

/** Pure : libellé du bloc "action" — seul `create_task` existe côté moteur (migration 017). */
export function summarizeAction(actions: Array<{ action_type: string; action_config: Record<string, unknown> }>): string {
  const createTask = actions.find((a) => a.action_type === "create_task");
  if (!createTask) return "Aucune action";
  const title = typeof createTask.action_config.title === "string" ? createTask.action_config.title : "";
  return `Créer tâche : "${title}"`;
}
