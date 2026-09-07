export interface IntegrationStatus {
  key: string;
  label: string;
  configured: boolean;
}

/** Appelle l'Edge Function integrations-status (authentifiée — même convention que calendarEvents.ts). */
export async function fetchIntegrationStatuses(
  accessToken: string,
  functionsBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<IntegrationStatus[]> {
  const res = await fetchImpl(`${functionsBaseUrl}/integrations-status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
  return data.integrations;
}
