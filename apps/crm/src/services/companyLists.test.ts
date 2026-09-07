import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addCompaniesToList,
  createList,
  deleteList,
  listCompanyIdsInList,
  listDeletedCompanyLists,
  listLists,
  removeCompanyFromList,
  restoreCompanyList,
} from "./companyLists";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ce service — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    is: () => query,
    not: () => query,
    insert: () => query,
    upsert: () => query,
    update: () => query,
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
    const rows = [{ id: "list-1", name: "Clients grands comptes" }];
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

  it("passe created_by=null si non fourni", async () => {
    const insertSpy = vi.fn(() => query);
    const query = {
      select: () => query,
      insert: insertSpy,
      single: () => Promise.resolve({ data: { id: "list-42" }, error: null }),
    };
    const client = { from: () => query } as unknown as SupabaseClient;
    await createList(client, { clientId: "client-1", name: "VIP" });
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ created_by: null }));
  });

  it("passe le staff créateur fourni", async () => {
    const insertSpy = vi.fn(() => query);
    const query = {
      select: () => query,
      insert: insertSpy,
      single: () => Promise.resolve({ data: { id: "list-42" }, error: null }),
    };
    const client = { from: () => query } as unknown as SupabaseClient;
    await createList(client, { clientId: "client-1", name: "VIP", createdBy: "staff-1" });
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ created_by: "staff-1" }));
  });
});

describe("deleteList", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(deleteList(client, "list-1")).resolves.toBeUndefined();
  });

  it("fait une suppression douce (update deleted_at), jamais un hard delete", async () => {
    const updateSpy = vi.fn(() => query);
    const deleteSpy = vi.fn(() => query);
    const query = { eq: () => Promise.resolve({ data: null, error: null }), update: updateSpy, delete: deleteSpy };
    const client = { from: () => query } as unknown as SupabaseClient;
    await deleteList(client, "list-1");
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ deleted_at: expect.any(String) }));
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});

describe("listDeletedCompanyLists", () => {
  it("retourne les listes supprimées telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "list-1", name: "Ancienne liste" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listDeletedCompanyLists(client)).resolves.toEqual(rows);
  });
});

describe("restoreCompanyList", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(restoreCompanyList(client, "list-1")).resolves.toBeUndefined();
  });
});

describe("listCompanyIdsInList", () => {
  it("extrait les company_id des lignes renvoyées", async () => {
    const rows = [{ company_id: "c1" }, { company_id: "c2" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listCompanyIdsInList(client, "list-1")).resolves.toEqual(["c1", "c2"]);
  });
});

describe("addCompaniesToList", () => {
  it("ne fait aucun appel si la liste d'entreprises est vide", async () => {
    const client = { from: vi.fn() } as unknown as SupabaseClient;
    await addCompaniesToList(client, "client-1", "list-1", []);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "upsert refusé" } });
    await expect(addCompaniesToList(client, "client-1", "list-1", ["c1"])).rejects.toThrow("upsert refusé");
  });
});

describe("removeCompanyFromList", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(removeCompanyFromList(client, "list-1", "c1")).resolves.toBeUndefined();
  });
});
