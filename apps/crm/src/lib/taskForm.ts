export interface TaskFormInput {
  title: string;
}

/** Pure : valide le formulaire "Ajouter une tâche" — seul le titre est requis, tout le reste est optionnel. */
export function validateTaskForm({ title }: TaskFormInput): string | null {
  if (!title.trim()) return "Le titre est requis.";
  return null;
}
