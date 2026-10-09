import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decideBookingRequest, listPendingBookingRequests } from "./bookingRequests";

describe("services/bookingRequests", () => {
  it("liste les demandes en attente du client", async () => {
    const filters: Array<[string, unknown]> = [];
    const query: Record<string, unknown> = {};
    Object.assign(query, {
      select: () => query,
      eq: (c: string, v: unknown) => (filters.push([c, v]), query),
      order: () => Promise.resolve({ data: [{ id: "m1" }], error: null }),
    });
    const rows = await listPendingBookingRequests({ from: () => query } as unknown as SupabaseClient, "c1");
    expect(rows).toEqual([{ id: "m1" }]);
    expect(filters).toEqual([
      ["client_id", "c1"],
      ["status", "pending"],
    ]);
  });

  it("decideBookingRequest : appelle booking-decide", async () => {
    const calls: unknown[] = [];
    const client = {
      functions: { invoke: (name: string, opts: unknown) => (calls.push([name, opts]), Promise.resolve({ data: { status: "confirmed" }, error: null })) },
    } as unknown as SupabaseClient;
    expect(await decideBookingRequest(client, "m1", "accept")).toEqual({ status: "confirmed" });
    expect(calls).toEqual([["booking-decide", { body: { meetingId: "m1", decision: "accept" } }]]);
  });

  it("decideBookingRequest : remonte le message d'erreur de la fonction", async () => {
    const context = new Response(JSON.stringify({ error: "Cette demande a déjà été traitée." }), { status: 409 });
    const client = {
      functions: { invoke: () => Promise.resolve({ data: null, error: { message: "Edge Function returned a non-2xx status code", context } }) },
    } as unknown as SupabaseClient;
    await expect(decideBookingRequest(client, "m1", "decline")).rejects.toThrow("Cette demande a déjà été traitée.");
  });
});
