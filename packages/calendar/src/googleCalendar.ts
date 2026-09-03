export interface GoogleClientOptions {
  /** Injecté pour les tests (mock) ; par défaut le `fetch` global. */
  fetchImpl?: typeof fetch;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

/** Pure : construit l'URL de consentement Google OAuth (aucun secret — le client secret n'y figure jamais). */
export function buildGoogleAuthorizationUrl(params: { clientId: string; redirectUri: string; state: string }): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email",
  );
  url.searchParams.set("state", params.state);
  return url.toString();
}

async function assertOk(res: Response, label: string): Promise<void> {
  if (!res.ok) throw new Error(`${label} failed: ${res.status} ${await res.text()}`);
}

export async function exchangeGoogleCode(
  params: { code: string; clientId: string; clientSecret: string; redirectUri: string },
  options: GoogleClientOptions = {},
): Promise<GoogleTokenResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  await assertOk(res, "Google token exchange");
  return res.json();
}

export async function refreshGoogleAccessToken(
  params: { refreshToken: string; clientId: string; clientSecret: string },
  options: GoogleClientOptions = {},
): Promise<GoogleTokenResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  await assertOk(res, "Google token refresh");
  return res.json();
}

export async function fetchGoogleUserEmail(
  accessToken: string,
  options: GoogleClientOptions = {},
): Promise<string | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.email ?? null;
}

export interface GoogleCalendarEvent {
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

/**
 * Structurellement identique au type retourné par
 * `mapMicrosoftEventsToSummaries` (microsoftCalendar.ts) mais dupliqué
 * plutôt que partagé via un fichier commun — un import interne entre
 * deux fichiers de ce package casse la résolution Deno des Edge
 * Functions (même limite déjà rencontrée pour `packages/scoring`, voir
 * PROGRESS.md S7).
 */
export interface EventSummary {
  title: string;
  start: string;
  end: string;
}

/** Pure : convertit la réponse brute Google Calendar en intervalles occupés génériques — ignore les événements "journée entière" (pas de `dateTime`, seulement `date`). */
export function mapGoogleEventsToBusyIntervals(events: GoogleCalendarEvent[]): Array<{ start: string; end: string }> {
  return events
    .filter((e) => e.start?.dateTime && e.end?.dateTime)
    .map((e) => ({ start: e.start!.dateTime!, end: e.end!.dateTime! }));
}

/** Pure : convertit la réponse brute Google Calendar en résumés affichables (titre + horaires) — pour la liste "prochains événements". */
export function mapGoogleEventsToSummaries(events: GoogleCalendarEvent[]): EventSummary[] {
  return events
    .filter((e) => e.start?.dateTime && e.end?.dateTime)
    .map((e) => ({ title: e.summary?.trim() || "Sans titre", start: e.start!.dateTime!, end: e.end!.dateTime! }));
}

export async function fetchGoogleBusyEvents(
  params: { accessToken: string; timeMin: string; timeMax: string },
  options: GoogleClientOptions = {},
): Promise<GoogleCalendarEvent[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", params.timeMin);
  url.searchParams.set("timeMax", params.timeMax);
  url.searchParams.set("singleEvents", "true");
  const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${params.accessToken}` } });
  await assertOk(res, "Google events fetch");
  const data = await res.json();
  return data.items ?? [];
}

export async function createGoogleEvent(
  params: { accessToken: string; summary: string; startIso: string; endIso: string; guestEmail?: string },
  options: GoogleClientOptions = {},
): Promise<{ id: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${params.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: params.summary,
      start: { dateTime: params.startIso },
      end: { dateTime: params.endIso },
      attendees: params.guestEmail ? [{ email: params.guestEmail }] : undefined,
    }),
  });
  await assertOk(res, "Google event creation");
  return res.json();
}
