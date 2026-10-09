// S39-9 — rattachement d'un RDV pris en ligne aux fiches du CRM (CR du
// 09/10/2026 : « les rendez-vous pris sont consignés dans les actions passées
// du CRM avec les coordonnées du contact »). Le contact est retrouvé par son
// e-mail ; sinon l'entreprise par son nom (casse, accents et espaces ignorés),
// créée au besoin, puis le contact.
//
// Module autonome, importable par Deno.

/** Pure : forme de comparaison d'un nom d'entreprise. */
export function normalizeCompanyName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Pure : échappe `\`, `%` et `_` pour une comparaison `ilike` littérale (insensible à la casse seulement). */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Pure : entreprise existante du client portant ce nom, ou null. */
export function findCompanyByName<T extends { name: string }>(companies: T[], name: string): T | null {
  const target = normalizeCompanyName(name);
  return companies.find((c) => normalizeCompanyName(c.name) === target) ?? null;
}
