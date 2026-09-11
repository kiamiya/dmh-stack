import type { TaskRow } from "../services/tasks";
import { getDealDisplayName } from "./deals";

export interface TaskRelatedLink {
  label: string;
  to: string;
}

/** Pure : lien vers la fiche liée à une tâche (contact/entreprise/opportunité) — `null` si aucune, jamais les trois à la fois en pratique mais l'ordre reflète la priorité d'affichage. */
export function taskRelatedLink(task: TaskRow): TaskRelatedLink | null {
  if (task.contacts && task.contact_id) return { label: `${task.contacts.first_name} ${task.contacts.last_name}`, to: `/contacts/${task.contact_id}` };
  if (task.companies && task.company_id) return { label: task.companies.name, to: `/companies/${task.company_id}` };
  if (task.deals && task.deal_id) return { label: getDealDisplayName(task.deals), to: `/opportunities/${task.deal_id}` };
  return null;
}
