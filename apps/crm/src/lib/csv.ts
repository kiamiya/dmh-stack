export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string;
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Pure : construit un CSV (séparateur virgule, valeurs échappées RFC 4180) à partir de colonnes typées. */
export function toCsv<T>(rows: T[], columns: Array<CsvColumn<T>>): string {
  const header = columns.map((c) => escapeCsvField(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvField(c.value(row))).join(","));
  return [header, ...lines].join("\n");
}
