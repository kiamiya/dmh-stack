import type { DealStatus } from "../services/deals";

export interface ClientPerformanceRow {
  clientId: string;
  clientName: string;
  dealsCount: number;
  wonDealsCount: number;
  pipelineValue: number;
  meetingsCount: number;
}

/**
 * Pure : une ligne par client DMH, uniquement des chiffres réels
 * (nombre d'opportunités, valeur de pipeline, RDV) — jamais de métriques
 * inventées (coût/RDV, apport enrichissement) faute de suivi existant.
 * Un client sans aucune opportunité ni RDV apparaît quand même à 0,
 * plutôt que d'être silencieusement absent du tableau.
 */
export function computeClientPerformance(
  clients: Array<{ id: string; name: string }>,
  deals: Array<{ client_id: string; status: DealStatus; deal_value: number }>,
  meetings: Array<{ client_id: string }>,
): ClientPerformanceRow[] {
  return clients.map((client) => {
    const clientDeals = deals.filter((d) => d.client_id === client.id);
    return {
      clientId: client.id,
      clientName: client.name,
      dealsCount: clientDeals.length,
      wonDealsCount: clientDeals.filter((d) => d.status === "won").length,
      pipelineValue: clientDeals.reduce((sum, d) => sum + d.deal_value, 0),
      meetingsCount: meetings.filter((m) => m.client_id === client.id).length,
    };
  });
}
