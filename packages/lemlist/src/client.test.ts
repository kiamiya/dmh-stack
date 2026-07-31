import { describe, expect, it, vi } from "vitest";
import { LemlistApiError, fetchAllLemlistActivities, fetchLemlistActivities } from "./client.js";
import type { LemlistActivity } from "./client.js";

function activity(overrides: Partial<LemlistActivity> = {}): LemlistActivity {
  return { _id: "act_1", type: "linkedinInviteDone", createdAt: "2026-07-31T00:00:00Z", ...overrides };
}

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("fetchLemlistActivities", () => {
  it("sends Basic Auth with an empty username and the API key as password", async () => {
    let headers: HeadersInit | undefined;
    const fetchImpl = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      headers = init?.headers;
      return { ok: true, status: 200, statusText: "OK", json: async () => [] };
    }) as unknown as typeof fetch;

    await fetchLemlistActivities({}, { apiKey: "my-key", fetchImpl });

    const authHeader = (headers as Record<string, string>).Authorization;
    expect(authHeader).toBe(`Basic ${btoa(":my-key")}`);
  });

  it("builds the query string with version=v2 and the provided filters", async () => {
    let calledUrl = "";
    const fetchImpl = vi.fn(async (url: string | URL) => {
      calledUrl = url.toString();
      return { ok: true, status: 200, statusText: "OK", json: async () => [] };
    }) as unknown as typeof fetch;

    await fetchLemlistActivities(
      { campaignId: "camp_1", minDate: "2026-01-01", limit: 50, offset: 10 },
      { apiKey: "k", fetchImpl },
    );

    expect(calledUrl).toContain("version=v2");
    expect(calledUrl).toContain("campaignId=camp_1");
    expect(calledUrl).toContain("minDate=2026-01-01");
    expect(calledUrl).toContain("limit=50");
    expect(calledUrl).toContain("offset=10");
  });

  it("returns the parsed array of activities", async () => {
    const activities = [activity(), activity({ _id: "act_2", type: "linkedinReplied" })];
    const fetchImpl = mockFetch(200, activities);

    const result = await fetchLemlistActivities({}, { apiKey: "k", fetchImpl });

    expect(result).toEqual(activities);
  });

  it("returns an empty array if the response body is not an array", async () => {
    const fetchImpl = mockFetch(200, { unexpected: "shape" });
    const result = await fetchLemlistActivities({}, { apiKey: "k", fetchImpl });
    expect(result).toEqual([]);
  });

  it("throws LemlistApiError with the HTTP status when the response is not ok", async () => {
    const fetchImpl = mockFetch(401, { message: "unauthorized" });

    await expect(fetchLemlistActivities({}, { apiKey: "bad-key", fetchImpl })).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<LemlistApiError>);
  });
});

describe("fetchAllLemlistActivities", () => {
  it("stops after a single page when it returns fewer than 100 results", async () => {
    const fetchImpl = mockFetch(200, [activity(), activity({ _id: "act_2" })]);

    const result = await fetchAllLemlistActivities({}, { apiKey: "k", fetchImpl });

    expect(result).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("paginates until a page returns fewer than 100 results", async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => activity({ _id: `act_${i}` }));
    const lastPage = [activity({ _id: "act_last" })];

    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      return { ok: true, status: 200, statusText: "OK", json: async () => (call === 1 ? fullPage : lastPage) };
    }) as unknown as typeof fetch;

    const result = await fetchAllLemlistActivities({}, { apiKey: "k", fetchImpl });

    expect(result).toHaveLength(101);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
