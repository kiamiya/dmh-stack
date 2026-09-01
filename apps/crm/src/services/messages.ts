import type { SupabaseClient } from "@supabase/supabase-js";

export interface MessageRow {
  id: string;
  email_subject: string | null;
  email_body: string | null;
  linkedin_message: string | null;
  followup_email: string | null;
  approved: boolean;
  injected_at: string | null;
}

export async function getLatestMessage(client: SupabaseClient, prospectId: string): Promise<MessageRow | null> {
  const { data, error } = await client
    .from("messages_generated")
    .select("id, email_subject, email_body, linkedin_message, followup_email, approved, injected_at")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as MessageRow | null;
}

export async function markMessageReady(client: SupabaseClient, messageId: string): Promise<{ injected_at: string }> {
  const injected_at = new Date().toISOString();
  const { error } = await client
    .from("messages_generated")
    .update({ approved: true, injected_at })
    .eq("id", messageId);

  if (error) throw new Error(error.message);
  return { injected_at };
}
