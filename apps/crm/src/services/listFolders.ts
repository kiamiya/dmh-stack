import type { SupabaseClient } from "@supabase/supabase-js";
import type { ListFolder } from "@dmh/types";

const FOLDER_SELECT = "id, client_id, parent_id, name, created_by, created_at";

export async function listFolders(client: SupabaseClient, clientId: string): Promise<ListFolder[]> {
  const { data, error } = await client.from("list_folders").select(FOLDER_SELECT).eq("client_id", clientId).order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ListFolder[];
}

/** Tous les dossiers, tous clients confondus — pour la vue d'ensemble /lists (réservée au staff via `staff_full_access`), résoudre `folderName` par liste. */
export async function listAllListFolders(client: SupabaseClient): Promise<ListFolder[]> {
  const { data, error } = await client.from("list_folders").select(FOLDER_SELECT).order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ListFolder[];
}

export interface ListFolderInsert {
  clientId: string;
  name: string;
  parentId?: string | null;
  /** Id staff_members du créateur, ou null (même pattern que tasks.created_by / *_lists.created_by) — jamais fabriqué ici. */
  createdBy?: string | null;
}

export async function createFolder(client: SupabaseClient, input: ListFolderInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("list_folders")
    .insert({ client_id: input.clientId, name: input.name, parent_id: input.parentId ?? null, created_by: input.createdBy ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

/** Supprime un dossier — les listes qu'il contenait sont déclassées (`folder_id` remis à null via `on delete set null`), jamais supprimées. Les sous-dossiers sont supprimés en cascade (`parent_id on delete cascade`). */
export async function deleteFolder(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("list_folders").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export interface ListFolderUpdate {
  name?: string;
  /** Déplacer un dossier : change son parent (`null` = racine). */
  parentId?: string | null;
}

/** Renomme et/ou déplace un dossier (CR du 11/09/2026 — actions manquantes sur les dossiers de segments). */
export async function updateFolder(client: SupabaseClient, id: string, patch: ListFolderUpdate): Promise<void> {
  const { error } = await client
    .from("list_folders")
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.parentId !== undefined && { parent_id: patch.parentId }),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Duplique un dossier — copie superficielle (nom suffixé "(copie)", même
 * parent), ne clone ni ses sous-dossiers ni les listes qu'il contient
 * (même principe que dupliquer une vue enregistrée, S34-4 : la structure,
 * pas le contenu).
 */
export async function duplicateFolder(client: SupabaseClient, folder: ListFolder): Promise<{ id: string }> {
  return createFolder(client, {
    clientId: folder.client_id,
    name: `${folder.name} (copie)`,
    parentId: folder.parent_id,
    createdBy: folder.created_by,
  });
}
