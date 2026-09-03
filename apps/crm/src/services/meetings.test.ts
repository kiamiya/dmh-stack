import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMeeting, getMeetingLink, listMeetings, upsertMeetingLink } from "./meetings";

/** Stub minimal du sous-ensemble de l'API supabase-js utilisé par ce service — pas de réseau. */
function makeStubClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    insert: () => query,
    upsert: () => query,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return {
    from: () => query,
  } as unknown as SupabaseClient;
}

describe("listMeetings", () => {
  it("retourne les réunions telles que renvoyées par Supabase", async () => {
    const rows = [{ id: "meeting-1", title: "RDV" }];
    const client = makeStubClient({ data: rows, error: null });
    await expect(listMeetings(client)).resolves.toEqual(rows);
  });

  it("retourne un tableau vide si data est null", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(listMeetings(client)).resolves.toEqual([]);
  });
});

describe("createMeeting", () => {
  it("retourne l'id de la réunion créée", async () => {
    const client = makeStubClient({ data: { id: "meeting-42" }, error: null });
    await expect(
      createMeeting(client, {
        clientId: "client-1",
        staffId: "staff-1",
        title: "Point client",
        startsAt: "2026-09-07T10:00:00Z",
        endsAt: "2026-09-07T11:00:00Z",
      }),
    ).resolves.toEqual({ id: "meeting-42" });
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "insert refusé" } });
    await expect(
      createMeeting(client, {
        clientId: "client-1",
        staffId: "staff-1",
        title: "x",
        startsAt: "2026-09-07T10:00:00Z",
        endsAt: "2026-09-07T11:00:00Z",
      }),
    ).rejects.toThrow("insert refusé");
  });
});

describe("upsertMeetingLink", () => {
  it("ne lève pas si Supabase ne renvoie pas d'erreur", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(
      upsertMeetingLink(client, {
        clientId: "client-1",
        staffId: "staff-1",
        title: "Point client",
        startsAt: "2026-09-07T10:00:00Z",
        endsAt: "2026-09-07T11:00:00Z",
        provider: "google",
        externalEventId: "evt-1",
        contactId: "contact-1",
      }),
    ).resolves.toBeUndefined();
  });

  it("lève une erreur avec le message Supabase en cas d'échec", async () => {
    const client = makeStubClient({ data: null, error: { message: "upsert refusé" } });
    await expect(
      upsertMeetingLink(client, {
        clientId: "client-1",
        staffId: "staff-1",
        title: "x",
        startsAt: "2026-09-07T10:00:00Z",
        endsAt: "2026-09-07T11:00:00Z",
        provider: "google",
        externalEventId: "evt-1",
      }),
    ).rejects.toThrow("upsert refusé");
  });
});

describe("getMeetingLink", () => {
  it("retourne la réunion liée si elle existe", async () => {
    const row = { id: "meeting-1", external_event_id: "evt-1" };
    const client = makeStubClient({ data: row, error: null });
    await expect(getMeetingLink(client, "google", "evt-1")).resolves.toEqual(row);
  });

  it("retourne null si aucune réunion n'est liée", async () => {
    const client = makeStubClient({ data: null, error: null });
    await expect(getMeetingLink(client, "google", "evt-1")).resolves.toBeNull();
  });
});
