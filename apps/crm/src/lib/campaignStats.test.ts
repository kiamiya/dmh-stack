import { describe, expect, it } from "vitest";
import { computeCampaignStats } from "./campaignStats";

const interactions = [
  { prospect_id: "p1", type: "linkedin_request_sent", metadata: { campaignId: "camp-1", campaignName: "Relance Q3" } },
  { prospect_id: "p1", type: "linkedin_connected", metadata: { campaignId: "camp-1", campaignName: "Relance Q3" } },
  { prospect_id: "p2", type: "linkedin_request_sent", metadata: { campaignId: "camp-1", campaignName: "Relance Q3" } },
  { prospect_id: "p2", type: "linkedin_replied", metadata: { campaignId: "camp-1", campaignName: "Relance Q3" } },
  { prospect_id: "p3", type: "linkedin_request_sent", metadata: { campaignId: "camp-2" } },
];

describe("computeCampaignStats", () => {
  it("regroupe les interactions par campagne avec des comptes distincts par lead", () => {
    const stats = computeCampaignStats(interactions);
    const camp1 = stats.find((s) => s.campaignId === "camp-1");
    expect(camp1).toMatchObject({ campaignName: "Relance Q3", leadsCount: 2, connectedCount: 1, repliedCount: 1 });
  });

  it("retombe sur l'id de campagne si campaignName est absent des métadonnées", () => {
    const stats = computeCampaignStats(interactions);
    const camp2 = stats.find((s) => s.campaignId === "camp-2");
    expect(camp2).toMatchObject({ campaignName: "camp-2", leadsCount: 1 });
  });

  it("ignore les interactions sans campaignId identifiable", () => {
    const stats = computeCampaignStats([{ prospect_id: "p1", type: "linkedin_request_sent", metadata: null }]);
    expect(stats).toEqual([]);
  });

  it("trie par nombre de leads décroissant", () => {
    const stats = computeCampaignStats(interactions);
    expect(stats[0].campaignId).toBe("camp-1");
  });
});
