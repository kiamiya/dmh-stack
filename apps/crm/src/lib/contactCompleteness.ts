export interface ContactCompletenessFields {
  job_title: string | null;
  email: string | null;
  linkedin_url: string | null;
}

const COMPLETENESS_FIELDS: Array<keyof ContactCompletenessFields> = ["job_title", "email", "linkedin_url"];

/**
 * Pure : % de champs réellement renseignés pour un contact (poste/email/
 * URL LinkedIn — les champs que la cascade d'enrichissement peut
 * effectivement remplir) — un vrai ratio sur les colonnes en base, jamais
 * une estimation. Même principe que `companyCompleteness.ts`.
 */
export function computeContactCompleteness(contact: ContactCompletenessFields): number {
  const filled = COMPLETENESS_FIELDS.filter((field) => contact[field] !== null && contact[field] !== undefined).length;
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}
