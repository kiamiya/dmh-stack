export interface DashboardBlockDef {
  key: string;
  label: string;
  category: string;
}

/**
 * Catalogue fixe des blocs disponibles pour un dashboard nommé (S34-15) —
 * un pour chaque carte/graphique déjà codé dans `Dashboard.tsx` (décision
 * de cadrage confirmée par Loïc : pas de nouveau catalogue générique).
 */
export const DASHBOARD_BLOCKS: DashboardBlockDef[] = [
  { key: "weekly_activity", label: "Activité de la force de vente", category: "Vue d'ensemble" },
  { key: "status_bar", label: "Prospects par statut", category: "Vue d'ensemble" },
  { key: "funnel", label: "Funnel de conversion", category: "Vue d'ensemble" },
  { key: "to_enrich_count", label: "En attente d'enrichissement", category: "Vue d'ensemble" },
  { key: "client_performance", label: "Comptes clients suivis", category: "Vue d'ensemble" },
  { key: "weekly_new_prospects", label: "Nouveaux prospects par semaine", category: "Évolution" },
  { key: "weekly_deals_won", label: "Deals gagnés par semaine", category: "Évolution" },
  { key: "top_scores", label: "Top prospects par score IA", category: "Scores & Deals" },
  { key: "deals_list", label: "Deals (gagnés/perdus)", category: "Scores & Deals" },
  { key: "pipeline_value", label: "Pipeline des opportunités", category: "Opportunités & Tâches" },
  { key: "task_counts", label: "Tâches par statut", category: "Opportunités & Tâches" },
  { key: "overdue_tasks", label: "Tâches en retard", category: "Opportunités & Tâches" },
  { key: "activity_feed", label: "Fil d'activité récent", category: "Activité" },
  { key: "stagnant_prospects", label: "Prospects stagnants", category: "Activité" },
];

export function getDashboardBlockLabel(key: string): string {
  return DASHBOARD_BLOCKS.find((b) => b.key === key)?.label ?? key;
}
