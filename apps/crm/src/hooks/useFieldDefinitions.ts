import { useCallback, useEffect, useState } from "react";
import type { CustomFieldDefinition, CustomFieldEntityType } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { createFieldDefinition, listFieldDefinitions } from "../services/customFields";
import type { FieldDefinitionInsert } from "../services/customFields";

export function useFieldDefinitions(entityType: CustomFieldEntityType) {
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return listFieldDefinitions(supabase, entityType)
      .then(setDefinitions)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [entityType]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(input: FieldDefinitionInsert): Promise<void> {
    await createFieldDefinition(supabase, input);
    await load();
  }

  return { definitions, loading, error, create, reload: load };
}
