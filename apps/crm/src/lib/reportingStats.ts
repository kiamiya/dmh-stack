import type { DealStatus } from "../services/deals";

export interface ClientPerformanceRow {
  clientId: string;
  clientName: string;
  dealsCount: number;
  wonDealsCount: number;
  pipelineValue: number;
  meetingsCount: number;
  /** Commercial ayant posé le plus de RDV pour ce client — un agrégat réel (`meetings.staff_id`), pas un "propriétaire" assigné (inexistant en base). `null` si aucun RDV. */
  topStaffName: string | null;
  /** Prospects de ce client ayant au moins une interaction réelle — pas "contacts travaillés" au sens du mockup (aucune notion de tentative manuelle en base), mais le proxy réel le plus proche. */
  workedContactsCount: number;
}

/**
 * Pure : une ligne par client DMH, uniquement des chiffres réels
 * (nombre d'opportunités, valeur de pipeline, RDV, commercial le plus
 * actif, contacts travaillés) — jamais de métriques inventées (coût/RDV,
 * apport enrichissement) faute de suivi existant. Un client sans aucune
 * opportunité ni RDV apparaît quand même à 0, plutôt que d'être
 * silencieusement absent du tableau.
 */
export function computeClientPerformance(
  clients: Array<{ id: string; name: string }>,
  deals: Array<{ client_id: string; status: DealStatus; deal_value: number }>,
  meetings: Array<{ client_id: string; staff_id: string }>,
  staff: Array<{ id: string; name: string }>,
  prospects: Array<{ client_id: string; id: string }>,
  interactions: Array<{ prospect_id: string }>,
): ClientPerformanceRow[] {
  const workedProspectIds = new Set(interactions.map((i) => i.prospect_id));

  return clients.map((client) => {
    const clientDeals = deals.filter((d) => d.client_id === client.id);
    const clientMeetings = meetings.filter((m) => m.client_id === client.id);

    const meetingCountByStaffId = new Map<string, number>();
    for (const m of clientMeetings) {
      meetingCountByStaffId.set(m.staff_id, (meetingCountByStaffId.get(m.staff_id) ?? 0) + 1);
    }
    let topStaffId: string | null = null;
    let topCount = 0;
    for (const [staffId, count] of meetingCountByStaffId) {
      if (count > topCount) {
        topStaffId = staffId;
        topCount = count;
      }
    }

    const workedContactsCount = prospects.filter((p) => p.client_id === client.id && workedProspectIds.has(p.id)).length;

    return {
      clientId: client.id,
      clientName: client.name,
      dealsCount: clientDeals.length,
      wonDealsCount: clientDeals.filter((d) => d.status === "won").length,
      pipelineValue: clientDeals.reduce((sum, d) => sum + d.deal_value, 0),
      meetingsCount: clientMeetings.length,
      topStaffName: topStaffId ? (staff.find((s) => s.id === topStaffId)?.name ?? null) : null,
      workedContactsCount,
    };
  });
}
