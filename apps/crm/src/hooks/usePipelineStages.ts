import { useCallback, useEffect, useState } from "react";
import type { Pipeline, PipelineStage } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { createStage, listPipelines, listStages, reorderStages, updateStage } from "../services/pipelines";
import type { StageUpdate } from "../services/pipelines";

/**
 * Charge le pipeline par défaut d'un client + ses étapes. Une seule
 * fiche par client à ce stade (pas encore de gestion multi-pipelines
 * dans l'UI, même si le schéma le permet) — cohérent avec le besoin
 * concret actuel (étapes personnalisables), pas une abstraction en plus.
 */
export function usePipelineStages(clientId: string) {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!clientId) {
      setPipeline(null);
      setStages([]);
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return listPipelines(supabase, clientId)
      .then(async (pipelines) => {
        const defaultPipeline = pipelines.find((p) => p.is_default) ?? pipelines[0] ?? null;
        setPipeline(defaultPipeline);
        if (defaultPipeline) {
          setStages(await listStages(supabase, defaultPipeline.id));
        } else {
          setStages([]);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addStage(name: string, isWon = false, isLost = false): Promise<void> {
    if (!pipeline) return;
    await createStage(supabase, { clientId, pipelineId: pipeline.id, name, position: stages.length + 1, isWon, isLost });
    await load();
  }

  async function editStage(id: string, patch: StageUpdate): Promise<void> {
    await updateStage(supabase, id, patch);
    await load();
  }

  async function reorder(orderedStageIds: string[]): Promise<void> {
    await reorderStages(supabase, orderedStageIds);
    await load();
  }

  return { pipeline, stages, loading, error, addStage, editStage, reorder, reload: load };
}
