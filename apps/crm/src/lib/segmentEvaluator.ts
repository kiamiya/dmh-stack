import type { RuleGroup, SegmentRule } from "@dmh/types";

/** Pure : évalue une seule règle contre un enregistrement (objet simple, ex. un contact aplati). */
function evaluateRule(record: Record<string, unknown>, rule: SegmentRule): boolean {
  const fieldValue = record[rule.field];

  switch (rule.operator) {
    case "eq":
      return String(fieldValue ?? "") === String(rule.value ?? "");
    case "neq":
      return String(fieldValue ?? "") !== String(rule.value ?? "");
    case "gt":
      return fieldValue != null && rule.value != null && Number(fieldValue) > Number(rule.value);
    case "lt":
      return fieldValue != null && rule.value != null && Number(fieldValue) < Number(rule.value);
    case "contains":
      return (
        fieldValue != null &&
        rule.value != null &&
        String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase())
      );
    case "is_set":
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== "";
    default:
      return false;
  }
}

/** Pure : un enregistrement appartient au segment si TOUTES ses règles sont vraies (ET uniquement, pas de groupes OU). */
export function matchesSegment(record: Record<string, unknown>, rules: SegmentRule[]): boolean {
  return rules.every((rule) => evaluateRule(record, rule));
}

/** Pure : un enregistrement correspond à une liste dynamique s'il correspond à AU MOINS UN groupe (OU), chaque groupe exigeant TOUTES ses conditions (ET) — modèle HubSpot à 2 niveaux (S26). */
export function matchesRuleGroups(record: Record<string, unknown>, groups: RuleGroup[]): boolean {
  return groups.some((group) => group.conditions.every((rule) => evaluateRule(record, rule)));
}
