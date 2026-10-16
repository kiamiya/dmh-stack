import type { SupabaseClient } from "@supabase/supabase-js";

const MIN_PASSWORD_LENGTH = 6;

/** Chemin de la page où le lien « Mot de passe oublié » (e-mail Supabase) ramène l'utilisateur. */
export const RESET_PASSWORD_PATH = "/reset-password";

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

/**
 * Vérifie le mot de passe actuel avant d'accepter un changement — sans ça,
 * n'importe qui devant une session restée ouverte pourrait remplacer le mot
 * de passe. La reconnexion porte sur le même compte : la session reste la même.
 */
export async function verifyCurrentPassword(client: SupabaseClient, email: string, currentPassword: string): Promise<void> {
  const { error } = await client.auth.signInWithPassword({ email, password: currentPassword });
  if (error) throw new Error("Mot de passe actuel incorrect.");
}

/** Pure : adresse de retour du lien de réinitialisation, sur l'origine courante du CRM (en ligne ou en local). */
export function passwordResetRedirectUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${RESET_PASSWORD_PATH}`;
}

/** Pure : un e-mail plausible (contrôle de forme seulement, avant l'appel à Supabase). */
export function isPlausibleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Envoie l'e-mail « Mot de passe oublié ». Supabase répond de la même façon
 * qu'un compte existe ou non : la page affiche donc toujours le même message,
 * sans révéler quelles adresses ont un compte. Seule la limite d'envoi est
 * signalée à part (sinon l'utilisateur attendrait un e-mail qui ne vient pas).
 */
export async function requestPasswordReset(client: SupabaseClient, email: string, origin: string): Promise<void> {
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: passwordResetRedirectUrl(origin),
  });
  if (!error) return;
  if (error.status === 429 || /rate limit/i.test(error.message)) {
    throw new Error("Trop de demandes envoyées : réessaie dans une heure.");
  }
  throw new Error(error.message);
}

export type StaffSignupResult = "invited" | "already_registered";

/**
 * Création de compte DMH (S41-2) : l'Edge Function `staff-signup` vérifie le
 * domaine @dmhassocies.com et envoie l'invitation par e-mail ; l'accès staff
 * n'est accordé qu'au clic sur le lien (migration 059).
 */
export async function requestStaffSignup(
  client: SupabaseClient,
  input: { name: string; email: string },
  origin: string,
): Promise<StaffSignupResult> {
  const { data, error } = await client.functions.invoke("staff-signup", {
    body: { name: input.name, email: input.email, origin },
  });
  if (error) {
    // Message lisible renvoyé par la fonction (domaine refusé, limite d'envoi…) plutôt que l'erreur HTTP générique.
    const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
    const details = context?.json ? ((await context.json().catch(() => null)) as { error?: string } | null) : null;
    throw new Error(details?.error ?? error.message);
  }
  return (data as { status?: StaffSignupResult } | null)?.status === "already_registered" ? "already_registered" : "invited";
}
