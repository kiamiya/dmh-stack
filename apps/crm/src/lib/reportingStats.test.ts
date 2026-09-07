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

const meetings = [
  { client_id: "c1", staff_id: "s1" },
  { client_id: "c1", staff_id: "s1" },
  { client_id: "c1", staff_id: "s2" },
  { client_id: "c2", staff_id: "s2" },
];

const staff = [
  { id: "s1", name: "Marie Dubois" },
  { id: "s2", name: "Paul Martin" },
];

const prospects = [
  { client_id: "c1", id: "p1" },
  { client_id: "c1", id: "p2" },
  { client_id: "c1", id: "p3" },
  { client_id: "c2", id: "p4" },
];

const interactions = [{ prospect_id: "p1" }, { prospect_id: "p1" }, { prospect_id: "p2" }];

describe("computeClientPerformance", () => {
  it("regroupe deals et RDV par client", () => {
    const rows = computeClientPerformance(clients, deals, meetings, staff, prospects, interactions);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.clientId === "c1")).toMatchObject({
      clientName: "Client A",
      dealsCount: 2,
      wonDealsCount: 1,
      pipelineValue: 6000,
      meetingsCount: 3,
    });
    expect(rows.find((r) => r.clientId === "c2")).toMatchObject({
      clientName: "Client B",
      dealsCount: 1,
      wonDealsCount: 0,
      pipelineValue: 2000,
      meetingsCount: 1,
    });
  });

  it("désigne le commercial ayant posé le plus de RDV pour ce client", () => {
    const rows = computeClientPerformance(clients, deals, meetings, staff, prospects, interactions);
    expect(rows.find((r) => r.clientId === "c1")?.topStaffName).toBe("Marie Dubois");
    expect(rows.find((r) => r.clientId === "c2")?.topStaffName).toBe("Paul Martin");
  });

  it("retourne null pour topStaffName sans aucun RDV", () => {
    const rows = computeClientPerformance(clients, deals, [], staff, prospects, interactions);
    expect(rows.every((r) => r.topStaffName === null)).toBe(true);
  });

  it("compte les prospects distincts ayant au moins une interaction, par client", () => {
    const rows = computeClientPerformance(clients, deals, meetings, staff, prospects, interactions);
    expect(rows.find((r) => r.clientId === "c1")?.workedContactsCount).toBe(2); // p1 et p2, pas p3
    expect(rows.find((r) => r.clientId === "c2")?.workedContactsCount).toBe(0); // p4 sans interaction
  });

  it("inclut un client à 0 sans opportunité ni RDV ni interaction", () => {
    const rows = computeClientPerformance(clients, [], [], staff, [], []);
    expect(rows.every((r) => r.dealsCount === 0 && r.pipelineValue === 0 && r.meetingsCount === 0 && r.workedContactsCount === 0)).toBe(
      true,
    );
  });

  it("retourne un tableau vide sans client", () => {
    expect(computeClientPerformance([], deals, meetings, staff, prospects, interactions)).toEqual([]);
  });
});
