import type { EnvSource } from "./env.js";

export interface IntegrationStatus {
  key: string;
  label: string;
  configured: boolean;
}

/**
 * Fournisseurs réellement utilisés par le pipeline (brief §1.2.1) — pas
 * "Kaspr"/"Hunter"/"Brevo SMTP" du mockup, qui ne font pas partie de
 * notre stack. Pharow n'a pas d'API en Phase 1 (import CSV manuel) donc
 * n'a pas de statut "connecté" pertinent ici.
 */
const INTEGRATION_ENV_KEYS: Record<string, string> = {
  pappers: "PAPPERS_API_KEY",
  dropcontact: "DROPCONTACT_API_KEY",
  smartlead: "SMARTLEAD_API_KEY",
  lemlist: "LEMLIST_API_KEY",
};

const INTEGRATION_LABELS: Record<string, string> = {
  pappers: "Pappers",
  dropcontact: "Dropcontact",
  smartlead: "Smartlead",
  lemlist: "Lemlist",
};

/**
 * Pure : statut "configuré" par fournisseur, dérivé de la présence réelle
 * de sa clé d'API dans l'environnement — jamais de faux chiffre d'usage/
 * quota tant qu'un vrai suivi n'existe pas en base (cf. PROGRESS.md, S29).
 */
export function computeIntegrationStatuses(source: EnvSource): IntegrationStatus[] {
  return Object.keys(INTEGRATION_ENV_KEYS).map((key) => ({
    key,
    label: INTEGRATION_LABELS[key],
    configured: Boolean(source[INTEGRATION_ENV_KEYS[key]]?.trim()),
  }));
}
