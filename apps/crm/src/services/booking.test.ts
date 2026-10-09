import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteMeetingType, getBookingPage, saveBookingPage, saveMeetingType } from "./booking";
import { buildMeetingTypePayload, emptyMeetingTypeForm } from "../lib/meetingTypeForm";

type Call = { op: string; table: string; payload?: unknown; filter?: [string, unknown]; options?: unknown };

function stub(result: { data?: unknown; error?: { code?: string; message: string } | null } = {}) {
  const calls: Call[] = [];
  const res = { data: result.data ?? null, error: result.error ?? null };
  const client = {
    from: (table: string) => ({
      select: () => ({ eq: (c: string, v: unknown) => ({ maybeSingle: () => (calls.push({ op: "select", table, filter: [c, v] }), Promise.resolve(res)) }) }),
      upsert: (payload: unknown, options: unknown) => {
        calls.push({ op: "upsert", table, payload, options });
        return { select: () => ({ single: () => Promise.resolve(res) }) };
      },
      insert: (payload: unknown) => (calls.push({ op: "insert", table, payload }), Promise.resolve(res)),
      update: (payload: unknown) => ({ eq: (c: string, v: unknown) => (calls.push({ op: "update", table, payload, filter: [c, v] }), Promise.resolve(res)) }),
      delete: () => ({ eq: (c: string, v: unknown) => (calls.push({ op: "delete", table, filter: [c, v] }), Promise.resolve(res)) }),
    }),
  } as unknown as SupabaseClient;
  return { client, calls };
}

const payload = buildMeetingTypePayload({ ...emptyMeetingTypeForm(), name: "Démo" }).payload!;

describe("services/booking", () => {
  it("getBookingPage : null si le client n'a pas de page", async () => {
    const { client, calls } = stub();
    expect(await getBookingPage(client, "c1")).toBeNull();
    expect(calls[0]).toMatchObject({ table: "booking_pages", filter: ["client_id", "c1"] });
  });

  it("saveBookingPage : upsert par client", async () => {
    const { client, calls } = stub({ data: { id: "p1" } });
    await saveBookingPage(client, { clientId: "c1", slug: "acme", title: "ACME", description: null, hostStaffId: "s1" });
    expect(calls[0]).toMatchObject({
      op: "upsert",
      payload: { client_id: "c1", slug: "acme", title: "ACME", host_staff_id: "s1" },
      options: { onConflict: "client_id" },
    });
  });

  it("slug déjà pris : message lisible", async () => {
    const { client } = stub({ error: { code: "23505", message: "duplicate key" } });
    await expect(saveBookingPage(client, { clientId: "c1", slug: "acme", title: "A", description: null, hostStaffId: "s1" })).rejects.toThrow(
      "Ce lien personnalisé est déjà utilisé par un autre client.",
    );
    await expect(saveMeetingType(client, "p1", payload)).rejects.toThrow("déjà utilisé par un autre type de RDV de cette page");
  });

  it("saveMeetingType : insertion sans id, mise à jour avec id", async () => {
    const { client, calls } = stub();
    await saveMeetingType(client, "p1", payload);
    await saveMeetingType(client, "p1", payload, "t1");
    expect(calls[0]).toMatchObject({ op: "insert", payload: { booking_page_id: "p1", slug: "demo" } });
    expect(calls[1]).toMatchObject({ op: "update", filter: ["id", "t1"] });
  });

  it("deleteMeetingType", async () => {
    const { client, calls } = stub();
    await deleteMeetingType(client, "t1");
    expect(calls[0]).toMatchObject({ op: "delete", table: "meeting_types", filter: ["id", "t1"] });
  });
});
