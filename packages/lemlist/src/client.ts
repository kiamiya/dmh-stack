/**
 * Client Lemlist (S7, item 3 — brief §1.2.4). Le brief décrit une "synchro
 * manuelle" (le SDR/Loïc déclenche l'import, pas un webhook en temps
 * réel) — mais plutôt que de deviner un format d'export CSV, on utilise la
 * vraie API Lemlist (developer.lemlist.com, vérifiée par recherche avant
 * d'écrire ce module) : `GET /activities`, auth Basic (utilisateur vide,
 * mot de passe = clé API), pagination `limit`/`offset` (max 100/page).
 */
export interface LemlistActivity {
  _id: string;
  type: string;
  leadId?: string;
  leadEmail?: string;
  leadFirstName?: string;
  leadLastName?: string;
  campaignId?: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface FetchActivitiesParams {
  campaignId?: string;
  leadId?: string;
  type?: string;
  minDate?: string;
  maxDate?: string;
  limit?: number;
  offset?: number;
}

export interface LemlistClientOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

export class LemlistApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "LemlistApiError";
  }
}

const DEFAULT_BASE_URL = "https://api.lemlist.com/api";
const MAX_PAGE_SIZE = 100;

function buildAuthHeader(apiKey: string): string {
  return `Basic ${btoa(`:${apiKey}`)}`;
}

/** Une seule page (l'API plafonne à 100 résultats par appel). */
export async function fetchLemlistActivities(
  params: FetchActivitiesParams,
  options: LemlistClientOptions,
): Promise<LemlistActivity[]> {
  const fetchFn = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;

  const query = new URLSearchParams({ version: "v2" });
  if (params.campaignId) query.set("campaignId", params.campaignId);
  if (params.leadId) query.set("leadId", params.leadId);
  if (params.type) query.set("type", params.type);
  if (params.minDate) query.set("minDate", params.minDate);
  if (params.maxDate) query.set("maxDate", params.maxDate);
  query.set("limit", String(params.limit ?? MAX_PAGE_SIZE));
  query.set("offset", String(params.offset ?? 0));

  const response = await fetchFn(`${baseUrl}/activities?${query.toString()}`, {
    headers: { Authorization: buildAuthHeader(options.apiKey) },
  });

  if (!response.ok) {
    throw new LemlistApiError(
      response.status,
      `Lemlist API (activities) a répondu ${response.status} ${response.statusText}`,
    );
  }

  const body = await response.json();
  return Array.isArray(body) ? (body as LemlistActivity[]) : [];
}

/** Toutes les pages, jusqu'à ce qu'une page renvoie moins que `MAX_PAGE_SIZE` résultats. */
export async function fetchAllLemlistActivities(
  params: FetchActivitiesParams,
  options: LemlistClientOptions,
): Promise<LemlistActivity[]> {
  let offset = params.offset ?? 0;
  const all: LemlistActivity[] = [];

  while (true) {
    const page = await fetchLemlistActivities({ ...params, limit: MAX_PAGE_SIZE, offset }, options);
    all.push(...page);
    if (page.length < MAX_PAGE_SIZE) break;
    offset += MAX_PAGE_SIZE;
  }

  return all;
}
