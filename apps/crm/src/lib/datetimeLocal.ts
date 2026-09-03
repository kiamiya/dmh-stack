/** Pure : convertit un ISO (UTC) en valeur pour <input type="datetime-local"> (heure locale du navigateur, sans fuseau). */
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Pure : convertit une valeur <input type="datetime-local"> (interprétée en heure locale) en ISO UTC. */
export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}
