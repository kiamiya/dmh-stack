import { describe, expect, it } from "vitest";
import { buildCompanyTimeline, filterCompanyTimeline } from "./companyTimeline";

const input = {
  interactions: [
    {
      id: "i1",
      prospect_id: "p1",
      type: "call" as const,
      subject: null,
      content: "Rappeler en octobre",
      occurred_at: "2026-09-20T10:00:00Z",
      created_by: "s1",
    },
    {
      id: "i2",
      prospect_id: "p2",
      type: "note" as const,
      subject: "Salon",
      content: "Rencontré sur le stand",
      occurred_at: "2026-09-22T09:00:00Z",
      created_by: null,
    },
  ],
  statusHistory: [
    { prospect_id: "p1", old_status: null, new_status: "to_enrich" as const, changed_by: null, changed_at: "2026-09-18T08:00:00Z" },
    { prospect_id: "p1", old_status: "to_enrich" as const, new_status: "enriched_pappers" as const, changed_by: null, changed_at: "2026-09-19T08:00:00Z" },
  ],
  meetings: [{ id: "m1", title: "Découverte", starts_at: "2026-09-25T14:00:00Z" }],
  contactNameByProspectId: new Map([
    ["p1", "Alice Martin"],
    ["p2", "Bob Durand"],
  ]),
  staffNameById: new Map([["s1", "Loïc"]]),
};

describe("buildCompanyTimeline", () => {
  it("fusionne interactions, statuts et rendez-vous, du plus récent au plus ancien", () => {
    const events = buildCompanyTimeline(input);
    expect(events.map((e) => e.id)).toEqual([
      "meeting-m1",
      "interaction-i2",
      "interaction-i1",
      expect.stringMatching(/^status-p1-2026-09-19/),
      expect.stringMatching(/^status-p1-2026-09-18/),
    ]);
  });

  it("renseigne contact, auteur et détail", () => {
    const call = buildCompanyTimeline(input).find((e) => e.id === "interaction-i1")!;
    expect(call).toMatchObject({ title: "Appel", detail: "Rappeler en octobre", contactName: "Alice Martin", authorName: "Loïc" });
    const note = buildCompanyTimeline(input).find((e) => e.id === "interaction-i2")!;
    expect(note.detail).toBe("Salon — Rencontré sur le stand");
  });

  it("libelle les changements de statut", () => {
    const statuses = buildCompanyTimeline(input).filter((e) => e.kind === "status");
    expect(statuses[1].title.startsWith("Statut initial")).toBe(true);
    expect(statuses[0].title).toContain("→");
  });

  it("filtre par nature", () => {
    const events = buildCompanyTimeline(input);
    expect(filterCompanyTimeline(events, "meeting")).toHaveLength(1);
    expect(filterCompanyTimeline(events, "all")).toHaveLength(5);
  });
});
