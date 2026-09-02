import type { AutomationEntityType, AutomationTriggerType } from "@dmh/types";

export interface AutomationRuleFormInput {
  name: string;
  entityType: AutomationEntityType;
  triggerType: AutomationTriggerType;
}

/** Pure : valide le formulaire "Ajouter une règle" — le déclencheur "changement d'étape" n'existe que pour les opportunités. */
export function validateAutomationRuleForm({ name, entityType, triggerType }: AutomationRuleFormInput): string | null {
  if (!name.trim()) return "Le nom de la règle est requis.";
  if (triggerType === "stage_changed" && entityType !== "opportunity") {
    return "Le déclencheur \"changement d'étape\" n'est disponible que pour les opportunités.";
  }
  return null;
}
