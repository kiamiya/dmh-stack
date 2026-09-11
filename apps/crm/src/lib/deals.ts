/** Dupliqué depuis apps/dashboard/src/lib/deals.ts (même convention que status.ts/score.ts). */
export function formatCurrency(amount: number | null): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

/** Nom affiché d'une opportunité — le nom libre s'il a été saisi (S34), sinon le nom de l'entreprise (comportement historique, pour les deals sans nom). */
export function getDealDisplayName(deal: { name: string | null; company_name: string }): string {
  return deal.name?.trim() || deal.company_name;
}
