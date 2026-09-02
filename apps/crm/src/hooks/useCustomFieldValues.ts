import { useCallback, useEffect, useState } from "react";
import type { CustomFieldEntityType, CustomFieldValue } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { listValuesForEntity, upsertValue } from "../services/customFields";
import type { FieldValueUpsert } from "../services/customFields";

export function useCustomFieldValues(entityType: CustomFieldEntityType, entityId: string) {
  const [values, setValues] = useState<CustomFieldValue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return listValuesForEntity(supabase, entityType, entityId)
      .then(setValues)
      .catch(() => setValues([]))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(input: FieldValueUpsert): Promise<void> {
    await upsertValue(supabase, input);
    await load();
  }

  return { values, loading, save, reload: load };
}
