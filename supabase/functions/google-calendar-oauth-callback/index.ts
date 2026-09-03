// Edge Function Supabase (Deno) — S16 : callback OAuth Google Calendar.
//
// Déclenchement : redirection du navigateur par Google après consentement
// (GET ?code=...&state=<staff_id>), pas un appel programmatique — d'où une
// réponse HTML directe plutôt qu'un JSON, et pas de vérification CORS.
//
// `state` porte `<staff_id>::<origine du CRM>` en clair (pas signé) —
// limite assumée pour une v1 avec une poignée d'utilisateurs internes de
// confiance, voir PROGRESS.md. L'origine sert à rediriger directement
// vers `/settings/calendar` une fois la connexion faite plutôt que de
// laisser le staff sur cette URL de fonction — cf. apps/crm/src/lib/
// calendarOAuthLinks.ts pour la construction du state.

import { createClient } from "@supabase/supabase-js";
import { loadCalendarFunctionEnv } from "../../../packages/config/src/env.ts";
import { exchangeGoogleCode, fetchGoogleUserEmail } from "../../../packages/calendar/src/googleCalendar.ts";

function htmlResponse(body: string, status: number): Response {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function successPage(email: string | null): string {
  return `<!doctype html><html><body style="font-family: sans-serif; padding: 2rem;">
    <h1>Calendrier Google connecté ✅</h1>
    <p>${email ? `Compte connecté : ${email}` : ""}</p>
    <p>Tu peux fermer cet onglet et retourner sur le CRM.</p>
  </body></html>`;
}

function errorPage(message: string): string {
  return `<!doctype html><html><body style="font-family: sans-serif; padding: 2rem;">
    <h1>Échec de la connexion ❌</h1>
    <p>${message}</p>
  </body></html>`;
}

/** Redirige vers l'onglet CRM d'origine si connu et sûr (http/https), sinon retombe sur la page HTML statique. */
function redirectOrHtml(appOrigin: string | null, query: string, fallbackHtml: string, status: number): Response {
  if (appOrigin && /^https?:\/\//.test(appOrigin)) {
    return new Response(null, { status: 302, headers: { Location: `${appOrigin}/settings/calendar?${query}` } });
  }
  return htmlResponse(fallbackHtml, status);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const rawState = url.searchParams.get("state");
  const [staffId, appOrigin] = rawState ? rawState.split("::") : [null, null];
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return redirectOrHtml(appOrigin, "calendar_error=1", errorPage(`Google a renvoyé une erreur : ${oauthError}`), 400);
  }
  if (!code || !staffId) {
    return htmlResponse(errorPage("Paramètres manquants (code/state)."), 400);
  }

  let env;
  try {
    env = loadCalendarFunctionEnv(Deno.env.toObject());
  } catch (err) {
    return redirectOrHtml(appOrigin, "calendar_error=1", errorPage(`Configuration serveur invalide : ${(err as Error).message}`), 500);
  }

  const redirectUri = `${env.SUPABASE_URL}/functions/v1/google-calendar-oauth-callback`;

  try {
    const tokens = await exchangeGoogleCode({
      code,
      clientId: env.GOOGLE_CALENDAR_CLIENT_ID,
      clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
      redirectUri,
    });
    const email = await fetchGoogleUserEmail(tokens.access_token);

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { data: existing } = await supabase
      .from("staff_calendar_connections")
      .select("id, booking_token")
      .eq("staff_id", staffId)
      .eq("provider", "google")
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("staff_calendar_connections")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? undefined,
          token_expires_at: expiresAt,
          provider_account_email: email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      if (!tokens.refresh_token) {
        return redirectOrHtml(
          appOrigin,
          "calendar_error=1",
          errorPage("Google n'a pas renvoyé de refresh_token (reconnecte-toi en révoquant l'accès existant d'abord)."),
          400,
        );
      }
      const bookingToken = crypto.randomUUID().replace(/-/g, "");
      const { error } = await supabase.from("staff_calendar_connections").insert({
        staff_id: staffId,
        provider: "google",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        provider_account_email: email,
        booking_token: bookingToken,
      });
      if (error) throw new Error(error.message);
    }

    return redirectOrHtml(appOrigin, "calendar_connected=google", successPage(email), 200);
  } catch (err) {
    return redirectOrHtml(appOrigin, "calendar_error=1", errorPage((err as Error).message), 500);
  }
});
