import { useMemo } from "react";
import { useProspects } from "./useProspects";
import { useContacts } from "./useContacts";
import { useCompanies } from "./useCompanies";
import { useOpportunities } from "./useOpportunities";
import { useTasks } from "./useTasks";
import { useIntegrations } from "./useIntegrations";
import { useListsCount } from "./useListsCount";

/**
 * Comptes réels affichés en badge dans la Sidebar (S30) — mêmes hooks
 * déjà utilisés ailleurs dans l'app, montés une seule fois par session
 * grâce au layout `<Outlet/>` (App.tsx). Aucun chiffre approximatif :
 * chaque valeur est un `.length`/filtre direct sur des données réelles.
 */
export function useSidebarCounts() {
  const { prospects } = useProspects();
  const { contacts } = useContacts();
  const { companies } = useCompanies();
  const { deals } = useOpportunities();
  const { tasks } = useTasks();
  const { integrations } = useIntegrations();
  const listsCount = useListsCount();

  const openTasksCount = useMemo(() => tasks.filter((t) => t.status !== "done").length, [tasks]);
  const integrationsLabel = useMemo(() => {
    if (integrations.length === 0) return null;
    const connected = integrations.filter((i) => i.configured).length;
    return `${connected}/${integrations.length}`;
  }, [integrations]);

  return {
    prospects: prospects.length,
    contacts: contacts.length,
    companies: companies.length,
    opportunities: deals.length,
    tasks: openTasksCount,
    lists: listsCount,
    integrations: integrationsLabel,
  };
}
