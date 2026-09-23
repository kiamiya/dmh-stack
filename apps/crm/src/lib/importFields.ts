import { toCsv } from "./csv";
import type { ImportField } from "./importColumnMapping";

/**
 * S38-4 — champs standards de l'import CSV, groupés comme dans HubSpot entre
 * propriétés du contact et propriétés de l'entreprise (retour de Delphine du
 * 17/09 : la distinction doit être visible au mapping).
 */
export type ImportEntityType = "contact" | "company";
export type ImportFieldGroup = "contact" | "company";

export interface ImportFieldDefinition {
  key: ImportField;
  label: string;
  required: boolean;
  group: ImportFieldGroup;
  /** Valeur d'exemple du modèle CSV téléchargeable. */
  example: string;
}

export const CONTACT_IMPORT_FIELDS: ImportFieldDefinition[] = [
  { key: "firstName", label: "Prénom", required: true, group: "contact", example: "Alice" },
  { key: "lastName", label: "Nom", required: true, group: "contact", example: "Martin" },
  { key: "jobTitle", label: "Poste", required: false, group: "contact", example: "Directrice des achats" },
  { key: "email", label: "Email", required: false, group: "contact", example: "alice.martin@exemple.fr" },
  { key: "linkedinUrl", label: "URL LinkedIn", required: false, group: "contact", example: "https://www.linkedin.com/in/alice-martin" },
  { key: "companyName", label: "Entreprise", required: true, group: "company", example: "Exemple Industrie SAS" },
];

export const COMPANY_IMPORT_FIELDS: ImportFieldDefinition[] = [
  { key: "name", label: "Nom de l'entreprise", required: true, group: "company", example: "Exemple Industrie SAS" },
  { key: "city", label: "Ville", required: false, group: "company", example: "Lyon" },
  { key: "website", label: "Site web", required: false, group: "company", example: "https://exemple.fr" },
];

export const IMPORT_FIELD_GROUP_LABEL: Record<ImportFieldGroup, string> = {
  contact: "Propriétés du contact",
  company: "Propriétés de l'entreprise",
};

export function importFieldsFor(entityType: ImportEntityType): ImportFieldDefinition[] {
  return entityType === "contact" ? CONTACT_IMPORT_FIELDS : COMPANY_IMPORT_FIELDS;
}

/** Pure : champs regroupés par groupe, dans l'ordre d'apparition (groupes vides omis). */
export function groupImportFields(fields: ImportFieldDefinition[]): Array<{ group: ImportFieldGroup; fields: ImportFieldDefinition[] }> {
  const groups: Array<{ group: ImportFieldGroup; fields: ImportFieldDefinition[] }> = [];
  for (const field of fields) {
    let entry = groups.find((g) => g.group === field.group);
    if (!entry) {
      entry = { group: field.group, fields: [] };
      groups.push(entry);
    }
    entry.fields.push(field);
  }
  return groups;
}

/** Pure : contenu du modèle CSV téléchargeable (en-têtes = libellés reconnus automatiquement au mapping + une ligne d'exemple). */
export function buildImportTemplateCsv(entityType: ImportEntityType): string {
  const fields = importFieldsFor(entityType);
  return toCsv(
    [fields],
    fields.map((f) => ({ header: f.label, value: () => f.example })),
  );
}

export type ImportColumnStatus =
  | { column: string; status: "mapped"; fieldLabel: string }
  | { column: string; status: "unmapped" };

/** Pure : statut de chaque colonne du fichier — rattachée à un champ standard, ou à traiter (assistant des colonnes non reconnues). */
export function describeImportColumns(
  columns: string[],
  mapping: Record<string, string>,
  fields: ImportFieldDefinition[],
): ImportColumnStatus[] {
  const labelByColumn = new Map<string, string>();
  for (const field of fields) {
    const column = mapping[field.key];
    if (column && !labelByColumn.has(column)) labelByColumn.set(column, field.label);
  }
  return columns.map((column) => {
    const fieldLabel = labelByColumn.get(column);
    return fieldLabel ? { column, status: "mapped", fieldLabel } : { column, status: "unmapped" };
  });
}
