/**
 * Champs extraits de la réponse Pappers vers des colonnes dédiées de la
 * table `companies` (voir supabase/migrations/001_initial_schema.sql).
 * Le JSON brut complet est de toute façon stocké tel quel dans
 * `companies.pappers_data` — ce mapping est un confort de requêtage, pas
 * la seule source de vérité.
 *
 * ATTENTION : les noms de champs ci-dessous (`nom_entreprise`, `siege`,
 * `tranche_effectif`, etc.) sont basés sur la documentation publique et des
 * intégrations tierces de l'API Pappers v2 — la documentation officielle
 * (pappers.fr/api/documentation) a renvoyé une erreur 403 à la récupération
 * automatique au moment d'écrire ce module. Le mapping est donc défensif
 * (aucun champ requis, tout est optionnel) et DOIT être validé contre un
 * vrai appel API avant mise en production — voir TESTING.md.
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
}

export interface PappersCompanyResponse {
  nom_entreprise?: string;
  denomination?: string;
  siren?: string;
  forme_juridique?: string;
  code_naf?: string;
  libelle_code_naf?: string;
  tranche_effectif?: string;
  date_creation?: string;
  chiffre_affaires?: number;
  site_web?: string;
  siege?: PappersSiege;
  ville?: string;
  adresse?: string;
  [key: string]: unknown;
}

function currentYear(now: Date): number {
  return now.getUTCFullYear();
}

/**
 * Mapping défensif : ne lève jamais, retourne `null` pour tout champ
 * absent ou de forme inattendue plutôt que de planter le pipeline
 * d'enrichissement sur une réponse Pappers partielle ou différente de ce
 * qui est documenté.
 */
export function mapPappersCompany(
  raw: unknown,
  now: Date,
): CompanyEnrichmentFields {
  const data = (raw ?? {}) as PappersCompanyResponse;

  const siege = typeof data.siege === "object" && data.siege !== null ? data.siege : undefined;

  return {
    name: data.nom_entreprise ?? data.denomination ?? null,
    siren: data.siren ?? null,
    nafCode: data.code_naf ?? null,
    nafLabel: data.libelle_code_naf ?? null,
    legalForm: data.forme_juridique ?? null,
    employeeRange: data.tranche_effectif ?? null,
    revenue: typeof data.chiffre_affaires === "number" ? data.chiffre_affaires : null,
    revenueYear: typeof data.chiffre_affaires === "number" ? currentYear(now) : null,
    city: siege?.ville ?? data.ville ?? null,
    address: siege?.adresse_ligne_1 ?? data.adresse ?? null,
    website: data.site_web ?? null,
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
