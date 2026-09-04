import { useCallback, useEffect, useState } from "react";
import type { OpportunityList } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { addDealsToList, createList, deleteList, listDealIdsInList, listLists, removeDealFromList } from "../services/dealLists";
import type { OpportunityListInsert } from "../services/dealLists";

export function useDealLists(clientId: string) {
  const [lists, setLists] = useState<OpportunityList[]>([]);
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

  async function create(input: OpportunityListInsert): Promise<void> {
    await createList(supabase, input);
    await load();
  }

  async function remove(id: string): Promise<void> {
    await deleteList(supabase, id);
    await load();
  }

  async function addDeals(listId: string, dealIds: string[]): Promise<void> {
    await addDealsToList(supabase, clientId, listId, dealIds);
  }

  async function removeDeal(listId: string, dealId: string): Promise<void> {
    await removeDealFromList(supabase, listId, dealId);
  }

  function listMemberIds(listId: string): Promise<string[]> {
    return listDealIdsInList(supabase, listId);
  }

  return { lists, loading, create, remove, addDeals, removeDeal, listMemberIds, reload: load };
}
