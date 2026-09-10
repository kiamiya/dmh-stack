import { describe, expect, it } from "vitest";
import { KANBAN_COLUMNS, groupProspectsByStatus } from "./kanban";

describe("KANBAN_COLUMNS", () => {
  it("s'arrête au rendez-vous pris (pipeline de prospection, sans doublon)", () => {
    expect(KANBAN_COLUMNS).toHaveLength(8);
    expect(new Set(KANBAN_COLUMNS.map((c) => c.status)).size).toBe(8);
  });

  it("exclut les statuts qui appartiennent au pipeline Opportunités", () => {
    const statuses = KANBAN_COLUMNS.map((c) => c.status);
    expect(statuses).not.toContain("qualified");
    expect(statuses).not.toContain("proposal_sent");
    expect(statuses).not.toContain("won");
    expect(statuses).not.toContain("lost");
  });
});

describe("groupProspectsByStatus", () => {
  it("répartit chaque prospect dans la colonne de son statut", () => {
    const prospects = [
      { id: "1", status: "ready" as const },
      { id: "2", status: "ready" as const },
      { id: "3", status: "meeting_booked" as const },
    ];
    const groups = groupProspectsByStatus(prospects);

    const ready = groups.find((g) => g.column.status === "ready")!;
    const meetingBooked = groups.find((g) => g.column.status === "meeting_booked")!;
    const toEnrich = groups.find((g) => g.column.status === "to_enrich")!;

    expect(ready.prospects).toHaveLength(2);
    expect(meetingBooked.prospects).toHaveLength(1);
    expect(toEnrich.prospects).toHaveLength(0);
  });

  it("retourne toujours les 8 colonnes même sans prospects", () => {
    expect(groupProspectsByStatus([])).toHaveLength(8);
  });

  it("un prospect dans un statut du pipeline Opportunités n'apparaît dans aucune colonne", () => {
    const groups = groupProspectsByStatus([{ id: "1", status: "won" as const }]);
    const total = groups.reduce((sum, g) => sum + g.prospects.length, 0);
    expect(total).toBe(0);
  });
});
