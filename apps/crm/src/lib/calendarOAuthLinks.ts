import { buildGoogleAuthorizationUrl, buildMicrosoftAuthorizationUrl } from "@dmh/calendar";

export interface CalendarOAuthConfig {
  googleClientId: string;
  microsoftClientId: string;
  microsoftTenantId: string;
  functionsBaseUrl: string;
}

/**
 * `state` porte le staffId ET l'origine du CRM (`::` comme séparateur — un
 * staffId est un UUID, une origine ne contient jamais `::`), pour que la
 * Edge Function de callback puisse rediriger directement vers l'onglet
 * `/settings/calendar` d'origine plutôt que d'afficher sa propre page HTML.
 */
function buildState(staffId: string, appOrigin: string): string {
  return `${staffId}::${appOrigin}`;
}

/** Pure : URL vers laquelle rediriger le staff pour connecter son Google Calendar. */
export function buildGoogleConnectUrl(config: CalendarOAuthConfig, staffId: string, appOrigin: string): string {
  return buildGoogleAuthorizationUrl({
    clientId: config.googleClientId,
    redirectUri: `${config.functionsBaseUrl}/google-calendar-oauth-callback`,
    state: buildState(staffId, appOrigin),
  });
}

/** Pure : URL vers laquelle rediriger le staff pour connecter son calendrier Microsoft/Outlook. */
export function buildMicrosoftConnectUrl(config: CalendarOAuthConfig, staffId: string, appOrigin: string): string {
  return buildMicrosoftAuthorizationUrl({
    clientId: config.microsoftClientId,
    tenantId: config.microsoftTenantId,
    redirectUri: `${config.functionsBaseUrl}/microsoft-calendar-oauth-callback`,
    state: buildState(staffId, appOrigin),
  });
}
