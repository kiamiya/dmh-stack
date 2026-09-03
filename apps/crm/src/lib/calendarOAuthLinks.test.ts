import { describe, expect, it } from "vitest";
import { buildGoogleConnectUrl, buildMicrosoftConnectUrl } from "./calendarOAuthLinks";

const config = {
  googleClientId: "google-client-1",
  microsoftClientId: "ms-client-1",
  microsoftTenantId: "tenant-1",
  functionsBaseUrl: "https://example.supabase.co/functions/v1",
};

describe("buildGoogleConnectUrl", () => {
  it("pointe vers la bonne Edge Function de callback avec le staffId + l'origine en state", () => {
    const url = new URL(buildGoogleConnectUrl(config, "staff-42", "http://localhost:5173"));
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://example.supabase.co/functions/v1/google-calendar-oauth-callback",
    );
    expect(url.searchParams.get("state")).toBe("staff-42::http://localhost:5173");
    expect(url.searchParams.get("client_id")).toBe("google-client-1");
  });
});

describe("buildMicrosoftConnectUrl", () => {
  it("pointe vers la bonne Edge Function de callback avec le bon tenant", () => {
    const url = new URL(buildMicrosoftConnectUrl(config, "staff-42", "http://localhost:5173"));
    expect(url.pathname).toContain("/tenant-1/");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://example.supabase.co/functions/v1/microsoft-calendar-oauth-callback",
    );
    expect(url.searchParams.get("state")).toBe("staff-42::http://localhost:5173");
  });
});
