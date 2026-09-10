import { useCallback, useEffect, useState } from "react";
import type { PipelineStage } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { getDeal, updateDeal, updateDealStage } from "../services/deals";
import type { DealRow, DealUpdate } from "../services/deals";
import { listStages } from "../services/pipelines";
import { addDealContactRelation, listContactsForDeal, removeDealContactRelation } from "../services/dealContacts";
import type { DealContactRelationRow } from "../services/dealContacts";

export function useOpportunityDetail(id: string) {
  const [deal, setDeal] = useState<DealRow | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [contacts, setContacts] = useState<DealContactRelationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([getDeal(supabase, id), listContactsForDeal(supabase, id)])
      .then(async ([d, rels]) => {
        setDeal(d);
        setContacts(rels);
        setStages(d.pipeline_id ? await listStages(supabase, d.pipeline_id) : []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStage(stageId: string): Promise<void> {
    await updateDealStage(supabase, id, stageId);
    await load();
  }

  async function save(patch: DealUpdate): Promise<void> {
    await updateDeal(supabase, id, patch);
    await load();
  }

  async function linkContact(contactId: string, role: string | null): Promise<void> {
    if (!deal) return;
    await addDealContactRelation(supabase, { clientId: deal.client_id, dealId: id, contactId, role });
    await load();
  }

  async function unlinkContact(relationId: string): Promise<void> {
    await removeDealContactRelation(supabase, relationId);
    await load();
  }

  return { deal, stages, contacts, loading, error, changeStage, save, linkContact, unlinkContact, reload: load };
}
