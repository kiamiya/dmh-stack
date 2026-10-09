// S39-5 — validation d'une demande de RDV saisie sur la page publique (CR
// du 09/10/2026). Utilisée à l'identique par la page (retour immédiat) et
// par l'Edge Function (garde-fou serveur).
//
// Module autonome (import de types uniquement), importable par Deno.

import type { BookingQuestion } from "./config.ts";

export interface BookingRequestInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  answers: Record<string, string | boolean>;
}

export interface ValidBookingRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string;
  notes: string | null;
  answers: Record<string, string | boolean>;
}

/** E-mail sans espace, une seule @, domaine avec un point (contrôle demandé au CR). */
export function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Normalise un numéro de téléphone : espaces, points, tirets et parenthèses
 * retirés ; un numéro français à 10 chiffres (0X…) devient +33X… ; sinon il
 * doit commencer par + et compter 8 à 15 chiffres (format E.164). Null si
 * le numéro n'est pas exploitable.
 */
export function normalizePhone(value: string): string | null {
  const compact = value.replace(/[\s.\-()]/g, "");
  if (/^0[1-9]\d{8}$/.test(compact)) return `+33${compact.slice(1)}`;
  if (/^00[1-9]\d{7,14}$/.test(compact)) return `+${compact.slice(2)}`;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  return null;
}

const MAX = { name: 100, company: 200, notes: 2000, answer: 1000 };

/** Pure : valide la demande ; `errors` est indexé par champ (`answers.<id>` pour une question). */
export function validateBookingRequest(
  input: BookingRequestInput,
  questions: BookingQuestion[],
): { value: ValidBookingRequest | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const firstName = (input.firstName ?? "").trim();
  const lastName = (input.lastName ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  const company = (input.company ?? "").trim();
  const notes = (input.notes ?? "").trim();
  const rawPhone = (input.phone ?? "").trim();

  if (!firstName) errors.firstName = "Prénom obligatoire.";
  else if (firstName.length > MAX.name) errors.firstName = "Prénom trop long.";
  if (!lastName) errors.lastName = "Nom obligatoire.";
  else if (lastName.length > MAX.name) errors.lastName = "Nom trop long.";
  if (!email) errors.email = "E-mail obligatoire.";
  else if (!isValidEmailAddress(email)) errors.email = "Adresse e-mail invalide (sans espace, ex. prenom.nom@societe.fr).";
  if (!company) errors.company = "Société obligatoire.";
  else if (company.length > MAX.company) errors.company = "Nom de société trop long.";
  if (notes.length > MAX.notes) errors.notes = "Message trop long.";

  let phone: string | null = null;
  if (!rawPhone) errors.phone = "Téléphone obligatoire.";
  else {
    phone = normalizePhone(rawPhone);
    if (!phone) errors.phone = "Numéro invalide (ex. 06 12 34 56 78 ou +44 20 7946 0000).";
  }

  const answers: Record<string, string | boolean> = {};
  for (const q of questions) {
    const raw = input.answers?.[q.id];
    if (q.type === "checkbox") {
      const checked = raw === true;
      if (q.required && !checked) errors[`answers.${q.id}`] = "Case à cocher obligatoire.";
      answers[q.id] = checked;
      continue;
    }
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) {
      if (q.required) errors[`answers.${q.id}`] = "Réponse obligatoire.";
      continue;
    }
    if (q.type === "select" && !(q.options ?? []).includes(text)) {
      errors[`answers.${q.id}`] = "Choix invalide.";
      continue;
    }
    if (text.length > MAX.answer) {
      errors[`answers.${q.id}`] = "Réponse trop longue.";
      continue;
    }
    answers[q.id] = text;
  }

  if (Object.keys(errors).length > 0) return { value: null, errors };
  return { value: { firstName, lastName, email, phone, company, notes: notes || null, answers }, errors };
}
