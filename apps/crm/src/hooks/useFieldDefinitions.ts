import { useCallback, useEffect, useState } from "react";
import type { CustomFieldDefinition, CustomFieldEntityType } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { createFieldDefinition, listClientFieldOptions, listFieldDefinitions } from "../services/customFields";
import type { FieldDefinitionInsert } from "../services/customFields";
import { resolveDefinitionsForClient } from "../lib/customFieldScope";

/**
 * Définitions de champs d'un type d'entité. Avec `clientId` (S38-6) : champs
 * système + champs de ce client uniquement, options surchargées pour ce
 * client. Sans `clientId` : toutes les définitions brutes (écran de
 * paramétrage multi-clients).
 */
export function useFieldDefinitions(entityType: CustomFieldEntityType, clientId?: string | null) {
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const loadAll = clientId
      ? Promise.all([listFieldDefinitions(supabase, entityType), listClientFieldOptions(supabase, clientId)]).then(
          ([defs, overrides]) => resolveDefinitionsForClient(defs, clientId, overrides),
        )
      : listFieldDefinitions(supabase, entityType);
    return loadAll
      .then(setDefinitions)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [entityType, clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(input: FieldDefinitionInsert): Promise<void> {
    await createFieldDefinition(supabase, input);
    await load();
  }

  return { definitions, loading, error, create, reload: load };
}
