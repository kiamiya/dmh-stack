import { describe, expect, it, vi } from "vitest";
import { PappersApiError, fetchCompanyFromPappers } from "./client.js";

function mockFetch(status: number, body: unknown) {
  return vi.fn(async (url: string | URL) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    url: url.toString(),
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("fetchCompanyFromPappers", () => {
  it("interroge /entreprise avec le siren quand il est fourni", async () => {
    let calledUrl = "";
    const fetchImpl = vi.fn(async (url: string | URL) => {
      calledUrl = url.toString();
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ nom_entreprise: "ACME" }),
      };
    }) as unknown as typeof fetch;

    const result = await fetchCompanyFromPappers(
      { siren: "123456789" },
      { apiKey: "test-key", fetchImpl },
    );

    expect(calledUrl).toContain("/entreprise");
    expect(calledUrl).toContain("siren=123456789");
    expect(calledUrl).toContain("api_token=test-key");
    expect(result).toEqual({ nom_entreprise: "ACME" });
  });

  it("interroge /recherche avec le nom quand aucun siren n'est fourni, et retourne le premier résultat", async () => {
    let calledUrl = "";
    const fetchImpl = vi.fn(async (url: string | URL) => {
      calledUrl = url.toString();
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ resultats: [{ nom_entreprise: "ACME" }, { nom_entreprise: "AUTRE" }] }),
      };
    }) as unknown as typeof fetch;

    const result = await fetchCompanyFromPappers(
      { companyName: "ACME" },
      { apiKey: "test-key", fetchImpl },
    );

    expect(calledUrl).toContain("/recherche");
    expect(calledUrl).toContain("q=ACME");
    expect(result).toEqual({ nom_entreprise: "ACME" });
  });

  it("retourne null si la recherche par nom ne trouve aucun résultat", async () => {
    const fetchImpl = mockFetch(200, { resultats: [] });

    const result = await fetchCompanyFromPappers(
      { companyName: "INTROUVABLE" },
      { apiKey: "test-key", fetchImpl },
    );

    expect(result).toBeNull();
  });

  it("lève PappersApiError avec le status HTTP si la réponse n'est pas ok", async () => {
    const fetchImpl = mockFetch(429, { message: "rate limited" });

    await expect(
      fetchCompanyFromPappers({ siren: "123456789" }, { apiKey: "test-key", fetchImpl }),
    ).rejects.toMatchObject({ status: 429 } satisfies Partial<PappersApiError>);
  });

  it("lève une erreur si ni siren ni companyName ne sont fournis", async () => {
    await expect(fetchCompanyFromPappers({}, { apiKey: "test-key" })).rejects.toThrow(
      /siren ou companyName requis/,
    );
  });
});
