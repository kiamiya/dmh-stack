import { describe, expect, it } from "vitest";
import { ALL_PROSPECT_STATUSES, getStatusColor, getStatusLabel } from "./status.js";
import type { ProspectStatus } from "@dmh/types";

const ALL_STATUSES: ProspectStatus[] = [
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
  "lost",
  "not_interested",
];

describe("getStatusLabel / getStatusColor", () => {
  it("couvre les 12 statuts du pipeline sans exception", () => {
    for (const status of ALL_STATUSES) {
      expect(() => getStatusLabel(status)).not.toThrow();
      expect(() => getStatusColor(status)).not.toThrow();
      expect(getStatusLabel(status)).toBeTruthy();
      expect(getStatusColor(status)).toBeTruthy();
    }
  });

  it("retourne des libellés FR distincts pour chaque statut", () => {
    const labels = new Set(ALL_STATUSES.map((s) => getStatusLabel(s)));
    expect(labels.size).toBe(ALL_STATUSES.length);
  });

  it("mappe les statuts de succès/échec sur des couleurs cohérentes", () => {
    expect(getStatusColor("won")).toBe("green");
    expect(getStatusColor("lost")).toBe("red");
    expect(getStatusColor("not_interested")).toBe("red");
  });

  it("ALL_PROSPECT_STATUSES contient exactement les 12 statuts, sans doublon", () => {
    expect(new Set(ALL_PROSPECT_STATUSES).size).toBe(12);
    expect(ALL_PROSPECT_STATUSES.sort()).toEqual([...ALL_STATUSES].sort());
  });
});
