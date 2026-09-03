import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createTask, listTasks, updateTask, updateTaskStatus } from "./tasks";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ce service — pas de réseau. */
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

describe("listTasks", () => {
  it("retourne les tâches telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "task-1", title: "Relancer", status: "to_do" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listTasks(client)).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listTasks(client)).resolves.toEqual([]);
  });
});

describe("createTask", () => {
  it("retourne l'id de la tâche créée", async () => {
    const client = makeStubClient({ data: { id: "task-42" }, error: null });
    await expect(createTask(client, { clientId: "client-1", title: "Relancer" })).resolves.toEqual({
      id: "task-42",
    });
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "insert refusé" } });
    await expect(createTask(client, { clientId: "client-1", title: "Relancer" })).rejects.toThrow(
      "insert refusé",
    );
  });
});

describe("updateTaskStatus", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(updateTaskStatus(client, "task-1", "done")).resolves.toBeUndefined();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "update refusé" } });
    await expect(updateTaskStatus(client, "task-1", "done")).rejects.toThrow("update refusé");
  });
});

describe("updateTask", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(updateTask(client, "task-1", { title: "Nouveau titre", dueDate: "2026-09-20" })).resolves.toBeUndefined();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "update refusé" } });
    await expect(updateTask(client, "task-1", { title: "x" })).rejects.toThrow("update refusé");
  });
});
