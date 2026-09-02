import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getContact, updateContact } from "../services/contacts";
import type { ContactDetailRow, ContactUpdate } from "../services/contacts";
import { addContactCompanyRelation, listCompaniesForContact, removeContactCompanyRelation } from "../services/contactCompanies";
import type { CompanyRelationRow } from "../services/contactCompanies";

export function useContactDetail(id: string) {
  const [contact, setContact] = useState<ContactDetailRow | null>(null);
  const [companies, setCompanies] = useState<CompanyRelationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([getContact(supabase, id), listCompaniesForContact(supabase, id)])
      .then(([c, rels]) => {
        setContact(c);
        setCompanies(rels);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(patch: ContactUpdate): Promise<void> {
    await updateContact(supabase, id, patch);
    await load();
  }

  async function linkCompany(companyId: string): Promise<void> {
    if (!contact) return;
    await addContactCompanyRelation(supabase, { clientId: contact.client_id, contactId: id, companyId });
    await load();
  }

  async function unlinkCompany(relationId: string): Promise<void> {
    await removeContactCompanyRelation(supabase, relationId);
    await load();
  }

  return { contact, companies, loading, error, save, linkCompany, unlinkCompany, reload: load };
}
