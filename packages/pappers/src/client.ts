export interface PappersLookupParams {
  siren?: string;
  companyName?: string;
}

export interface PappersClientOptions {
  apiKey: string;
  /** Injecté pour les tests (mock) ; par défaut le `fetch` global. */
  fetchImpl?: typeof fetch;
  /** Surchargeable pour les tests, pointe vers l'API Pappers réelle sinon. */
  baseUrl?: string;
}

export class PappersApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PappersApiError";
  }
}

const DEFAULT_BASE_URL = "https://api.pappers.fr/v2";

/**
 * Appelle l'API Pappers pour récupérer les données d'une entreprise, par
 * SIREN si disponible (endpoint `/entreprise`, le plus fiable), sinon par
 * recherche textuelle sur le nom (endpoint `/recherche`, retourne une liste
 * dont on prend le premier résultat).
 *
 * Retourne le JSON brut tel quel : le mapping vers les champs `companies`
 * se fait séparément dans `mapper.ts`, pour ne jamais perdre de données même
 * si le mapping est incomplet ou si l'API évolue.
 */
export async function fetchCompanyFromPappers(
  params: PappersLookupParams,
  options: PappersClientOptions,
): Promise<unknown> {
  if (!params.siren && !params.companyName) {
    throw new Error("fetchCompanyFromPappers: siren ou companyName requis");
  }

  const fetchFn = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;

  const url = new URL(params.siren ? `${baseUrl}/entreprise` : `${baseUrl}/recherche`);
  url.searchParams.set("api_token", options.apiKey);
  if (params.siren) {
    url.searchParams.set("siren", params.siren);
  } else {
    url.searchParams.set("q", params.companyName as string);
  }

  const response = await fetchFn(url.toString());
  if (!response.ok) {
    throw new PappersApiError(
      response.status,
      `Pappers API a répondu ${response.status} ${response.statusText}`,
    );
  }

  const body = await response.json();

  // L'endpoint /recherche renvoie une liste de résultats ; on prend le
  // premier (le plus pertinent selon Pappers), pas le format déjà unitaire
  // de /entreprise.
  if (!params.siren && body && typeof body === "object" && Array.isArray((body as { resultats?: unknown[] }).resultats)) {
    return (body as { resultats: unknown[] }).resultats[0] ?? null;
  }

  return body;
}
