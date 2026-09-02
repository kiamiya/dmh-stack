export interface ContactFormInput {
  clientId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  linkedinUrl: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_RE = /^https?:\/\/([\w-]+\.)?linkedin\.com\//i;

/** Pure : valide le formulaire "Ajouter un contact". Retourne un message d'erreur FR, ou `null` si valide. */
export function validateContactForm({
  clientId,
  companyId,
  firstName,
  lastName,
  email,
  linkedinUrl,
}: ContactFormInput): string | null {
  if (!clientId) return "Le client DMH est requis.";
  if (!companyId) return "L'entreprise est requise.";
  if (!firstName.trim()) return "Le prénom est requis.";
  if (!lastName.trim()) return "Le nom est requis.";
  if (email.trim() && !EMAIL_RE.test(email.trim())) return "L'email n'est pas valide.";
  if (linkedinUrl.trim() && !LINKEDIN_RE.test(linkedinUrl.trim())) {
    return "L'URL LinkedIn n'est pas valide (doit commencer par https://linkedin.com/ ou https://www.linkedin.com/).";
  }
  return null;
}
