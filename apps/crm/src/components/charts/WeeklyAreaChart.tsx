import type { WeeklyBucket } from "../../lib/dashboardStats";

export interface WeeklyAreaChartProps {
  title: string;
  data: WeeklyBucket[];
}

const WIDTH = 560;
const HEIGHT = 140;
const PADDING = 24;

/**
 * Graphique d'évolution hebdomadaire — une seule teinte (magnitude, pas
 * d'identité à distinguer), fait main (pas de dépendance charting). Table
 * de données en alternative accessible (`sr-only`), tooltips natifs via
 * `<title>` sur chaque point.
 */
export function WeeklyAreaChart({ title, data }: WeeklyAreaChartProps) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const innerWidth = WIDTH - PADDING * 2;
  const innerHeight = HEIGHT - PADDING * 2;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: PADDING + i * stepX,
    y: PADDING + innerHeight - (d.count / max) * innerHeight,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${PADDING + innerHeight} L ${points[0]?.x ?? 0} ${PADDING + innerHeight} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={title}>
        <line x1={PADDING} y1={PADDING + innerHeight} x2={WIDTH - PADDING} y2={PADDING + innerHeight} className="stroke-border" strokeWidth={1} />
        <path d={areaPath} fill="hsl(var(--accent))" fillOpacity={0.12} stroke="none" />
        <path d={linePath} fill="none" stroke="hsl(var(--accent))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <circle key={p.weekStart} cx={p.x} cy={p.y} r={4} fill="hsl(var(--accent))">
            <title>
              Semaine du {new Date(p.weekStart).toLocaleDateString("fr-FR")} — {p.count}
            </title>
          </circle>
        ))}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Semaine</th>
            <th>Valeur</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.weekStart}>
              <td>{new Date(d.weekStart).toLocaleDateString("fr-FR")}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
