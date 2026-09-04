import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDealsToList, createList, deleteList, listDealIdsInList, listLists, removeDealFromList } from "./dealLists";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ce service — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    insert: () => query,
    upsert: () => query,
    delete: () => query,
    single: () => Promise.resolve(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return {
    from: () => query,
  } as unknown as SupabaseClient;
}

describe("listLists", () => {
  it("retourne les listes telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "list-1", name: "Pipeline Q4" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listLists(client, "client-1")).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listLists(client, "client-1")).resolves.toEqual([]);
  });
});

describe("createList", () => {
  it("retourne l'id de la liste créée", async () => {
    const client = makeStubClient({ data: { id: "list-42" }, error: null });
    await expect(createList(client, { clientId: "client-1", name: "VIP" })).resolves.toEqual({ id: "list-42" });
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "insert refusé" } });
    await expect(createList(client, { clientId: "client-1", name: "x" })).rejects.toThrow("insert refusé");
  });
});

describe("deleteList", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(deleteList(client, "list-1")).resolves.toBeUndefined();
  });
});

describe("listDealIdsInList", () => {
  it("extrait les deal_id des lignes renvoyées", async () => {
    const rows = [{ deal_id: "d1" }, { deal_id: "d2" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listDealIdsInList(client, "list-1")).resolves.toEqual(["d1", "d2"]);
  });
});

describe("addDealsToList", () => {
  it("ne fait aucun appel si la liste d'opportunités est vide", async () => {
    const client = { from: vi.fn() } as unknown as SupabaseClient;
    await addDealsToList(client, "client-1", "list-1", []);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "upsert refusé" } });
    await expect(addDealsToList(client, "client-1", "list-1", ["d1"])).rejects.toThrow("upsert refusé");
  });
});

describe("removeDealFromList", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(removeDealFromList(client, "list-1", "d1")).resolves.toBeUndefined();
  });
});
