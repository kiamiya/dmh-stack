export interface DealFormInput {
  companyName: string;
  dealValue: string;
  signedAt: string;
}

/**
 * Pure : valide le formulaire "Ajouter une opportunité". `signedAt` est
 * optionnel (une opportunité en négociation n'a pas encore de date de
 * signature) — contrairement à `apps/dashboard/src/lib/deals.ts` où
 * déclarer un deal signifie toujours qu'il est déjà `won`.
 */
export function validateDealForm({ companyName, dealValue, signedAt }: DealFormInput): string | null {
  if (!companyName.trim()) return "Le nom de l'entreprise est requis.";

  const value = Number(dealValue);
  if (!dealValue.trim() || Number.isNaN(value) || value <= 0) {
    return "Le montant doit être un nombre supérieur à 0.";
  }

  if (signedAt.trim()) {
    if (Number.isNaN(new Date(signedAt).getTime())) return "La date de signature est invalide.";
    if (new Date(signedAt).getTime() > Date.now()) {
      return "La date de signature ne peut pas être dans le futur.";
    }
  }

  return null;
}
