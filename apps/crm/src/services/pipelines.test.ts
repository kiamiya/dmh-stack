import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createStage, listPipelines, listStages, reorderStages, updateStage } from "./pipelines";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ces services — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    insert: () => query,
    update: () => query,
    single: () => Promise.resolve(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return {
    from: () => query,
  } as unknown as SupabaseClient;
}

describe("listPipelines", () => {
  it("retourne les pipelines tels que renvoyés par Supabase", async () => {
    const rows = [{ id: "pipeline-1", name: "Pipeline par défaut", is_default: true }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listPipelines(client, "client-1")).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listPipelines(client, "client-1")).resolves.toEqual([]);
  });
});

describe("listStages", () => {
  it("retourne les étapes telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "stage-1", name: "Négociation", position: 1 }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listStages(client, "pipeline-1")).resolves.toEqual(rows);
  });
});

describe("createStage", () => {
  it("retourne l'id de l'étape créée", async () => {
    const client = makeStubClient({ data: { id: "stage-42" }, error: null });
    await expect(
      createStage(client, { clientId: "client-1", pipelineId: "pipeline-1", name: "Qualification", position: 2 }),
    ).resolves.toEqual({ id: "stage-42" });
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "insert refusé" } });
    await expect(
      createStage(client, { clientId: "client-1", pipelineId: "pipeline-1", name: "Qualification", position: 2 }),
    ).rejects.toThrow("insert refusé");
  });
});

describe("updateStage", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(updateStage(client, "stage-1", { name: "Qualifié" })).resolves.toBeUndefined();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "update refusé" } });
    await expect(updateStage(client, "stage-1", { name: "Qualifié" })).rejects.toThrow("update refusé");
  });
});

describe("reorderStages", () => {
  it("ne lève pas si toutes les mises à jour réussissent", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(reorderStages(client, ["stage-2", "stage-1"])).resolves.toBeUndefined();
  });

  it("lève une erreur si une des mises à jour échoue", async () => {
    const client = makeStubClient({ data: null, error: { message: "update refusé" } });
    await expect(reorderStages(client, ["stage-2", "stage-1"])).rejects.toThrow("update refusé");
  });
});
