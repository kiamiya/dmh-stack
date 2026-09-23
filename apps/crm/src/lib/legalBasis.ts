import type { ContactLegalBasis } from "@dmh/types";

/**
 * S38-5 — bases juridiques RGPD proposées à l'import de contacts (reprises de
 * HubSpot, cf. CR du 17/09). En B2B, Delphine recommande "intérêt légitime —
 * prospect" par défaut ; le consentement explicite ne concerne en pratique
 * que le B2C, cas jugé peu probable pour DMH.
 */
export const LEGAL_BASIS_OPTIONS: Array<{ value: ContactLegalBasis; label: string }> = [
  { value: "legitimate_interest_prospect", label: "Intérêt légitime — prospect" },
  { value: "legitimate_interest_client", label: "Intérêt légitime — client existant" },
  { value: "legitimate_interest_other", label: "Intérêt légitime — autre" },
  { value: "contract", label: "Exécution d'un contrat" },
  { value: "consent", label: "Consentement explicite" },
  { value: "not_applicable", label: "Non applicable" },
];

export const DEFAULT_IMPORT_LEGAL_BASIS: ContactLegalBasis = "legitimate_interest_prospect";

/** Pure : libellé affichable (null = base juridique non renseignée). */
export function legalBasisLabel(value: ContactLegalBasis | null | undefined): string {
  if (!value) return "Non renseignée";
  return LEGAL_BASIS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Pure : parse une valeur libre (ex. <select>) en base juridique connue, ou null. */
export function parseLegalBasis(value: string): ContactLegalBasis | null {
  return LEGAL_BASIS_OPTIONS.some((o) => o.value === value) ? (value as ContactLegalBasis) : null;
}
