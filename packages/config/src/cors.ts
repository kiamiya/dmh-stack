// En-têtes CORS des Edge Functions appelées depuis le navigateur via
// `supabase.functions.invoke` (CRM). supabase-js envoie `apikey` et
// `x-client-info` en plus de `Authorization`/`Content-Type` : le preflight
// (OPTIONS) doit tous les autoriser, sinon le navigateur bloque l'appel
// avant même qu'il parte (cas constaté sur analyze-import-columns le
// 2026-09-25). Origine `*` (décision Loïc du 2026-10-09) : l'authentification
// repose sur le JWT porté par `Authorization`, pas sur des cookies.

export const BROWSER_CORS_HEADERS: Readonly<Record<string, string>> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Réponse 204 au preflight CORS, ou `null` si la requête n'en est pas un. */
export function corsPreflightResponse(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: { ...BROWSER_CORS_HEADERS } });
}
