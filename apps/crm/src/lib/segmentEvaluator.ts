import type { RuleGroup, SegmentRule } from "@dmh/types";

function isFiniteNumber(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string" || value.trim() === "") return false;
  return Number.isFinite(Number(value));
}

/**
 * Convertit une valeur en nombre comparable pour "supérieur à"/"inférieur
 * à" — nombre en priorité (évite qu'une année comme "2026" soit lue comme
 * une date), sinon date (`Date.parse`, couvre les dates ISO stockées en
 * base). Retourne `null` si la valeur n'est ni l'un ni l'autre (comparaison
 * alors toujours fausse, jamais une exception).
 */
function toComparable(value: unknown): number | null {
  if (isFiniteNumber(value)) return Number(value);
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

/** Pure : évalue une seule règle contre un enregistrement (objet simple, ex. un contact aplati). */
function evaluateRule(record: Record<string, unknown>, rule: SegmentRule): boolean {
  const fieldValue = record[rule.field];

  switch (rule.operator) {
    case "eq":
      return String(fieldValue ?? "") === String(rule.value ?? "");
    case "neq":
      return String(fieldValue ?? "") !== String(rule.value ?? "");
    case "gt": {
      const a = toComparable(fieldValue);
      const b = toComparable(rule.value);
      return a !== null && b !== null && a > b;
    }
    case "lt": {
      const a = toComparable(fieldValue);
      const b = toComparable(rule.value);
      return a !== null && b !== null && a < b;
    }
    case "contains":
      return (
        fieldValue != null &&
        rule.value != null &&
        String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase())
      );
    case "is_set":
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== "";
    case "is_not_set":
      return fieldValue === null || fieldValue === undefined || fieldValue === "";
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
