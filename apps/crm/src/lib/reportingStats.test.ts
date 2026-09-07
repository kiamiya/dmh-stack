import { describe, expect, it } from "vitest";
import { computeClientPerformance } from "./reportingStats";

const clients = [
  { id: "c1", name: "Client A" },
  { id: "c2", name: "Client B" },
];

const deals = [
  { client_id: "c1", status: "won" as const, deal_value: 5000 },
  { client_id: "c1", status: "negotiation" as const, deal_value: 1000 },
  { client_id: "c2", status: "lost" as const, deal_value: 2000 },
];

const meetings = [{ client_id: "c1" }, { client_id: "c1" }, { client_id: "c2" }];

describe("computeClientPerformance", () => {
  it("regroupe deals et RDV par client", () => {
    const rows = computeClientPerformance(clients, deals, meetings);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.clientId === "c1")).toMatchObject({
      clientName: "Client A",
      dealsCount: 2,
      wonDealsCount: 1,
      pipelineValue: 6000,
      meetingsCount: 2,
    });
    expect(rows.find((r) => r.clientId === "c2")).toMatchObject({
      clientName: "Client B",
      dealsCount: 1,
      wonDealsCount: 0,
      pipelineValue: 2000,
      meetingsCount: 1,
    });
  });

  it("inclut un client à 0 sans opportunité ni RDV", () => {
    const rows = computeClientPerformance(clients, [], []);
    expect(rows.every((r) => r.dealsCount === 0 && r.pipelineValue === 0 && r.meetingsCount === 0)).toBe(true);
  });

  it("retourne un tableau vide sans client", () => {
    expect(computeClientPerformance([], deals, meetings)).toEqual([]);
  });
});
