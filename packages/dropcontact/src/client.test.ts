import { describe, expect, it, vi } from "vitest";
import { DropcontactApiError, pollDropcontactBatch, submitDropcontactBatch } from "./client.js";

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("submitDropcontactBatch", () => {
  it("poste le lot et retourne le request_id", async () => {
    let calledUrl = "";
    let calledInit: RequestInit | undefined;
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      calledUrl = url.toString();
      calledInit = init;
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ request_id: "req-123" }) };
    }) as unknown as typeof fetch;

    const requestId = await submitDropcontactBatch(
      [{ first_name: "Jean", last_name: "Dupont", company: "ACME" }],
      { apiKey: "test-key", fetchImpl },
    );

    expect(requestId).toBe("req-123");
    expect(calledUrl).toBe("https://api.dropcontact.com/v1/enrich/all");
    expect(calledInit?.method).toBe("POST");
    expect((calledInit?.headers as Record<string, string>)["X-Access-Token"]).toBe("test-key");
    expect(JSON.parse(calledInit?.body as string)).toEqual({
      data: [{ first_name: "Jean", last_name: "Dupont", company: "ACME" }],
      language: "fr",
    });
  });

  it("lève une erreur si la réponse n'a pas de request_id", async () => {
    const fetchImpl = mockFetch(200, { success: true });
    await expect(
      submitDropcontactBatch([{ first_name: "Jean" }], { apiKey: "k", fetchImpl }),
    ).rejects.toThrow(/request_id/);
  });

  it("lève DropcontactApiError si la réponse HTTP n'est pas ok", async () => {
    const fetchImpl = mockFetch(401, { error: true });
    await expect(
      submitDropcontactBatch([{ first_name: "Jean" }], { apiKey: "k", fetchImpl }),
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe("pollDropcontactBatch", () => {
  it("retourne pending tant que Dropcontact n'a pas fini", async () => {
    const fetchImpl = mockFetch(200, {
      error: false,
      success: false,
      reason: "Request not ready yet, try again in 30 seconds",
    });

    const result = await pollDropcontactBatch("req-123", { apiKey: "k", fetchImpl });

    expect(result).toEqual({
      status: "pending",
      reason: "Request not ready yet, try again in 30 seconds",
    });
  });

  it("retourne ready avec les résultats une fois le traitement terminé", async () => {
    const fetchImpl = mockFetch(200, {
      error: false,
      data: [{ first_name: "Jean", email: [{ email: "jean@acme.fr", qualification: "nominative@pro" }] }],
    });

    const result = await pollDropcontactBatch("req-123", { apiKey: "k", fetchImpl });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.results).toHaveLength(1);
    }
  });

  it("lève DropcontactApiError si la réponse HTTP n'est pas ok", async () => {
    const fetchImpl = mockFetch(404, { error: true });
    await expect(pollDropcontactBatch("req-inconnu", { apiKey: "k", fetchImpl })).rejects.toBeInstanceOf(
      DropcontactApiError,
    );
  });
});
