// Contrôle d'accès des Edge Functions d'enrichissement (`enrich-pappers`,
// `enrich-dropcontact`), qui écrivent en base avec la clé service_role et
// consomment des crédits Pappers/Dropcontact payants (décision Loïc du
// 2026-10-09 : connexion obligatoire). Deux appelants légitimes :
//   - le moteur d'automatisation (`pg_net`, migrations 030+) : Bearer = clé
//     service_role lue dans le Vault ;
//   - le CRM ("Enrichir" à la demande) : Bearer = JWT d'un membre du staff.
// Le JWT d'un utilisateur client (dashboard) ou la clé anon sont refusés.

export type EnrichmentCaller = { kind: "service" } | { kind: "staff"; userId: string };

export type EnrichmentAuthResult =
  | { ok: true; caller: EnrichmentCaller }
  | { ok: false; status: 401 | 403; error: string };

export interface EnrichmentAuthDeps {
  /** Clé service_role injectée dans l'Edge Function (comparaison rapide). */
  serviceRoleKey: string;
  /**
   * Le jeton est-il une clé service_role valide du projet ? Nécessaire car la
   * clé injectée dans l'Edge Function peut différer de celle du Vault (constaté
   * le 2026-10-09 : comparaison seule → automatisations refusées).
   */
  isServiceKey: (token: string) => Promise<boolean>;
  /** Résout le JWT en id d'utilisateur (null si invalide/expiré). */
  resolveUserId: (jwt: string) => Promise<string | null>;
  /** L'utilisateur est-il un membre du staff DMH (`staff_members`) ? */
  isStaff: (userId: string) => Promise<boolean>;
}

/** Comparaison en temps constant (évite de révéler la clé par mesure du temps de réponse). */
export function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function bearerToken(authHeader: string | null): string | null {
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() || null : null;
}

export async function authorizeEnrichmentCaller(
  authHeader: string | null,
  deps: EnrichmentAuthDeps,
): Promise<EnrichmentAuthResult> {
  const token = bearerToken(authHeader);
  if (!token) return { ok: false, status: 401, error: "Non authentifié" };
  if (deps.serviceRoleKey && constantTimeEqual(token, deps.serviceRoleKey)) {
    return { ok: true, caller: { kind: "service" } };
  }
  const userId = await deps.resolveUserId(token);
  if (!userId) {
    if (await deps.isServiceKey(token)) return { ok: true, caller: { kind: "service" } };
    return { ok: false, status: 401, error: "Session invalide" };
  }
  if (!(await deps.isStaff(userId))) return { ok: false, status: 403, error: "Réservé à l'équipe DMH" };
  return { ok: true, caller: { kind: "staff", userId } };
}

/**
 * Même contrôle pour les autres Edge Functions réservées à l'équipe DMH
 * (ex. `booking-decide`, S39-6) : clé service_role ou membre du staff.
 */
export const authorizeStaffOrService = authorizeEnrichmentCaller;
