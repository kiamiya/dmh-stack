import type { AutomationEntityType, AutomationTriggerType } from "@dmh/types";

export interface AutomationRuleFormInput {
  name: string;
  entityType: AutomationEntityType;
  triggerType: AutomationTriggerType;
}

/** Pure : valide le formulaire "Ajouter une règle" — "changement d'étape" n'existe que pour les opportunités, "changement de statut" que pour les prospects (S38-10). */
export function validateAutomationRuleForm({ name, entityType, triggerType }: AutomationRuleFormInput): string | null {
  if (!name.trim()) return "Le nom de la règle est requis.";
  if (triggerType === "stage_changed" && entityType !== "opportunity") {
    return "Le déclencheur \"changement d'étape\" n'est disponible que pour les opportunités.";
  }
  if (triggerType === "status_changed" && entityType !== "prospect") {
    return "Le déclencheur \"changement de statut\" n'est disponible que pour les prospects.";
  }
  return null;
}
