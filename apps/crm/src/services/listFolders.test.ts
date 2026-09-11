import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createFolder, deleteFolder, duplicateFolder, listAllListFolders, listFolders, updateFolder } from "./listFolders";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ce service — pas de réseau. */
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

describe("listFolders", () => {
  it("retourne les dossiers telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "f1", name: "Prospection" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listFolders(client, "client-1")).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listFolders(client, "client-1")).resolves.toEqual([]);
  });
});

describe("listAllListFolders", () => {
  it("retourne tous les dossiers tous clients confondus", async () => {
    const rows = [{ id: "f1", name: "Prospection" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listAllListFolders(client)).resolves.toEqual(rows);
  });
});

describe("createFolder", () => {
  it("retourne l'id du dossier créé", async () => {
    const client = makeStubClient({ data: { id: "folder-42" }, error: null });
    await expect(createFolder(client, { clientId: "client-1", name: "Prospection" })).resolves.toEqual({ id: "folder-42" });
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "insert refusé" } });
    await expect(createFolder(client, { clientId: "client-1", name: "x" })).rejects.toThrow("insert refusé");
  });

  it("passe parent_id=null si non fourni (dossier racine)", async () => {
    const insertSpy = vi.fn(() => query);
    const query = {
      select: () => query,
      insert: insertSpy,
      single: () => Promise.resolve({ data: { id: "folder-42" }, error: null }),
    };
    const client = { from: () => query } as unknown as SupabaseClient;
    await createFolder(client, { clientId: "client-1", name: "Prospection" });
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ parent_id: null }));
  });

  it("passe le dossier parent fourni (sous-dossier)", async () => {
    const insertSpy = vi.fn(() => query);
    const query = {
      select: () => query,
      insert: insertSpy,
      single: () => Promise.resolve({ data: { id: "folder-43" }, error: null }),
    };
    const client = { from: () => query } as unknown as SupabaseClient;
    await createFolder(client, { clientId: "client-1", name: "AURA", parentId: "folder-42" });
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ parent_id: "folder-42" }));
  });

  it("passe created_by=null si non fourni", async () => {
    const insertSpy = vi.fn(() => query);
    const query = {
      select: () => query,
      insert: insertSpy,
      single: () => Promise.resolve({ data: { id: "folder-42" }, error: null }),
    };
    const client = { from: () => query } as unknown as SupabaseClient;
    await createFolder(client, { clientId: "client-1", name: "Prospection" });
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ created_by: null }));
  });
});

describe("deleteFolder", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(deleteFolder(client, "folder-1")).resolves.toBeUndefined();
  });
});

describe("updateFolder", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(updateFolder(client, "folder-1", { name: "Nouveau nom" })).resolves.toBeUndefined();
  });

  it("permet de déplacer un dossier à la racine (parentId: null)", async () => {
    const updateSpy = vi.fn(() => query);
    const query = { eq: () => Promise.resolve({ data: null, error: null }), update: updateSpy };
    const client = { from: () => query } as unknown as SupabaseClient;
    await updateFolder(client, "folder-1", { parentId: null });
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ parent_id: null }));
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "update refusé" } });
    await expect(updateFolder(client, "folder-1", { name: "x" })).rejects.toThrow("update refusé");
  });
});

describe("duplicateFolder", () => {
  it("crée une copie suffixée avec le même client/parent", async () => {
    const insertSpy = vi.fn(() => query);
    const query = {
      select: () => query,
      insert: insertSpy,
      single: () => Promise.resolve({ data: { id: "folder-99" }, error: null }),
    };
    const client = { from: () => query } as unknown as SupabaseClient;
    const source = { id: "folder-1", client_id: "client-1", parent_id: "folder-0", name: "Prospection", created_by: "staff-1", created_at: "2026-08-01T00:00:00Z" };
    await expect(duplicateFolder(client, source)).resolves.toEqual({ id: "folder-99" });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: "client-1", name: "Prospection (copie)", parent_id: "folder-0", created_by: "staff-1" }),
    );
  });
});
