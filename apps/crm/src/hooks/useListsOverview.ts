import { useEffect, useMemo, useState } from "react";
import type { CompanyList, ContactList, OpportunityList } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { useClients } from "./useClients";
import { useContacts } from "./useContacts";
import { useCompanies } from "./useCompanies";
import { useOpportunities } from "./useOpportunities";
import { listAllContactLists, listContactIdsInList } from "../services/contactLists";
import { listAllCompanyLists, listCompanyIdsInList } from "../services/companyLists";
import { listAllOpportunityLists, listDealIdsInList } from "../services/dealLists";
import { computeListOverviewRows } from "../lib/listsOverview";

/**
 * Vue d'ensemble de toutes les listes (Contacts/Entreprises/Opportunités,
 * tous clients) — pour /lists. Les effectifs statiques sont récupérés en
 * parallèle (une liste = un aller-retour, échelle staff attendue modeste) ;
 * les dynamiques sont calculées côté pur via `computeListOverviewRows`
 * à partir des jeux d'entités déjà chargés par les hooks existants.
 */
export function useListsOverview() {
  const clients = useClients();
  const { contacts, loading: contactsLoading } = useContacts();
  const { companies, loading: companiesLoading } = useCompanies();
  const { deals, loading: dealsLoading } = useOpportunities();

  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [companyLists, setCompanyLists] = useState<CompanyList[]>([]);
  const [opportunityLists, setOpportunityLists] = useState<OpportunityList[]>([]);
  const [staticMemberCounts, setStaticMemberCounts] = useState<Map<string, number>>(new Map());
  const [listsLoading, setListsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setListsLoading(true);

    Promise.all([listAllContactLists(supabase), listAllCompanyLists(supabase), listAllOpportunityLists(supabase)])
      .then(async ([cLists, coLists, oLists]) => {
        if (cancelled) return;
        setContactLists(cLists);
        setCompanyLists(coLists);
        setOpportunityLists(oLists);

        const [contactCounts, companyCounts, opportunityCounts] = await Promise.all([
          Promise.all(
            cLists.filter((l) => l.rules === null).map((l) => listContactIdsInList(supabase, l.id).then((ids) => [l.id, ids.length] as const)),
          ),
          Promise.all(
            coLists.filter((l) => l.rules === null).map((l) => listCompanyIdsInList(supabase, l.id).then((ids) => [l.id, ids.length] as const)),
          ),
          Promise.all(
            oLists.filter((l) => l.rules === null).map((l) => listDealIdsInList(supabase, l.id).then((ids) => [l.id, ids.length] as const)),
          ),
        ]);

        if (cancelled) return;
        const counts = new Map<string, number>();
        for (const [id, count] of [...contactCounts, ...companyCounts, ...opportunityCounts]) counts.set(id, count);
        setStaticMemberCounts(counts);
      })
      .catch(() => {
        if (!cancelled) {
          setContactLists([]);
          setCompanyLists([]);
          setOpportunityLists([]);
        }
      })
      .finally(() => {
        if (!cancelled) setListsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () => computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, deals, staticMemberCounts),
    [contactLists, companyLists, opportunityLists, clients, contacts, companies, deals, staticMemberCounts],
  );

  return { rows, loading: listsLoading || contactsLoading || companiesLoading || dealsLoading };
}
