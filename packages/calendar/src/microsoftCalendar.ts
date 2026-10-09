export interface MicrosoftClientOptions {
  /** Injecté pour les tests (mock) ; par défaut le `fetch` global. */
  fetchImpl?: typeof fetch;
}

// S39-7 : `Mail.Send` pour envoyer les e-mails de RDV depuis la boîte de
// l'hôte (décision Loïc du 09/10). Une connexion antérieure ne l'a pas :
// l'hôte doit reconnecter son calendrier une fois.
export const MICROSOFT_SCOPE = "offline_access Calendars.ReadWrite User.Read Mail.Send";
const SCOPE = MICROSOFT_SCOPE;
// Au renouvellement, `.default` renvoie tous les droits DÉJÀ accordés : une
// connexion antérieure (sans Mail.Send) continue donc de fonctionner, au
// lieu d'échouer parce qu'on redemanderait un droit jamais consenti.
export const MICROSOFT_REFRESH_SCOPE = "offline_access https://graph.microsoft.com/.default";

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
      scope: MICROSOFT_REFRESH_SCOPE,
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
  id?: string;
  subject?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  /** "free" | "tentative" | "busy" | "oof" | "workingElsewhere" | "unknown" — un événement "free" ne bloque pas un créneau. */
  showAs?: string;
  isCancelled?: boolean;
}

function normalizeUtc(dateTime: string): string {
  return dateTime.endsWith("Z") ? dateTime : `${dateTime}Z`;
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
    .filter((e) => e.start?.dateTime && e.end?.dateTime && e.showAs !== "free" && e.isCancelled !== true)
    .map((e) => ({
      start: normalizeUtc(e.start!.dateTime!),
      end: normalizeUtc(e.end!.dateTime!),
    }));
}

/** Pure : convertit la réponse brute Microsoft Graph en résumés affichables (id + titre + horaires) — pour la liste "prochains événements" et leur édition. */
export function mapMicrosoftEventsToSummaries(
  events: MicrosoftCalendarEvent[],
): Array<{ id: string; title: string; start: string; end: string }> {
  return events
    .filter((e) => e.id && e.start?.dateTime && e.end?.dateTime)
    .map((e) => ({
      id: e.id!,
      title: e.subject?.trim() || "Sans titre",
      start: normalizeUtc(e.start!.dateTime!),
      end: normalizeUtc(e.end!.dateTime!),
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
  url.searchParams.set("$top", "500");
  // Graph pagine (10 événements par défaut) : on suit `@odata.nextLink`,
  // sinon les disponibilités ignoreraient tout ce qui dépasse la 1re page.
  const events: MicrosoftCalendarEvent[] = [];
  let next: string | null = url.toString();
  for (let page = 0; next && page < 20; page++) {
    const res: Response = await fetchImpl(next, {
      headers: { Authorization: `Bearer ${params.accessToken}`, Prefer: 'outlook.timezone="UTC"' },
    });
    await assertOk(res, "Microsoft events fetch");
    const data: { value?: MicrosoftCalendarEvent[]; "@odata.nextLink"?: string } = await res.json();
    events.push(...(data.value ?? []));
    next = data["@odata.nextLink"] ?? null;
  }
  return events;
}

export interface MicrosoftEventExtras {
  /** "tentative" pour un créneau provisoire (S39-6), "busy" une fois confirmé. */
  showAs?: "free" | "tentative" | "busy";
  bodyHtml?: string;
  /** Crée une réunion Teams (compte Microsoft 365 professionnel). */
  isOnlineMeeting?: boolean;
}

export interface MicrosoftEventResult {
  id: string;
  onlineMeeting?: { joinUrl?: string } | null;
}

function extrasToBody(extras: MicrosoftEventExtras): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (extras.showAs) body.showAs = extras.showAs;
  if (extras.bodyHtml !== undefined) body.body = { contentType: "HTML", content: extras.bodyHtml };
  if (extras.isOnlineMeeting !== undefined) {
    body.isOnlineMeeting = extras.isOnlineMeeting;
    if (extras.isOnlineMeeting) body.onlineMeetingProvider = "teamsForBusiness";
  }
  return body;
}

export async function createMicrosoftEvent(
  params: { accessToken: string; subject: string; startIso: string; endIso: string; guestEmail?: string; guestName?: string } & MicrosoftEventExtras,
  options: MicrosoftClientOptions = {},
): Promise<MicrosoftEventResult> {
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
      ...extrasToBody(params),
    }),
  });
  await assertOk(res, "Microsoft event creation");
  return res.json();
}

/** Met à jour un événement existant (PATCH — ne touche que les champs fournis). */
export async function updateMicrosoftEvent(
  params: { accessToken: string; eventId: string; subject?: string; startIso?: string; endIso?: string } & MicrosoftEventExtras,
  options: MicrosoftClientOptions = {},
): Promise<MicrosoftEventResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const body: Record<string, unknown> = extrasToBody(params);
  if (params.subject !== undefined) body.subject = params.subject;
  if (params.startIso !== undefined) body.start = { dateTime: params.startIso, timeZone: "UTC" };
  if (params.endIso !== undefined) body.end = { dateTime: params.endIso, timeZone: "UTC" };

  const res = await fetchImpl(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(params.eventId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${params.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await assertOk(res, "Microsoft event update");
  return res.json();
}

/** Supprime un événement (créneau provisoire refusé ou RDV annulé) — un événement déjà supprimé (404) n'est pas une erreur. */
export async function deleteMicrosoftEvent(
  params: { accessToken: string; eventId: string },
  options: MicrosoftClientOptions = {},
): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(params.eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  if (res.status === 404) return;
  await assertOk(res, "Microsoft event deletion");
}

export interface MailAttachment {
  name: string;
  contentType: string;
  /** Contenu encodé en base64. */
  contentBase64: string;
}

/** Erreur d'envoi d'e-mail ; `missingPermission` = la connexion n'a pas le droit Mail.Send (reconnexion nécessaire). */
export class MicrosoftMailError extends Error {
  constructor(
    message: string,
    readonly missingPermission: boolean,
  ) {
    super(message);
  }
}

/** Envoie un e-mail HTML depuis la boîte de l'utilisateur connecté (Graph `sendMail`, S39-7). */
export async function sendMicrosoftMail(
  params: { accessToken: string; to: Array<{ email: string; name?: string }>; subject: string; html: string; attachments?: MailAttachment[] },
  options: MicrosoftClientOptions = {},
): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: { Authorization: `Bearer ${params.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: params.subject,
        body: { contentType: "HTML", content: params.html },
        toRecipients: params.to.map((r) => ({ emailAddress: { address: r.email, name: r.name ?? r.email } })),
        attachments: (params.attachments ?? []).map((a) => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: a.name,
          contentType: a.contentType,
          contentBytes: a.contentBase64,
        })),
      },
      saveToSentItems: true,
    }),
  });
  if (res.ok) return;
  const text = await res.text().catch(() => "");
  throw new MicrosoftMailError(`Microsoft sendMail failed (${res.status}): ${text}`, res.status === 403 || res.status === 401);
}
