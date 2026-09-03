import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSegment, deleteSegment, listSegments } from "./contactSegments";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ce service — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    insert: () => query,
    delete: () => query,
    single: () => Promise.resolve(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return {
    from: () => query,
  } as unknown as SupabaseClient;
}

describe("listSegments", () => {
  it("retourne les segments tels que renvoyés par Supabase", async () => {
    const rows = [{ id: "seg-1", name: "Décideurs", rules: [] }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listSegments(client, "client-1")).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listSegments(client, "client-1")).resolves.toEqual([]);
  });
});

describe("createSegment", () => {
  it("retourne l'id du segment créé", async () => {
    const client = makeStubClient({ data: { id: "seg-42" }, error: null });
    await expect(createSegment(client, { clientId: "client-1", name: "Décideurs", rules: [] })).resolves.toEqual({
      id: "seg-42",
    });
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "insert refusé" } });
    await expect(createSegment(client, { clientId: "client-1", name: "Décideurs", rules: [] })).rejects.toThrow(
      "insert refusé",
    );
  });
});

describe("deleteSegment", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(deleteSegment(client, "seg-1")).resolves.toBeUndefined();
  });
});
