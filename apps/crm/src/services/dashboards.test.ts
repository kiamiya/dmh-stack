import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDashboard, deleteDashboard, duplicateDashboard, listDashboards, updateDashboard } from "./dashboards";
import type { Dashboard } from "@dmh/types";

function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    insert: () => query,
    update: () => query,
    delete: () => query,
    single: () => Promise.resolve(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return {
    from: () => query,
  } as unknown as SupabaseClient;
}

describe("listDashboards", () => {
  it("retourne les dashboards tels que renvoyés par Supabase", async () => {
    const rows = [{ id: "d1", name: "Mon dashboard" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listDashboards(client)).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listDashboards(client)).resolves.toEqual([]);
  });

  it("rejette si Supabase renvoie une erreur", async () => {
    const client = makeStubClient({ data: null, error: { message: "boom" } });
    await expect(listDashboards(client)).rejects.toThrow("boom");
  });
});

describe("createDashboard", () => {
  it("insère avec un tableau de blocs vide par défaut", async () => {
    const row = { id: "d1", owner_id: "u1", name: "Nouveau", blocks: [], position: 0 };
    const client = makeStubClient({ data: row, error: null });
    await expect(createDashboard(client, { ownerId: "u1", name: "Nouveau" })).resolves.toEqual(row);
  });
});

describe("updateDashboard", () => {
  it("ne throw pas si Supabase renvoie un succès", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(updateDashboard(client, "d1", { name: "Renommé" })).resolves.toBeUndefined();
  });
});

describe("deleteDashboard", () => {
  it("ne throw pas si Supabase renvoie un succès", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(deleteDashboard(client, "d1")).resolves.toBeUndefined();
  });
});

describe("duplicateDashboard", () => {
  it("crée une copie suffixée avec les mêmes blocs", async () => {
    const source: Dashboard = {
      id: "d1",
      owner_id: "u1",
      name: "Suivi commercial",
      blocks: ["funnel", "status_bar"],
      position: 2,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };
    const copyRow = { ...source, id: "d2", name: "Suivi commercial (copie)" };
    const client = makeStubClient({ data: copyRow, error: null });
    const result = await duplicateDashboard(client, source);
    expect(result.name).toBe("Suivi commercial (copie)");
    expect(result.blocks).toEqual(["funnel", "status_bar"]);
  });
});
