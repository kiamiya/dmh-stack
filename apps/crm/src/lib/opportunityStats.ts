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
 * Pure : valeur pondérée d'UNE opportunité (colonne "Pondéré" du mockup
 * Pipeline) — `null` pour une opportunité déjà close (gagnée/perdue),
 * même logique d'exclusion que `computeWeightedPipelineValue`.
 */
export function computeDealWeightedValue(deal: { status: DealStatus; deal_value: number; probability: number | null }): number | null {
  if (deal.status !== "negotiation") return null;
  return (deal.deal_value * (deal.probability ?? 0)) / 100;
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

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Pure : ancienneté en jours depuis la création de l'opportunité. */
export function computeDealAgeDays(deal: { created_at: string }, now: Date): number {
  return Math.floor((now.getTime() - new Date(deal.created_at).getTime()) / MS_PER_DAY);
}

/**
 * Pure : cycle moyen (en jours) entre création et signature — uniquement
 * les opportunités gagnées avec une date de signature (`signed_at`,
 * posée à la victoire) : une opportunité perdue n'a pas de date de
 * clôture équivalente en base. `null` si aucune opportunité gagnée.
 */
export function computeAverageCycleDays(
  deals: Array<{ status: DealStatus; created_at: string; signed_at: string | null }>,
): number | null {
  const closed = deals.filter((d) => d.status === "won" && d.signed_at);
  if (closed.length === 0) return null;
  const totalDays = closed.reduce(
    (sum, d) => sum + (new Date(d.signed_at!).getTime() - new Date(d.created_at).getTime()) / MS_PER_DAY,
    0,
  );
  return Math.round(totalDays / closed.length);
}

export interface NextDealAction {
  title: string;
  dueDate: string;
}

/**
 * Pure : prochaine tâche non terminée liée à cette opportunité (échéance
 * la plus proche) — `null` si aucune tâche ouverte n'y est liée.
 */
export function computeNextActionForDeal(
  dealId: string,
  tasks: Array<{ deal_id: string | null; title: string; due_date: string | null; status: string }>,
): NextDealAction | null {
  const candidates = tasks
    .filter((t) => t.deal_id === dealId && t.status !== "done" && t.due_date)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!));
  const next = candidates[0];
  return next ? { title: next.title, dueDate: next.due_date! } : null;
}
