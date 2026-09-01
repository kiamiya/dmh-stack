import type { SupabaseClient } from "@supabase/supabase-js";

const MIN_PASSWORD_LENGTH = 6;

/** Règle Supabase Auth par défaut (longueur minimale) — vérifiée côté client pour un message d'erreur immédiat, revérifiée serveur de toute façon. */
export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  if (password !== confirmation) {
    return "Les deux mots de passe ne correspondent pas.";
  }
  return null;
}

export async function changePassword(client: SupabaseClient, newPassword: string): Promise<void> {
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}
