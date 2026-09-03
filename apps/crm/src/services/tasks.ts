import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskStatus } from "@dmh/types";

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  contacts: { first_name: string; last_name: string } | null;
  companies: { name: string } | null;
  deals: { company_name: string } | null;
}

const TASK_SELECT =
  "id, title, description, due_date, status, assigned_to, contact_id, company_id, deal_id, contacts(first_name, last_name), companies(name), deals(company_name)";

export async function listTasks(client: SupabaseClient): Promise<TaskRow[]> {
  const { data, error } = await client
    .from("tasks")
    .select(TASK_SELECT)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as TaskRow[];
}

export interface TaskInsert {
  clientId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  assignedTo?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  createdBy?: string | null;
}

export async function createTask(client: SupabaseClient, input: TaskInsert): Promise<{ id: string }> {
  const { data, error } = await client
    .from("tasks")
    .insert({
      client_id: input.clientId,
      title: input.title,
      description: input.description ?? null,
      due_date: input.dueDate ?? null,
      assigned_to: input.assignedTo ?? null,
      contact_id: input.contactId ?? null,
      company_id: input.companyId ?? null,
      deal_id: input.dealId ?? null,
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function updateTaskStatus(client: SupabaseClient, id: string, status: TaskStatus): Promise<void> {
  const { error } = await client.from("tasks").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  assignedTo?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  status?: TaskStatus;
}

/** Met à jour uniquement les champs fournis dans `patch` (undefined = non touché, null = effacé). */
export async function updateTask(client: SupabaseClient, id: string, patch: TaskUpdate): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.dueDate !== undefined) update.due_date = patch.dueDate;
  if (patch.assignedTo !== undefined) update.assigned_to = patch.assignedTo;
  if (patch.contactId !== undefined) update.contact_id = patch.contactId;
  if (patch.companyId !== undefined) update.company_id = patch.companyId;
  if (patch.dealId !== undefined) update.deal_id = patch.dealId;
  if (patch.status !== undefined) update.status = patch.status;

  const { error } = await client.from("tasks").update(update).eq("id", id);
  if (error) throw new Error(error.message);
}
