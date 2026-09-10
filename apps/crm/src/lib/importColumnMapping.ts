export type ImportField =
  | "firstName"
  | "lastName"
  | "companyName"
  | "jobTitle"
  | "email"
  | "linkedinUrl"
  | "name"
  | "city"
  | "website";

const ALIASES: Record<ImportField, string[]> = {
  firstName: ["prenom", "first name", "firstname"],
  lastName: ["nom de famille", "last name", "lastname", "surname", "nom"],
  companyName: ["entreprise", "societe", "company name", "company"],
  jobTitle: ["poste", "fonction", "job title", "title"],
  email: ["email", "e-mail", "mail"],
  linkedinUrl: ["linkedin"],
  name: ["nom de l'entreprise", "entreprise", "societe", "company name", "company", "nom"],
  city: ["ville", "city"],
  website: ["site web", "website", "site", "url"],
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Pure : suggère automatiquement quelle colonne du CSV correspond à un champ
 * cible donné — l'utilisateur peut toujours corriger la suggestion
 * manuellement. Deux passes pour éviter les faux positifs entre alias
 * génériques qui se chevauchent (ex. "Nom" vs "Nom de l'entreprise" pour un
 * import de contacts) : correspondance exacte d'abord, sous-chaîne en repli
 * seulement si aucune colonne ne correspond exactement. Retourne "" si
 * aucune colonne ne correspond (pas de correspondance forcée).
 */
export function autoDetectColumn(columns: string[], field: ImportField): string {
  const aliases = ALIASES[field].map(normalize);
  const exactMatch = columns.find((column) => aliases.includes(normalize(column)));
  if (exactMatch) return exactMatch;

  const partialMatch = columns.find((column) => {
    const normalized = normalize(column);
    return aliases.some((alias) => normalized.includes(alias));
  });
  return partialMatch ?? "";
}
