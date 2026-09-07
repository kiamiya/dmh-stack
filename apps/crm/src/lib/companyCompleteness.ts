export interface CompanyCompletenessFields {
  siren: string | null;
  naf_label: string | null;
  employee_range: string | null;
  revenue: number | null;
  city: string | null;
}

const COMPLETENESS_FIELDS: Array<keyof CompanyCompletenessFields> = ["siren", "naf_label", "employee_range", "revenue", "city"];

/**
 * Pure : % de champs Pappers réellement renseignés pour une entreprise
 * (siren/naf_label/employee_range/revenue/city — ce que la cascade
 * d'enrichissement peut effectivement remplir, `enrich-pappers`) — un
 * vrai ratio sur les colonnes en base, jamais une estimation.
 */
export function computeCompanyCompleteness(company: CompanyCompletenessFields): number {
  const filled = COMPLETENESS_FIELDS.filter((field) => company[field] !== null && company[field] !== undefined).length;
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}
