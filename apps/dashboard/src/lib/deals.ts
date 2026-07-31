export interface DealFormInput {
  companyName: string;
  dealValue: string;
  signedAt: string;
}

/** Pure : valide le formulaire "Déclarer un deal signé". Retourne un message d'erreur FR, ou `null` si valide. */
export function validateDealForm({ companyName, dealValue, signedAt }: DealFormInput): string | null {
  if (!companyName.trim()) return "Le nom de l'entreprise est requis.";

  const value = Number(dealValue);
  if (!dealValue.trim() || Number.isNaN(value) || value <= 0) {
    return "Le montant doit être un nombre supérieur à 0.";
  }

  if (!signedAt.trim()) return "La date de signature est requise.";
  if (Number.isNaN(new Date(signedAt).getTime())) return "La date de signature est invalide.";
  if (new Date(signedAt).getTime() > Date.now()) {
    return "La date de signature ne peut pas être dans le futur.";
  }

  return null;
}

/** Pure : formate un montant en euros (locale fr-FR). */
export function formatCurrency(amount: number | null): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}
