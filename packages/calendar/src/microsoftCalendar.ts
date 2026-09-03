export interface MicrosoftClientOptions {
  /** Injecté pour les tests (mock) ; par défaut le `fetch` global. */
  fetchImpl?: typeof fetch;
}

const SCOPE = "offline_access Calendars.ReadWrite User.Read";

/** Pure : construit l'URL de consentement Microsoft OAuth (aucun secret). */
export function buildMicrosoftAuthorizationUrl(params: {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(`https://login.microsoftonline.com/${params.tenantId}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", params.state);
  return url.toString();
}

export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

async function assertOk(res: Response, label: string): Promise<void> {
  if (!res.ok) throw new Error(`${label} failed: ${res.status} ${await res.text()}`);
}

export async function exchangeMicrosoftCode(
  params: { code: string; clientId: string; clientSecret: string; redirectUri: string; tenantId: string },
  options: MicrosoftClientOptions = {},
): Promise<MicrosoftTokenResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl(`https://login.microsoftonline.com/${params.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
      scope: SCOPE,
    }),
  });
  await assertOk(res, "Microsoft token exchange");
  return res.json();
}

export async function refreshMicrosoftAccessToken(
  params: { refreshToken: string; clientId: string; clientSecret: string; tenantId: string },
  options: MicrosoftClientOptions = {},
): Promise<MicrosoftTokenResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl(`https://login.microsoftonline.com/${params.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      grant_type: "refresh_token",
      scope: SCOPE,
    }),
  });
  await assertOk(res, "Microsoft token refresh");
  return res.json();
}

export async function fetchMicrosoftUserEmail(
  accessToken: string,
  options: MicrosoftClientOptions = {},
): Promise<string | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.mail ?? data.userPrincipalName ?? null;
}

export interface MicrosoftCalendarEvent {
  start?: { dateTime?: string };
  end?: { dateTime?: string };
}

/**
 * Pure : convertit la réponse brute Microsoft Graph en intervalles occupés
 * génériques. Graph renvoie des `dateTime` sans suffixe de fuseau — on
 * force le suffixe UTC (`Z`), cohérent avec l'en-tête
 * `Prefer: outlook.timezone="UTC"` posé sur la requête `calendarview`.
 */
export function mapMicrosoftEventsToBusyIntervals(
  events: MicrosoftCalendarEvent[],
): Array<{ start: string; end: string }> {
  return events
    .filter((e) => e.start?.dateTime && e.end?.dateTime)
    .map((e) => ({
      start: e.start!.dateTime!.endsWith("Z") ? e.start!.dateTime! : `${e.start!.dateTime}Z`,
      end: e.end!.dateTime!.endsWith("Z") ? e.end!.dateTime! : `${e.end!.dateTime}Z`,
    }));
}

export async function fetchMicrosoftBusyEvents(
  params: { accessToken: string; startIso: string; endIso: string },
  options: MicrosoftClientOptions = {},
): Promise<MicrosoftCalendarEvent[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarview");
  url.searchParams.set("startDateTime", params.startIso);
  url.searchParams.set("endDateTime", params.endIso);
  const res = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${params.accessToken}`, Prefer: 'outlook.timezone="UTC"' },
  });
  await assertOk(res, "Microsoft events fetch");
  const data = await res.json();
  return data.value ?? [];
}

export async function createMicrosoftEvent(
  params: { accessToken: string; subject: string; startIso: string; endIso: string; guestEmail?: string; guestName?: string },
  options: MicrosoftClientOptions = {},
): Promise<{ id: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${params.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: params.subject,
      start: { dateTime: params.startIso, timeZone: "UTC" },
      end: { dateTime: params.endIso, timeZone: "UTC" },
      attendees: params.guestEmail
        ? [{ emailAddress: { address: params.guestEmail, name: params.guestName ?? params.guestEmail }, type: "required" }]
        : [],
    }),
  });
  await assertOk(res, "Microsoft event creation");
  return res.json();
}
