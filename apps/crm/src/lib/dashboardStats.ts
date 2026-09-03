import type { ProspectStatus } from "@dmh/types";
import { ALL_PROSPECT_STATUSES, getStatusColor, getStatusLabel } from "./status";
import type { BadgeProps } from "../components/ui/badge";

export interface StatusCount {
  /** Élargi à `string` (au lieu de `ProspectStatus`) — sert de clé React dans StatusBarList, réutilisé par lib/taskStats.ts (S15) pour des statuts de tâches. */
  status: string;
  label: string;
  color: NonNullable<BadgeProps["variant"]>;
  count: number;
}

/** Pure : nombre de prospects par statut (les 12, y compris à 0) — pour la vue d'ensemble. */
export function computeStatusCounts(prospects: Array<{ status: ProspectStatus }>): StatusCount[] {
  return ALL_PROSPECT_STATUSES.map((status) => ({
    status,
    label: getStatusLabel(status),
    color: getStatusColor(status),
    count: prospects.filter((p) => p.status === status).length,
  }));
}

/** Ordre du pipeline "positif" pour le funnel — exclut les issues négatives (lost/not_interested), qui ne sont pas une étape de progression. */
export const FUNNEL_STAGES: ProspectStatus[] = [
  "to_enrich",
  "enriched_pappers",
  "enriched_contact",
  "ready",
  "in_sequence",
  "replied",
  "meeting_booked",
  "qualified",
  "proposal_sent",
  "won",
];

export interface FunnelStage {
  status: ProspectStatus;
  label: string;
  reached: number;
  /** % de conversion depuis l'étape précédente — `null` pour la première étape. */
  conversionRate: number | null;
}

/**
 * Pure : calcule, pour chaque étape du funnel, le nombre de prospects
 * l'ayant **déjà atteinte au moins une fois** (pas seulement ceux
 * actuellement dans ce statut — un prospect passé à `qualified` a bien
 * "atteint" `ready` même s'il ne s'y trouve plus). Nécessite l'historique
 * complet des changements de statut (`prospect_status_history`, migration
 * 010) — sans lui, un simple compte par statut courant sous-estimerait
 * fortement les premières étapes.
 */
export function computeFunnelFromHistory(
  history: Array<{ prospect_id: string; new_status: ProspectStatus }>,
  stages: ProspectStatus[] = FUNNEL_STAGES,
): FunnelStage[] {
  const reachedByStage = new Map<ProspectStatus, Set<string>>();
  for (const stage of stages) reachedByStage.set(stage, new Set());

  for (const entry of history) {
    reachedByStage.get(entry.new_status)?.add(entry.prospect_id);
  }

  let previousCount: number | null = null;
  return stages.map((status) => {
    const reached = reachedByStage.get(status)?.size ?? 0;
    const conversionRate = previousCount === null || previousCount === 0 ? null : Math.round((reached / previousCount) * 1000) / 10;
    previousCount = reached;
    return { status, label: getStatusLabel(status), reached, conversionRate };
  });
}

export interface TopScoreProspect {
  id: string;
  companyName: string;
  score: number;
}

/** Pure : top N prospects par score IA décroissant (ignore les prospects sans score). */
export function topProspectsByScore<T extends { id: string; companies: { name: string; ai_score: number | null } | null }>(
  prospects: T[],
  limit = 5,
): TopScoreProspect[] {
  return prospects
    .filter((p) => p.companies?.ai_score != null)
    .map((p) => ({ id: p.id, companyName: p.companies!.name, score: p.companies!.ai_score! }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export interface WeeklyBucket {
  /** Date ISO (YYYY-MM-DD) du lundi de la semaine. */
  weekStart: string;
  count: number;
}

function mondayOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // dimanche (0) -> lundi précédent
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Pure : regroupe des dates ISO par semaine (lundi-dimanche), sur les `weeksCount` dernières semaines se terminant à `now`, semaines vides incluses (0). */
export function computeWeeklyCounts(dates: string[], weeksCount: number, now: Date): WeeklyBucket[] {
  const currentMonday = mondayOf(now);
  const buckets: WeeklyBucket[] = [];
  for (let i = weeksCount - 1; i >= 0; i--) {
    const monday = new Date(currentMonday);
    monday.setUTCDate(monday.getUTCDate() - i * 7);
    buckets.push({ weekStart: isoDate(monday), count: 0 });
  }

  const byWeekStart = new Map(buckets.map((b) => [b.weekStart, b]));
  for (const dateStr of dates) {
    const monday = isoDate(mondayOf(new Date(dateStr)));
    const bucket = byWeekStart.get(monday);
    if (bucket) bucket.count += 1;
  }

  return buckets;
}
