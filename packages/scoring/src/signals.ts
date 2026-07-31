import { calculateMonthsInRole } from "@dmh/pappers";

/**
 * Champs bruts de la réponse Pappers utiles au scoring, absents du mapping
 * structuré de `@dmh/pappers` (`mapPappersCompany` ne garde que le CA le
 * plus récent, pas l'historique complet, et ne conserve pas `representants`
 * du tout). Vérifié contre la vraie réponse déjà stockée en base pour PM
 * MECANIQUE INDUSTRIE (SIREN 481838852) le 2026-07-31.
 */
interface RawRepresentant {
  nom_complet?: string;
  qualite?: string;
  date_prise_de_poste?: string;
}

interface RawFinance {
  annee?: number;
  chiffre_affaires?: number;
  /** Déjà calculé par Pappers — pas besoin de le recalculer nous-mêmes. */
  taux_croissance_chiffre_affaires?: number;
}

interface RawPappersScoringData {
  representants?: RawRepresentant[];
  finances?: RawFinance[];
}

export interface Representative {
  fullName: string;
  title: string | null;
  monthsInRole: number | null;
}

export interface FinanceYear {
  year: number;
  revenue: number | null;
  /** Pourcentage, tel que renvoyé par Pappers (`taux_croissance_chiffre_affaires`). */
  growthRate: number | null;
}

export interface ScoringSignals {
  representatives: Representative[];
  /** Les 3 exercices les plus récents disponibles, du plus récent au plus ancien. */
  financeHistory: FinanceYear[];
}

/**
 * Extrait du JSON brut Pappers (`companies.pappers_data`) les signaux
 * nécessaires au scoring (brief §1.3.5) : dirigeants (nom, fonction,
 * ancienneté) et historique du CA. Défensif comme `mapPappersCompany` —
 * ne lève jamais, retourne des tableaux vides pour toute forme inattendue.
 */
export function extractScoringSignals(rawPappersData: unknown, now: Date): ScoringSignals {
  const data = (rawPappersData ?? {}) as RawPappersScoringData;

  const representatives = Array.isArray(data.representants)
    ? data.representants.map((r) => ({
        fullName: r.nom_complet ?? "?",
        title: r.qualite ?? null,
        monthsInRole: calculateMonthsInRole(r.date_prise_de_poste, now),
      }))
    : [];

  const financeHistory: FinanceYear[] = Array.isArray(data.finances)
    ? data.finances
        .filter((f): f is RawFinance & { annee: number } => typeof f.annee === "number")
        .sort((a, b) => b.annee - a.annee)
        .slice(0, 3)
        .map((f) => ({
          year: f.annee,
          revenue: typeof f.chiffre_affaires === "number" ? f.chiffre_affaires : null,
          growthRate:
            typeof f.taux_croissance_chiffre_affaires === "number"
              ? f.taux_croissance_chiffre_affaires
              : null,
        }))
    : [];

  return { representatives, financeHistory };
}
