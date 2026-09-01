/** Dupliqué depuis apps/dashboard/src/lib/deals.ts (même convention que status.ts/score.ts). */
export function formatCurrency(amount: number | null): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}
