export interface CampaignStats {
  campaignId: string;
  campaignName: string;
  leadsCount: number;
  connectedCount: number;
  repliedCount: number;
}

/**
 * Pure : agrège les interactions LinkedIn (Lemlist, synchronisées par
 * `scripts/sync-lemlist.ts`) par campagne — la seule source de vérité
 * pour ce regroupement est `metadata.campaignId` (activité brute Lemlist
 * conservée telle quelle à la synchro). Une interaction sans campagne
 * identifiable est ignorée plutôt que rattachée à une fausse catégorie
 * "sans campagne". `metadata.campaignName` sert de libellé s'il est
 * présent dans la charge brute Lemlist, sinon on retombe sur l'id —
 * jamais un nom inventé.
 */
export function computeCampaignStats(
  interactions: Array<{ prospect_id: string; type: string; metadata: Record<string, unknown> | null }>,
): CampaignStats[] {
  const byCampaign = new Map<
    string,
    { name: string; leads: Set<string>; connected: Set<string>; replied: Set<string> }
  >();

  for (const interaction of interactions) {
    const campaignId = typeof interaction.metadata?.campaignId === "string" ? interaction.metadata.campaignId : null;
    if (!campaignId) continue;

    let entry = byCampaign.get(campaignId);
    if (!entry) {
      const campaignName =
        typeof interaction.metadata?.campaignName === "string" ? interaction.metadata.campaignName : campaignId;
      entry = { name: campaignName, leads: new Set(), connected: new Set(), replied: new Set() };
      byCampaign.set(campaignId, entry);
    }

    entry.leads.add(interaction.prospect_id);
    if (interaction.type === "linkedin_connected") entry.connected.add(interaction.prospect_id);
    if (interaction.type === "linkedin_replied") entry.replied.add(interaction.prospect_id);
  }

  return Array.from(byCampaign.entries())
    .map(([campaignId, entry]) => ({
      campaignId,
      campaignName: entry.name,
      leadsCount: entry.leads.size,
      connectedCount: entry.connected.size,
      repliedCount: entry.replied.size,
    }))
    .sort((a, b) => b.leadsCount - a.leadsCount);
}
