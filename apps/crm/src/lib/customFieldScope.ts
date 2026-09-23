import type { CustomFieldClientOptions, CustomFieldDefinition } from "@dmh/types";

/**
 * S38-6 — champs visibles pour un client : les champs système (communs à
 * tous, `client_id` null) puis ses propres champs personnalisés, jamais ceux
 * d'un autre client (cloisonnement par environnement, rappelé par Delphine le
 * 17/09). Les options d'un champ liste/choix multiples sont remplacées par la
 * surcharge du client quand elle existe. Pur, sans mutation.
 */
export function resolveDefinitionsForClient(
  definitions: CustomFieldDefinition[],
  clientId: string,
  overrides: CustomFieldClientOptions[] = [],
): CustomFieldDefinition[] {
  const optionsByDefinition = new Map(
    overrides.filter((o) => o.client_id === clientId).map((o) => [o.field_definition_id, o.select_options]),
  );
  const visible = definitions.filter((d) => d.is_system || d.client_id === clientId);
  const ordered = [...visible.filter((d) => d.is_system), ...visible.filter((d) => !d.is_system)];
  return ordered.map((d) => {
    const override = optionsByDefinition.get(d.id);
    return override ? { ...d, select_options: override } : d;
  });
}
