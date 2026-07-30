/**
 * Client Dropcontact — API **asynchrone** (contrairement à Pappers) :
 * une soumission (`submitDropcontactBatch`) renvoie un `request_id`, qu'il
 * faut ensuite interroger (`pollDropcontactBatch`) jusqu'à ce que le
 * traitement soit terminé. Basé sur la documentation développeur
 * (developer.dropcontact.com) et plusieurs sources tierces convergentes —
 * pas encore vérifié contre un vrai appel au moment d'écrire ce module
 * (voir TESTING.md pour la validation prévue).
 */
export interface DropcontactContact {
  first_name?: string;
  last_name?: string;
  company?: string;
  website?: string;
}

export interface DropcontactClientOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

export class DropcontactApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "DropcontactApiError";
  }
}

const DEFAULT_BASE_URL = "https://api.dropcontact.com/v1";

/**
 * Soumet un lot de contacts à enrichir. Retourne le `request_id` à
 * réutiliser avec `pollDropcontactBatch` pour récupérer le résultat une
 * fois le traitement terminé (asynchrone côté Dropcontact).
 */
export async function submitDropcontactBatch(
  contacts: DropcontactContact[],
  options: DropcontactClientOptions,
): Promise<string> {
  const fetchFn = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;

  const response = await fetchFn(`${baseUrl}/enrich/all`, {
    method: "POST",
    headers: {
      "X-Access-Token": options.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: contacts, language: "fr" }),
  });

  if (!response.ok) {
    throw new DropcontactApiError(
      response.status,
      `Dropcontact API (soumission) a répondu ${response.status} ${response.statusText}`,
    );
  }

  const body = await response.json();
  if (!body?.request_id) {
    throw new Error("Dropcontact : réponse de soumission sans request_id");
  }

  return body.request_id as string;
}

export type DropcontactPollResult =
  | { status: "pending"; reason: string | null }
  | { status: "ready"; results: unknown[] };

/**
 * Interroge l'état d'un lot précédemment soumis. Tant que Dropcontact n'a
 * pas fini de traiter le lot, la réponse est `{ status: "pending" }` — il
 * faut réessayer plus tard (l'Edge Function `enrich-dropcontact` ne bloque
 * pas dessus, elle répond "à réessayer" à l'appelant).
 */
export async function pollDropcontactBatch(
  requestId: string,
  options: DropcontactClientOptions,
): Promise<DropcontactPollResult> {
  const fetchFn = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;

  const response = await fetchFn(`${baseUrl}/enrich/all/${requestId}`, {
    headers: { "X-Access-Token": options.apiKey },
  });

  if (!response.ok) {
    throw new DropcontactApiError(
      response.status,
      `Dropcontact API (consultation) a répondu ${response.status} ${response.statusText}`,
    );
  }

  const body = await response.json();

  if (body?.success === false) {
    return { status: "pending", reason: body?.reason ?? null };
  }

  return { status: "ready", results: Array.isArray(body?.data) ? body.data : [] };
}
