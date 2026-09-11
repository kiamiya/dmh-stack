import { daysSince } from "./relativeTime";
import type { FieldProvenanceRow } from "../services/fieldProvenance";

export interface FieldProvenanceGroup {
  field: string;
  /** Une entrée par fournisseur ayant écrit ce champ, la plus récente en premier. */
  entries: FieldProvenanceRow[];
  /** Vrai si au moins 2 fournisseurs ont écrit des valeurs différentes pour ce champ. */
  hasConflict: boolean;
  ageDays: number | null;
}

/**
 * Pure : regroupe les lignes de provenance par champ, détecte les
 * conflits (2+ fournisseurs, valeurs différentes) — un champ avec une
 * seule source ne peut jamais être en conflit, même chose aujourd'hui
 * (Pappers/Dropcontact n'écrivent jamais le même champ), mais la
 * fonction gère le cas général.
 */
export function groupFieldProvenance(rows: FieldProvenanceRow[], now: Date = new Date()): FieldProvenanceGroup[] {
  const byField = new Map<string, FieldProvenanceRow[]>();
  for (const row of rows) {
    const list = byField.get(row.field_name) ?? [];
    list.push(row);
    byField.set(row.field_name, list);
  }

  return Array.from(byField.entries()).map(([field, entries]) => {
    const sorted = entries.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const distinctValues = new Set(entries.map((e) => e.value));
    return {
      field,
      entries: sorted,
      hasConflict: distinctValues.size > 1,
      ageDays: daysSince(sorted[0]?.updated_at ?? null, now),
    };
  });
}
