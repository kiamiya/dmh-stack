import type { StatusCount } from "../../lib/dashboardStats";

export interface StatusBarListProps {
  counts: StatusCount[];
}

const VARIANT_BAR_CLASS: Record<string, string> = {
  default: "bg-slate-400",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
};

/** Réutilise le même mapping statut->couleur que les Badge partout ailleurs dans l'app (identité déjà établie, pas une nouvelle palette). */
export function StatusBarList({ counts }: StatusBarListProps) {
  const max = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div className="space-y-1.5">
      {counts.map((c) => (
        <div key={c.status} className="flex items-center gap-3">
          <span className="w-36 shrink-0 truncate text-sm text-muted-foreground">{c.label}</span>
          <div className="h-4 flex-1 rounded-sm bg-secondary">
            <div
              className={`h-4 rounded-sm ${VARIANT_BAR_CLASS[c.color] ?? VARIANT_BAR_CLASS.default}`}
              style={{ width: `${Math.max(c.count === 0 ? 0 : 2, (c.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-medium text-foreground">{c.count}</span>
        </div>
      ))}
    </div>
  );
}
