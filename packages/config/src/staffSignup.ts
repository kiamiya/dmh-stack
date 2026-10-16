/**
 * Création de compte DMH depuis l'écran de connexion (S41-2) : réservée aux
 * adresses du domaine DMH. Module autonome (aucun import) : utilisé tel quel
 * par le CRM (contrôle immédiat dans le formulaire) et par l'Edge Function
 * `staff-signup` (contrôle qui fait foi, côté serveur).
 *
 * Le domaine seul ne prouve rien : l'accès staff n'est accordé qu'une fois
 * l'adresse confirmée par le lien d'invitation (trigger de la migration 059).
 */
export const DMH_STAFF_EMAIL_DOMAIN = "dmhassocies.com";

/** Pure : adresse nettoyée (espaces retirés, minuscules) — la forme comparée et enregistrée. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Pure : l'adresse appartient-elle au domaine DMH ? Domaine exact après le
 * dernier « @ » : ni sous-domaine (`x@mail.dmhassocies.com`), ni domaine
 * qui ne fait que commencer pareil (`x@dmhassocies.com.exemple.fr`), ni
 * second « @ ».
 */
export function isDmhStaffEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+$/.test(normalized)) return false;
  const [local, domain] = normalized.split("@");
  return local.length > 0 && domain === DMH_STAFF_EMAIL_DOMAIN;
}

/** Pure : nom affiché (2 à 80 caractères après nettoyage), ou message d'erreur. */
export function validateStaffName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2) return "Indique ton prénom et ton nom.";
  if (trimmed.length > 80) return "Le nom est trop long (80 caractères maximum).";
  return null;
}

/** Pure : validation complète d'une demande de création de compte, ou message d'erreur. */
export function validateStaffSignup(input: { name: string; email: string }): string | null {
  const nameError = validateStaffName(input.name);
  if (nameError) return nameError;
  if (!isDmhStaffEmail(input.email)) {
    return `La création de compte est réservée aux adresses @${DMH_STAFF_EMAIL_DOMAIN}.`;
  }
  return null;
}
