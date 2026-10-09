import { describe, expect, it } from "vitest";
import {
  MICROSOFT_REFRESH_SCOPE,
  MicrosoftMailError,
  buildMicrosoftAuthorizationUrl,
  refreshMicrosoftAccessToken,
  sendMicrosoftMail,
} from "./microsoftCalendar.js";

describe("droits Microsoft (S39-7)", () => {
  it("la connexion demande Mail.Send", () => {
    const url = new URL(buildMicrosoftAuthorizationUrl({ clientId: "c", tenantId: "t", redirectUri: "https://x/cb", state: "s" }));
    expect(url.searchParams.get("scope")).toContain("Mail.Send");
  });

  it("le renouvellement utilise .default (connexions antérieures sans Mail.Send toujours valides)", async () => {
    let body = "";
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      body = String(init.body);
      return new Response(JSON.stringify({ access_token: "a", expires_in: 3600 }), { status: 200 });
    }) as unknown as typeof fetch;
    await refreshMicrosoftAccessToken({ refreshToken: "r", clientId: "c", clientSecret: "s", tenantId: "t" }, { fetchImpl });
    expect(new URLSearchParams(body).get("scope")).toBe(MICROSOFT_REFRESH_SCOPE);
  });
});

describe("sendMicrosoftMail", () => {
  it("envoie le message HTML avec pièce jointe .ics", async () => {
    let sent: { message: Record<string, unknown>; saveToSentItems: boolean } | null = null;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      expect(url).toBe("https://graph.microsoft.com/v1.0/me/sendMail");
      sent = JSON.parse(String(init.body));
      return new Response(null, { status: 202 });
    }) as unknown as typeof fetch;
    await sendMicrosoftMail(
      {
        accessToken: "t",
        to: [{ email: "alice@acme.fr", name: "Alice" }],
        subject: "Sujet",
        html: "<p>x</p>",
        attachments: [{ name: "rdv.ics", contentType: "text/calendar", contentBase64: "QkVHSU4=" }],
      },
      { fetchImpl },
    );
    expect(sent).toMatchObject({
      saveToSentItems: true,
      message: {
        subject: "Sujet",
        body: { contentType: "HTML", content: "<p>x</p>" },
        toRecipients: [{ emailAddress: { address: "alice@acme.fr", name: "Alice" } }],
        attachments: [{ "@odata.type": "#microsoft.graph.fileAttachment", name: "rdv.ics", contentType: "text/calendar", contentBytes: "QkVHSU4=" }],
      },
    });
  });

  it("403 : droit Mail.Send manquant signalé", async () => {
    const fetchImpl = (async () => new Response("ErrorAccessDenied", { status: 403 })) as unknown as typeof fetch;
    const err = await sendMicrosoftMail({ accessToken: "t", to: [{ email: "a@b.fr" }], subject: "s", html: "h" }, { fetchImpl }).catch((e) => e);
    expect(err).toBeInstanceOf(MicrosoftMailError);
    expect(err.missingPermission).toBe(true);
  });
});
