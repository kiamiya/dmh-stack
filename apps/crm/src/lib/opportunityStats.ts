import type { DealStatus } from "../services/deals";

export interface PipelineValueRow {
  status: DealStatus;
  label: string;
  count: number;
  totalValue: number;
}

const STATUS_LABELS: Record<DealStatus, string> = {
  negotiation: "En négociation",
  won: "Gagnées",
  lost: "Perdues",
};

/** Pure : nombre + valeur cumulée d'opportunités par statut, tous clients confondus. */
export function computePipelineValueByStatus(deals: Array<{ status: DealStatus; deal_value: number }>): PipelineValueRow[] {
  return (Object.keys(STATUS_LABELS) as DealStatus[]).map((status) => {
    const matching = deals.filter((d) => d.status === status);
    return {
      status,
      label: STATUS_LABELS[status],
      count: matching.length,
      totalValue: matching.reduce((sum, d) => sum + d.deal_value, 0),
    };
  });
}

/**
 * Pure : valeur pondérée du pipeline en cours — somme de `deal_value *
 * probability / 100` pour les opportunités encore `negotiation`
 * uniquement (une opportunité close a déjà une issue, pas une
 * probabilité à pondérer). Une opportunité sans `probability` renseignée
 * compte pour 0 (jamais une probabilité par défaut inventée).
 */
export function computeWeightedPipelineValue(
  deals: Array<{ status: DealStatus; deal_value: number; probability: number | null }>,
): number {
  return deals
    .filter((d) => d.status === "negotiation")
    .reduce((sum, d) => sum + (d.deal_value * (d.probability ?? 0)) / 100, 0);
}

/**
 * Pure : taux de conversion en % parmi les opportunités déjà closes
 * (gagnées ou perdues) — les opportunités encore en négociation ne
 * comptent pas, elles n'ont pas encore d'issue. Retourne 0 si aucune
 * opportunité n'est close.
 */
export function computeConversionRate(deals: Array<{ status: DealStatus }>): number {
  const closed = deals.filter((d) => d.status === "won" || d.status === "lost");
  if (closed.length === 0) return 0;
  const won = closed.filter((d) => d.status === "won").length;
  return Math.round((won / closed.length) * 100);
}
