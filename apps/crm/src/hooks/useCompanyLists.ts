import { useCallback, useEffect, useState } from "react";
import type { CompanyList } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { addCompaniesToList, createList, deleteList, listCompanyIdsInList, listLists, removeCompanyFromList } from "../services/companyLists";
import type { CompanyListInsert } from "../services/companyLists";

export function useCompanyLists(clientId: string) {
  const [lists, setLists] = useState<CompanyList[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!clientId) {
      setLists([]);
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return listLists(supabase, clientId)
      .then(setLists)
      .catch(() => setLists([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(input: CompanyListInsert): Promise<void> {
    await createList(supabase, input);
    await load();
  }

  async function remove(id: string): Promise<void> {
    await deleteList(supabase, id);
    await load();
  }

  async function addCompanies(listId: string, companyIds: string[]): Promise<void> {
    await addCompaniesToList(supabase, clientId, listId, companyIds);
  }

  async function removeCompany(listId: string, companyId: string): Promise<void> {
    await removeCompanyFromList(supabase, listId, companyId);
  }

  function listMemberIds(listId: string): Promise<string[]> {
    return listCompanyIdsInList(supabase, listId);
  }

  return { lists, loading, create, remove, addCompanies, removeCompany, listMemberIds, reload: load };
}
