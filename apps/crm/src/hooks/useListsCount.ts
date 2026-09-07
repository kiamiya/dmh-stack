import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listAllContactLists } from "../services/contactLists";
import { listAllCompanyLists } from "../services/companyLists";
import { listAllOpportunityLists } from "../services/dealLists";

/** Nombre total de listes (tous types, tous clients) — juste un compte, sans le calcul d'effectif par liste (trop coûteux pour un badge de menu, réservé à /lists). */
export function useListsCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    Promise.all([listAllContactLists(supabase), listAllCompanyLists(supabase), listAllOpportunityLists(supabase)])
      .then(([contactLists, companyLists, opportunityLists]) =>
        setCount(contactLists.length + companyLists.length + opportunityLists.length),
      )
      .catch(() => setCount(0));
  }, []);

  return count;
}
