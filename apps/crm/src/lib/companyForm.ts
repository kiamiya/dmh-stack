export interface CompanyFormInput {
  clientId: string;
  name: string;
  website: string;
}

/** Pure : valide le formulaire "Ajouter une entreprise". Retourne un message d'erreur FR, ou `null` si valide. */
export function validateCompanyForm({ clientId, name, website }: CompanyFormInput): string | null {
  if (!clientId) return "Le client DMH est requis.";
  if (!name.trim()) return "Le nom de l'entreprise est requis.";
  if (website.trim() && !/^https?:\/\//i.test(website.trim())) {
    return "Le site web doit commencer par http:// ou https://.";
  }
  return null;
}
