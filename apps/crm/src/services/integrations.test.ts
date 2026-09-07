import { describe, expect, it, vi } from "vitest";
import { fetchIntegrationStatuses } from "./integrations";

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("fetchIntegrationStatuses", () => {
  const baseUrl = "https://example.supabase.co/functions/v1";

  it("retourne les statuts et passe le token en Authorization", async () => {
    const integrations = [{ key: "pappers", label: "Pappers", configured: true }];
    const fetchImpl = mockFetch(200, { integrations });
    const result = await fetchIntegrationStatuses("access-token-123", baseUrl, fetchImpl);
    expect(result).toEqual(integrations);
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${baseUrl}/integrations-status`);
    expect(init.headers.Authorization).toBe("Bearer access-token-123");
  });

  it("lève une erreur avec le message renvoyé par la fonction en cas d'échec", async () => {
    const fetchImpl = mockFetch(401, { error: "Session invalide" });
    await expect(fetchIntegrationStatuses("bad-token", baseUrl, fetchImpl)).rejects.toThrow("Session invalide");
  });
});
