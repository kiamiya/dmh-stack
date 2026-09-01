import type { FunnelStage } from "../../lib/dashboardStats";

export interface FunnelChartProps {
  stages: FunnelStage[];
}

/** Funnel horizontal — une seule teinte (magnitude), largeur proportionnelle, labels directs (jamais couleur seule). */
export function FunnelChart({ stages }: FunnelChartProps) {
  const max = Math.max(1, ...stages.map((s) => s.reached));

  return (
    <div className="space-y-2">
      {stages.map((stage) => (
        <div key={stage.status} className="flex items-center gap-3">
          <span className="w-36 shrink-0 truncate text-sm text-muted-foreground">{stage.label}</span>
          <div className="h-5 flex-1 rounded-sm bg-secondary">
            <div
              className="h-5 rounded-sm bg-accent"
              style={{ width: `${Math.max(2, (stage.reached / max) * 100)}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-sm font-medium text-foreground">{stage.reached}</span>
          <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
            {stage.conversionRate !== null ? `${stage.conversionRate}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
