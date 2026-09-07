import type { ProspectStatus } from "@dmh/types";

export interface CascadeStep {
  order: number;
  provider: string;
  /** Donnée utilisée pour appeler le fournisseur (brief §1.3.1). */
  trigger: string;
  /** Colonnes réellement écrites par la fonction — reflet exact d'`enrich-pappers`/`enrich-dropcontact`, pas une liste indicative. */
  targetFields: string[];
  /** Statut prospect atteint une fois cette étape réussie. */
  status: ProspectStatus;
}

/**
 * Cascade réelle du pipeline d'enrichissement (brief §1.3.1, S2/S3) —
 * fixe et codée en dur dans les Edge Functions `enrich-pappers`/
 * `enrich-dropcontact`, PAS un mapping configurable par fournisseur/champ
 * (contrairement au mockup) : décision prise avec Loïc de garder cette
 * étape en lecture seule tant qu'un vrai besoin de configurabilité n'est
 * pas exprimé, pour ne pas toucher au pipeline de prod sans raison.
 */
export const ENRICHMENT_CASCADE: CascadeStep[] = [
  {
    order: 1,
    provider: "Pappers",
    trigger: "SIREN ou raison sociale",
    targetFields: [
      "name",
      "siren",
      "naf_code",
      "naf_label",
      "legal_form",
      "employee_range",
      "revenue",
      "revenue_year",
      "city",
      "address",
      "website",
      "creation_date",
    ],
    status: "enriched_pappers",
  },
  {
    order: 2,
    provider: "Dropcontact",
    trigger: "Nom + prénom + entreprise",
    targetFields: ["email", "email_confidence"],
    status: "enriched_contact",
  },
];

export interface CascadeStepCount {
  order: number;
  provider: string;
  status: ProspectStatus;
  count: number;
}

/**
 * Pure : nombre de prospects actuellement dans le statut de chaque étape
 * — un comptage réel par statut courant, jamais un chiffre inventé.
 */
export function computeCascadeStepCounts(
  prospects: Array<{ status: ProspectStatus }>,
  cascade: CascadeStep[] = ENRICHMENT_CASCADE,
): CascadeStepCount[] {
  return cascade.map((step) => ({
    order: step.order,
    provider: step.provider,
    status: step.status,
    count: prospects.filter((p) => p.status === step.status).length,
  }));
}
