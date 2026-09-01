import { describe, expect, it } from "vitest";
import { KANBAN_COLUMNS, groupProspectsByStatus } from "./kanban";

describe("KANBAN_COLUMNS", () => {
  it("contient exactement les 12 statuts du pipeline, sans doublon", () => {
    expect(KANBAN_COLUMNS).toHaveLength(12);
    expect(new Set(KANBAN_COLUMNS.map((c) => c.status)).size).toBe(12);
  });
});

describe("groupProspectsByStatus", () => {
  it("répartit chaque prospect dans la colonne de son statut", () => {
    const prospects = [
      { id: "1", status: "ready" as const },
      { id: "2", status: "ready" as const },
      { id: "3", status: "won" as const },
    ];
    const groups = groupProspectsByStatus(prospects);

    const ready = groups.find((g) => g.column.status === "ready")!;
    const won = groups.find((g) => g.column.status === "won")!;
    const toEnrich = groups.find((g) => g.column.status === "to_enrich")!;

    expect(ready.prospects).toHaveLength(2);
    expect(won.prospects).toHaveLength(1);
    expect(toEnrich.prospects).toHaveLength(0);
  });

  it("retourne toujours les 12 colonnes même sans prospects", () => {
    expect(groupProspectsByStatus([])).toHaveLength(12);
  });
});
