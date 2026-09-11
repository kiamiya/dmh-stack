import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getCompany, listSubsidiaries, updateCompany } from "../services/companies";
import type { CompanyDetailRow, CompanyUpdate, SubsidiaryRow } from "../services/companies";
import { addContactCompanyRelation, listContactsForCompany, removeContactCompanyRelation } from "../services/contactCompanies";
import type { ContactRelationRow } from "../services/contactCompanies";

export function useCompanyDetail(id: string) {
  const [company, setCompany] = useState<CompanyDetailRow | null>(null);
  const [contacts, setContacts] = useState<ContactRelationRow[]>([]);
  const [subsidiaries, setSubsidiaries] = useState<SubsidiaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([getCompany(supabase, id), listContactsForCompany(supabase, id), listSubsidiaries(supabase, id)])
      .then(([c, rels, subs]) => {
        setCompany(c);
        setContacts(rels);
        setSubsidiaries(subs);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(patch: CompanyUpdate): Promise<void> {
    await updateCompany(supabase, id, patch);
    await load();
  }

  async function linkContact(contactId: string): Promise<void> {
    if (!company) return;
    await addContactCompanyRelation(supabase, { clientId: company.client_id, contactId, companyId: id });
    await load();
  }

  async function unlinkContact(relationId: string): Promise<void> {
    await removeContactCompanyRelation(supabase, relationId);
    await load();
  }

  return { company, contacts, subsidiaries, loading, error, save, linkContact, unlinkContact, reload: load };
}
