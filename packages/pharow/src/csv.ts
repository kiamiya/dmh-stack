import { parse } from "csv-parse/sync";

/**
 * Une ligne du CSV Pharow, une fois les colonnes résolues (brief §1.2.1) :
 * prénom, nom, intitulé de poste, nom de l'entreprise, email professionnel
 * (parfois vide), URL LinkedIn, téléphone (parfois vide), ville, secteur.
 *
 * ATTENTION : aucun compte Pharow réel n'existe encore au moment d'écrire ce
 * module (voir `PROGRESS.md`), donc les noms d'en-têtes exacts d'un vrai
 * export n'ont pas pu être vérifiés — contrairement au mapping Pappers, qui
 * a été validé contre l'API réelle. La résolution des colonnes ci-dessous
 * est volontairement tolérante (plusieurs alias par champ, insensible à la
 * casse/aux accents) pour limiter le risque, mais DOIT être revalidée contre
 * un vrai export Pharow dès qu'un compte existe — voir TESTING.md.
 */
export interface PharowRow {
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  companyName: string;
  email: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  city: string | null;
  sector: string | null;
}

export class PharowCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PharowCsvError";
  }
}

type Field = keyof PharowRow;

const HEADER_ALIASES: Record<Field, string[]> = {
  firstName: ["prenom", "prénom", "first_name", "firstname"],
  lastName: ["nom", "last_name", "lastname"],
  jobTitle: ["intitule_poste", "poste", "job_title", "titre", "fonction"],
  companyName: ["nom_entreprise", "entreprise", "company", "company_name", "societe", "société"],
  email: ["email_professionnel", "email", "e-mail", "mail"],
  linkedinUrl: ["url_linkedin", "linkedin", "profil_linkedin", "linkedin_url"],
  phone: ["numero_telephone", "telephone", "téléphone", "phone", "tel"],
  city: ["ville", "city"],
  sector: ["secteur", "sector"],
};

const REQUIRED_FIELDS: Field[] = ["firstName", "lastName", "companyName"];

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
}

/**
 * Parse un export CSV Pharow en `PharowRow[]`. Lève `PharowCsvError` si une
 * colonne requise (prénom/nom/entreprise) est absente de l'en-tête, ou si
 * une ligne a l'un de ces champs vide.
 */
export function parsePharowCsv(content: string): PharowRow[] {
  const records: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) return [];

  const rawHeaders = Object.keys(records[0]);
  const normalizedToRaw = new Map(rawHeaders.map((h) => [normalizeHeader(h), h]));

  const columnFor = Object.fromEntries(
    (Object.keys(HEADER_ALIASES) as Field[]).map((field) => {
      const match = HEADER_ALIASES[field]
        .map((alias) => normalizedToRaw.get(normalizeHeader(alias)))
        .find((raw) => raw !== undefined);
      return [field, match];
    }),
  ) as Record<Field, string | undefined>;

  const missingRequired = REQUIRED_FIELDS.filter((field) => !columnFor[field]);
  if (missingRequired.length > 0) {
    throw new PharowCsvError(
      `Colonnes requises manquantes dans le CSV : ${missingRequired.join(", ")}`,
    );
  }

  return records.map((record, index) => {
    const get = (col: string | undefined): string | null => {
      if (!col) return null;
      const value = record[col]?.trim();
      return value ? value : null;
    };

    const firstName = get(columnFor.firstName);
    const lastName = get(columnFor.lastName);
    const companyName = get(columnFor.companyName);

    if (!firstName || !lastName || !companyName) {
      throw new PharowCsvError(
        `Ligne ${index + 2} du CSV : prénom, nom et entreprise sont requis`,
      );
    }

    return {
      firstName,
      lastName,
      companyName,
      jobTitle: get(columnFor.jobTitle),
      email: get(columnFor.email),
      linkedinUrl: get(columnFor.linkedinUrl),
      phone: get(columnFor.phone),
      city: get(columnFor.city),
      sector: get(columnFor.sector),
    };
  });
}
