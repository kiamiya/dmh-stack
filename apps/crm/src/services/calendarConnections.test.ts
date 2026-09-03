import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { disconnectMyCalendar, listMyConnections } from "./calendarConnections";

function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  return {
    rpc: () => Promise.resolve(result),
  } as unknown as SupabaseClient;
}

describe("listMyConnections", () => {
  it("retourne les connexions telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "conn-1", provider: "google", provider_account_email: "a@b.fr" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listMyConnections(client)).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listMyConnections(client)).resolves.toEqual([]);
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "boom" } });
    await expect(listMyConnections(client)).rejects.toThrow("boom");
  });
});

describe("disconnectMyCalendar", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(disconnectMyCalendar(client, "conn-1")).resolves.toBeUndefined();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "update refusé" } });
    await expect(disconnectMyCalendar(client, "conn-1")).rejects.toThrow("update refusé");
  });
});
