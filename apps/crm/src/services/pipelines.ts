import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pipeline, PipelineStage } from "@dmh/types";

export async function listPipelines(client: SupabaseClient, clientId: string): Promise<Pipeline[]> {
  const { data, error } = await client
    .from("pipelines")
    .select("id, client_id, name, is_default, created_at")
    .eq("client_id", clientId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Pipeline[];
}

export async function listStages(client: SupabaseClient, pipelineId: string): Promise<PipelineStage[]> {
  const { data, error } = await client
    .from("pipeline_stages")
    .select("id, client_id, pipeline_id, name, position, is_won, is_lost, created_at")
    .eq("pipeline_id", pipelineId)
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []) as PipelineStage[];
}

export interface StageInsert {
  clientId: string;
  pipelineId: string;
  name: string;
  position: number;
  isWon?: boolean;
  isLost?: boolean;
}

export async function createStage(client: SupabaseClient, input: StageInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("pipeline_stages")
    .insert({
      client_id: input.clientId,
      pipeline_id: input.pipelineId,
      name: input.name,
      position: input.position,
      is_won: input.isWon ?? false,
      is_lost: input.isLost ?? false,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export interface StageUpdate {
  name?: string;
  isWon?: boolean;
  isLost?: boolean;
}

export async function updateStage(client: SupabaseClient, id: string, patch: StageUpdate): Promise<void> {
  const { error } = await client
    .from("pipeline_stages")
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.isWon !== undefined && { is_won: patch.isWon }),
      ...(patch.isLost !== undefined && { is_lost: patch.isLost }),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Réordonne les étapes d'un pipeline : `orderedStageIds[0]` devient position 1, etc. */
export async function reorderStages(client: SupabaseClient, orderedStageIds: string[]): Promise<void> {
  const results = await Promise.all(
    orderedStageIds.map((id, index) => client.from("pipeline_stages").update({ position: index + 1 }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}
