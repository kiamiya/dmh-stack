import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listLinkedinInteractions } from "./interactions";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ce service — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: () => query,
    eq: () => query,
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return {
    from: () => query,
  } as unknown as SupabaseClient;
}

describe("listLinkedinInteractions", () => {
  it("retourne les interactions telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "int-1", prospect_id: "p1", type: "linkedin_connected", metadata: { campaignId: "camp-1" } }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listLinkedinInteractions(client)).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listLinkedinInteractions(client)).resolves.toEqual([]);
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "select refusé" } });
    await expect(listLinkedinInteractions(client)).rejects.toThrow("select refusé");
  });
});
