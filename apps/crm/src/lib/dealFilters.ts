import { isFreshUnderDays, isStaleOverDays } from "./quickFilters";
import type { DealRow } from "../services/deals";

export type DealPreset = "all" | "mine" | "large" | "followup" | "won_quarter";

export interface DealFilters {
  preset: DealPreset;
  myPortfolio: boolean;
  amountAbove100k: boolean;
  probAbove60: boolean;
  noMovement30d: boolean;
  openUnder10d: boolean;
}

export const EMPTY_DEAL_FILTERS: DealFilters = {
  preset: "all",
  myPortfolio: false,
  amountAbove100k: false,
  probAbove60: false,
  noMovement30d: false,
  openUnder10d: false,
};

const LARGE_DEAL_THRESHOLD = 100_000;

function isSameQuarter(isoDate: string, now: Date): boolean {
  const date = new Date(isoDate);
  return date.getFullYear() === now.getFullYear() && Math.floor(date.getMonth() / 3) === Math.floor(now.getMonth() / 3);
}

/**
 * Pure : onglets système du mockup Claude Design (Toutes les affaires/
 * Mes affaires/Grands comptes/À relancer/Gagnées ce trimestre) + filtres
 * rapides (Mon portefeuille/Montant/Proba/Sans mouvement/Ouvertes
 * récemment) — combinés en ET logique.
 */
export function matchesDealFilters(deal: DealRow, filters: DealFilters, currentStaffId: string | null, now: Date = new Date()): boolean {
  if (filters.preset === "mine" && deal.assigned_to !== currentStaffId) return false;
  if (filters.preset === "large" && deal.deal_value < LARGE_DEAL_THRESHOLD) return false;
  if (filters.preset === "followup" && !(deal.status === "negotiation" && isStaleOverDays(20, deal.created_at, now))) return false;
  if (filters.preset === "won_quarter" && !(deal.status === "won" && deal.signed_at !== null && isSameQuarter(deal.signed_at, now))) return false;

  if (filters.myPortfolio && deal.assigned_to !== currentStaffId) return false;
  if (filters.amountAbove100k && deal.deal_value < LARGE_DEAL_THRESHOLD) return false;
  if (filters.probAbove60 && (deal.probability === null || deal.probability < 60)) return false;
  if (filters.noMovement30d && !isStaleOverDays(30, deal.updated_at, now)) return false;
  if (filters.openUnder10d && !(deal.status === "negotiation" && isFreshUnderDays(10, deal.created_at, now))) return false;

  return true;
}

export function filterDeals(deals: DealRow[], filters: DealFilters, currentStaffId: string | null, now: Date = new Date()): DealRow[] {
  return deals.filter((d) => matchesDealFilters(d, filters, currentStaffId, now));
}
