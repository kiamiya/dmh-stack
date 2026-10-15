import type { AutomationActionBranch, AutomationConditionOperator, AutomationEnrichmentProvider, AutomationTriggerType, ProspectStatus } from "@dmh/types";
import { ALL_PROSPECT_STATUSES, getStatusLabel } from "./status";

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  record_created: "À la création",
  stage_changed: "Au changement d'étape",
  status_changed: "Au changement de statut",
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
export function summarizeTrigger(triggerType: AutomationTriggerType, triggerConfig: Record<string, unknown> = {}): string {
  const toStatus = triggerConfig.to_status;
  if (triggerType === "status_changed" && typeof toStatus === "string" && ALL_PROSPECT_STATUSES.includes(toStatus as ProspectStatus)) {
    return `Quand le statut passe à "${getStatusLabel(toStatus as ProspectStatus)}"`;
  }
  return TRIGGER_LABELS[triggerType];
}

/** Pure : libellé du bloc "conditions" — une ligne par condition, combinées en ET (seule combinaison supportée par le moteur, migration 017). */
export function summarizeConditions(conditions: Array<{ field: string; operator: AutomationConditionOperator; value: unknown }>): string {
  if (conditions.length === 0) return "Aucune condition";
  return conditions
    .map((c) => (c.operator === "is_set" ? `${c.field} ${OPERATOR_LABELS.is_set}` : `${c.field} ${OPERATOR_LABELS[c.operator]} ${String(c.value)}`))
    .join(" ET ");
}

const TASK_TYPE_LABELS: Record<string, string> = { call: "Appel", email: "Email", meeting: "RDV", data: "Donnée" };

const PROVIDER_LABELS: Record<AutomationEnrichmentProvider, string> = {
  pappers: "Enrichir via Pappers",
  dropcontact: "Enrichir via Dropcontact",
  score: "Scorer (IA)",
  messages: "Générer les messages",
};

/** Ordre et libellés des fournisseurs proposés dans le formulaire de l'action "Enrichir". */
export const ENRICHMENT_PROVIDER_OPTIONS: Array<{ value: AutomationEnrichmentProvider; label: string }> = (
  ["pappers", "dropcontact", "score", "messages"] as const
).map((value) => ({ value, label: PROVIDER_LABELS[value] }));

/** Pure : libellé du bloc "action" d'une branche — `create_task` (migration 017) ou `trigger_enrichment` (migration 030). */
export function summarizeAction(actions: Array<{ action_type: string; action_config: Record<string, unknown> }>): string {
  const createTask = actions.find((a) => a.action_type === "create_task");
  if (createTask) {
    const title = typeof createTask.action_config.title === "string" ? createTask.action_config.title : "";
    const typeLabel = TASK_TYPE_LABELS[String(createTask.action_config.task_type)];
    return typeLabel ? `Créer tâche (${typeLabel}) : "${title}"` : `Créer tâche : "${title}"`;
  }
  const enrichments = actions.filter((a) => a.action_type === "trigger_enrichment");
  if (enrichments.length > 0) {
    return enrichments
      .map((a) => {
        const provider = typeof a.action_config.provider === "string" ? a.action_config.provider : "";
        return PROVIDER_LABELS[provider as AutomationEnrichmentProvider] ?? `Enrichir via ${provider || "?"}`;
      })
      .join(" + ");
  }
  return "Aucune action";
}

/** Pure : règle du pipeline d'enrichissement par défaut (migration 052) — désactivable mais jamais supprimable. */
export function isSystemRule(rule: { system_key?: string | null }): boolean {
  return typeof rule.system_key === "string" && rule.system_key.length > 0;
}

/** Pure : règles système d'abord (ordre du pipeline : leur nom commence par "Pipeline · n."), puis les autres dans l'ordre reçu. */
export function sortRulesSystemFirst<T extends { name: string; system_key?: string | null }>(rules: T[]): T[] {
  const system = rules.filter(isSystemRule).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return [...system, ...rules.filter((r) => !isSystemRule(r))];
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
