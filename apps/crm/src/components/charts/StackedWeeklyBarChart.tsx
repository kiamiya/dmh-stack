import type { WeeklyBreakdownBucket } from "../../lib/dashboardStats";

export interface StackedWeeklyBarChartProps {
  title: string;
  data: WeeklyBreakdownBucket[];
}

const WIDTH = 560;
const HEIGHT = 160;
const PADDING = 24;

const SERIES = [
  { key: "calls", label: "Appels", opacity: 0.35 },
  { key: "emails", label: "Séquences email", opacity: 0.65 },
  { key: "meetings", label: "RDV posés", opacity: 1 },
] as const;

/**
 * Barres empilées hebdomadaires (Appels/Séquences email/RDV posés) —
 * "Activité de la force de vente" du mockup "Relais". Même esprit que
 * `WeeklyAreaChart` (SVG fait main, pas de dépendance charting), 3 séries
 * distinguées par opacité d'une seule teinte accent (palette "mono" du
 * design system — pas de deuxième couleur inventée).
 */
export function StackedWeeklyBarChart({ title, data }: StackedWeeklyBarChartProps) {
  const totals = data.map((d) => d.calls + d.emails + d.meetings);
  const max = Math.max(1, ...totals);
  const innerWidth = WIDTH - PADDING * 2;
  const innerHeight = HEIGHT - PADDING * 2;
  const barWidth = data.length > 0 ? (innerWidth / data.length) * 0.6 : 0;
  const step = data.length > 0 ? innerWidth / data.length : 0;

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={title}>
        <line
          x1={PADDING}
          y1={PADDING + innerHeight}
          x2={WIDTH - PADDING}
          y2={PADDING + innerHeight}
          className="stroke-border"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const x = PADDING + i * step + (step - barWidth) / 2;
          let yCursor = PADDING + innerHeight;
          return (
            <g key={d.weekStart}>
              {SERIES.map((s) => {
                const value = d[s.key];
                const h = (value / max) * innerHeight;
                yCursor -= h;
                return (
                  <rect key={s.key} x={x} y={yCursor} width={barWidth} height={h} fill="hsl(var(--accent))" fillOpacity={s.opacity}>
                    <title>
                      Semaine du {new Date(d.weekStart).toLocaleDateString("fr-FR")} — {s.label} : {value}
                    </title>
                  </rect>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5" style={{ backgroundColor: `hsl(var(--accent) / ${s.opacity})` }} />
            {s.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Semaine</th>
            {SERIES.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.weekStart}>
              <td>{new Date(d.weekStart).toLocaleDateString("fr-FR")}</td>
              <td>{d.calls}</td>
              <td>{d.emails}</td>
              <td>{d.meetings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
