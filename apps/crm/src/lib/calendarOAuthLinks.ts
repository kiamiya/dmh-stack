import { buildGoogleAuthorizationUrl, buildMicrosoftAuthorizationUrl } from "@dmh/calendar";

export interface CalendarOAuthConfig {
  googleClientId: string;
  microsoftClientId: string;
  microsoftTenantId: string;
  functionsBaseUrl: string;
}

/** Pure : URL vers laquelle rediriger le staff pour connecter son Google Calendar. */
export function buildGoogleConnectUrl(config: CalendarOAuthConfig, staffId: string): string {
  return buildGoogleAuthorizationUrl({
    clientId: config.googleClientId,
    redirectUri: `${config.functionsBaseUrl}/google-calendar-oauth-callback`,
    state: staffId,
  });
}

/** Pure : URL vers laquelle rediriger le staff pour connecter son calendrier Microsoft/Outlook. */
export function buildMicrosoftConnectUrl(config: CalendarOAuthConfig, staffId: string): string {
  return buildMicrosoftAuthorizationUrl({
    clientId: config.microsoftClientId,
    tenantId: config.microsoftTenantId,
    redirectUri: `${config.functionsBaseUrl}/microsoft-calendar-oauth-callback`,
    state: staffId,
  });
}
