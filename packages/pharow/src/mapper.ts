import type { PharowRow } from "./csv.js";

/**
 * Champs `companies` alimentés par une ligne Pharow. `naf_label` reçoit le
 * "secteur" brut de Pharow à titre provisoire — la table n'a pas de colonne
 * dédiée pour ce champ, et il sera de toute façon écrasé par la vraie
 * valeur (issue du code NAF) dès que l'enrichissement Pappers tourne sur ce
 * prospect. `address`/`siren`/`naf_code`/etc. restent `null` : ce sont des
 * champs que seul Pappers peut remplir.
 */
export interface CompanyInsert {
  name: string;
  city: string | null;
  naf_label: string | null;
}

/** Champs `contacts` alimentés par une ligne Pharow. */
export interface ContactInsert {
  first_name: string;
  last_name: string;
  job_title: string | null;
  email: string | null;
  linkedin_url: string | null;
  phone: string | null;
  data_source: "pharow";
}

export function mapPharowRow(row: PharowRow): { company: CompanyInsert; contact: ContactInsert } {
  return {
    company: {
      name: row.companyName,
      city: row.city,
      naf_label: row.sector,
    },
    contact: {
      first_name: row.firstName,
      last_name: row.lastName,
      job_title: row.jobTitle,
      email: row.email,
      linkedin_url: row.linkedinUrl,
      phone: row.phone,
      data_source: "pharow",
    },
  };
}
