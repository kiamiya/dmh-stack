import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [staticMemberIds, setStaticMemberIds] = useState<Map<string, string[]>>(new Map());
  const [listsLoading, setListsLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setListsLoading(true);

    const promise = Promise.all([listAllContactLists(supabase), listAllCompanyLists(supabase), listAllOpportunityLists(supabase)])
      .then(async ([cLists, coLists, oLists]) => {
        if (cancelled) return;
        setContactLists(cLists);
        setCompanyLists(coLists);
        setOpportunityLists(oLists);

        const [contactIds, companyIds, opportunityIds] = await Promise.all([
          Promise.all(cLists.filter((l) => l.rules === null).map((l) => listContactIdsInList(supabase, l.id).then((ids) => [l.id, ids] as const))),
          Promise.all(coLists.filter((l) => l.rules === null).map((l) => listCompanyIdsInList(supabase, l.id).then((ids) => [l.id, ids] as const))),
          Promise.all(oLists.filter((l) => l.rules === null).map((l) => listDealIdsInList(supabase, l.id).then((ids) => [l.id, ids] as const))),
        ]);

        if (cancelled) return;
        const idsByList = new Map<string, string[]>();
        for (const [id, ids] of [...contactIds, ...companyIds, ...opportunityIds]) idsByList.set(id, ids);
        setStaticMemberIds(idsByList);
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

    return {
      promise,
      cancel: () => {
        cancelled = true;
      },
    };
  }, []);

  useEffect(() => {
    const { cancel } = load();
    return cancel;
  }, [load]);

  const rows = useMemo(
    () => computeListOverviewRows(contactLists, companyLists, opportunityLists, clients, contacts, companies, deals, staticMemberIds),
    [contactLists, companyLists, opportunityLists, clients, contacts, companies, deals, staticMemberIds],
  );

  return {
    rows,
    loading: listsLoading || contactsLoading || companiesLoading || dealsLoading,
    reload: () => load().promise,
  };
}
