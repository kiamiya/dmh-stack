/**
 * Champs extraits de la réponse Pappers vers des colonnes dédiées de la
 * table `companies` (voir supabase/migrations/001_initial_schema.sql).
 * Le JSON brut complet est de toute façon stocké tel quel dans
 * `companies.pappers_data` — ce mapping est un confort de requêtage, pas
 * la seule source de vérité.
 *
 * Validé le 2026-07-30 contre un vrai appel API (SIREN 356000000, La Poste,
 * via `pnpm run check-pappers -- 356000000`) : `tranche_effectif` est un
 * code interne ("53"), pas le libellé humain — le bon champ est `effectif`
 * (sur `siege`, ex. "Entre 2 000 et 4 999 salariés"). Le chiffre d'affaires
 * n'est pas un champ racine mais vit dans le tableau `finances` (une entrée
 * par exercice, avec `annee` et `chiffre_affaires`) — on prend l'exercice le
 * plus récent. Le champ site web s'appelle `website` (anglais), pas
 * `site_web`.
 */
export interface CompanyEnrichmentFields {
  name: string | null;
  siren: string | null;
  nafCode: string | null;
  nafLabel: string | null;
  legalForm: string | null;
  employeeRange: string | null;
  revenue: number | null;
  revenueYear: number | null;
  city: string | null;
  address: string | null;
  website: string | null;
  creationDate: string | null;
}

interface PappersSiege {
  adresse_ligne_1?: string;
  ville?: string;
  code_postal?: string;
  effectif?: string;
}

interface PappersFinances {
  annee?: number;
  chiffre_affaires?: number;
}

export interface PappersCompanyResponse {
  nom_entreprise?: string;
  denomination?: string;
  siren?: string;
  forme_juridique?: string;
  code_naf?: string;
  libelle_code_naf?: string;
  effectif?: string;
  date_creation?: string;
  website?: string;
  siege?: PappersSiege;
  ville?: string;
  adresse?: string;
  finances?: PappersFinances[];
  [key: string]: unknown;
}

function latestFinances(finances: PappersFinances[] | undefined): PappersFinances | null {
  if (!Array.isArray(finances) || finances.length === 0) return null;
  return finances.reduce((latest, entry) =>
    typeof entry.annee === "number" && (latest.annee === undefined || entry.annee > (latest.annee ?? -Infinity))
      ? entry
      : latest,
  );
}

/**
 * Mapping défensif : ne lève jamais, retourne `null` pour tout champ
 * absent ou de forme inattendue plutôt que de planter le pipeline
 * d'enrichissement sur une réponse Pappers partielle ou différente de ce
 * qui est documenté.
 */
export function mapPappersCompany(raw: unknown): CompanyEnrichmentFields {
  const data = (raw ?? {}) as PappersCompanyResponse;

  const siege = typeof data.siege === "object" && data.siege !== null ? data.siege : undefined;
  const finances = latestFinances(data.finances);

  return {
    name: data.nom_entreprise ?? data.denomination ?? null,
    siren: data.siren ?? null,
    nafCode: data.code_naf ?? null,
    nafLabel: data.libelle_code_naf ?? null,
    legalForm: data.forme_juridique ?? null,
    employeeRange: siege?.effectif ?? data.effectif ?? null,
    revenue: typeof finances?.chiffre_affaires === "number" ? finances.chiffre_affaires : null,
    revenueYear: typeof finances?.annee === "number" ? finances.annee : null,
    city: siege?.ville ?? data.ville ?? null,
    address: siege?.adresse_ligne_1 ?? data.adresse ?? null,
    website: data.website ?? null,
    creationDate: data.date_creation ?? null,
  };
}

/**
 * Nombre de mois entiers entre une date de prise de poste et `now`.
 * Retourne `null` si `appointmentDate` est absent ou invalide.
 *
 * Utilisé par le scoring IA (brief §1.3.5 : dirigeant nommé depuis moins de
 * 12 mois = signal positif fort) — cette fonction est volontairement pure
 * (pas de `new Date()` interne) pour rester testable de façon déterministe.
 */
export function calculateMonthsInRole(
  appointmentDate: string | null | undefined,
  now: Date,
): number | null {
  if (!appointmentDate) return null;

  const appointed = new Date(appointmentDate);
  if (Number.isNaN(appointed.getTime())) return null;

  const months =
    (now.getUTCFullYear() - appointed.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - appointed.getUTCMonth()) -
    (now.getUTCDate() < appointed.getUTCDate() ? 1 : 0);

  return Math.max(0, months);
}
