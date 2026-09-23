import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { defaultCompanyLayout } from "../lib/companyLayout";
import type { CompanyLayout } from "../lib/companyLayout";
import { getCompanyLayout, resetCompanyLayout, saveCompanyLayout } from "../services/companyLayouts";

/** S38-9 — composition de la fiche entreprise du client, avec repli sur le défaut en cas d'erreur de lecture. */
export function useCompanyLayout(clientId: string | null | undefined) {
  const [layout, setLayout] = useState<CompanyLayout>(defaultCompanyLayout);
  const [isCustom, setIsCustom] = useState(false);

  const load = useCallback(() => {
    if (!clientId) return Promise.resolve();
    return getCompanyLayout(supabase, clientId)
      .then((r) => {
        setLayout(r.layout);
        setIsCustom(r.isCustom);
      })
      .catch(() => {
        setLayout(defaultCompanyLayout());
        setIsCustom(false);
      });
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(next: CompanyLayout, updatedBy: string | null) {
    if (!clientId) return;
    await saveCompanyLayout(supabase, clientId, next, updatedBy);
    setLayout(next);
    setIsCustom(true);
  }

  async function reset() {
    if (!clientId) return;
    await resetCompanyLayout(supabase, clientId);
    setLayout(defaultCompanyLayout());
    setIsCustom(false);
  }

  return { layout, isCustom, save, reset };
}
