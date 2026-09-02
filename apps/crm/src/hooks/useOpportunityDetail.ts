import { useCallback, useEffect, useState } from "react";
import type { PipelineStage } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { getDeal, updateDeal, updateDealStage } from "../services/deals";
import type { DealRow, DealUpdate } from "../services/deals";
import { listStages } from "../services/pipelines";

export function useOpportunityDetail(id: string) {
  const [deal, setDeal] = useState<DealRow | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return getDeal(supabase, id)
      .then(async (d) => {
        setDeal(d);
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

  return { deal, stages, loading, error, changeStage, save, reload: load };
}
