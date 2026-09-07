import { useCallback, useEffect, useState } from "react";
import { useSession } from "../lib/useSession";
import { calendarOAuthConfig } from "../lib/supabase";
import { fetchIntegrationStatuses } from "../services/integrations";
import type { IntegrationStatus } from "../services/integrations";

export function useIntegrations() {
  const { session } = useSession();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return fetchIntegrationStatuses(accessToken, calendarOAuthConfig.functionsBaseUrl)
      .then(setIntegrations)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  useEffect(() => {
    load();
  }, [load]);

  return { integrations, loading, error, reload: load };
}
