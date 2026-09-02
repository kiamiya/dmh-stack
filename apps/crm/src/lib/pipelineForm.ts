export interface StageFormInput {
  name: string;
  existingNames: string[];
}

/** Pure : valide le formulaire "Ajouter une étape". Retourne un message d'erreur FR, ou `null` si valide. */
export function validateStageForm({ name, existingNames }: StageFormInput): string | null {
  if (!name.trim()) return "Le nom de l'étape est requis.";
  if (existingNames.some((n) => n.toLowerCase() === name.trim().toLowerCase())) {
    return "Une étape avec ce nom existe déjà dans ce pipeline.";
  }
  return null;
}
