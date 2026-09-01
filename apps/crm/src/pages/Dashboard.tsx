import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBarList } from "../components/charts/StatusBarList";
import { FunnelChart } from "../components/charts/FunnelChart";
import { WeeklyAreaChart } from "../components/charts/WeeklyAreaChart";
import { formatScore, getScoreColor } from "../lib/score";
import { formatCurrency } from "../lib/deals";
import {
  computeFunnelFromHistory,
  computeStatusCounts,
  computeWeeklyCounts,
  topProspectsByScore,
} from "../lib/dashboardStats";
import { useProspects } from "../hooks/useProspects";
import { useStatusHistory } from "../hooks/useStatusHistory";
import { useDeals } from "../hooks/useDeals";

export function DashboardPage() {
  const { prospects, loading: prospectsLoading } = useProspects();
  const { history, loading: historyLoading } = useStatusHistory();
  const { deals, loading: dealsLoading } = useDeals();

  const now = useMemo(() => new Date(), []);
  const statusCounts = useMemo(() => computeStatusCounts(prospects), [prospects]);
  const funnel = useMemo(() => computeFunnelFromHistory(history), [history]);
  const topScores = useMemo(() => topProspectsByScore(prospects, 5), [prospects]);
  const weeklyNewProspects = useMemo(
    () => computeWeeklyCounts(prospects.map((p) => p.created_at), 8, now),
    [prospects, now],
  );
  const weeklyDealsWon = useMemo(
    () =>
      computeWeeklyCounts(
        deals.filter((d) => d.status === "won" && d.signed_at).map((d) => d.signed_at!),
        8,
        now,
      ),
    [deals, now],
  );

  const loading = prospectsLoading || historyLoading || dealsLoading;
  const wonDeals = deals.filter((d) => d.status === "won");
  const lostDeals = deals.filter((d) => d.status === "lost");
  const totalCommission = wonDeals.reduce((sum, d) => sum + (d.commission_amount ?? 0), 0);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total prospects</div>
            <div className="text-2xl font-semibold text-foreground">{prospects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">En séquence active</div>
            <div className="text-2xl font-semibold text-foreground">
              {prospects.filter((p) => p.status === "in_sequence").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Deals gagnés</div>
            <div className="text-2xl font-semibold text-foreground">{wonDeals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Commission cumulée</div>
            <div className="text-2xl font-semibold text-foreground">{formatCurrency(totalCommission)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Prospects par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBarList counts={statusCounts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funnel de conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={funnel} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nouveaux prospects par semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyAreaChart title="Nouveaux prospects par semaine" data={weeklyNewProspects} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deals gagnés par semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyAreaChart title="Deals gagnés par semaine" data={weeklyDealsWon} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top prospects par score IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topScores.length === 0 && <p className="text-sm text-muted-foreground">Aucun prospect scoré.</p>}
            {topScores.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-muted-foreground">{i + 1}.</span>
                <Link to={`/prospects/${p.id}`} className="flex-1 truncate text-foreground hover:underline">
                  {p.companyName}
                </Link>
                <Badge variant={getScoreColor(p.score)}>{formatScore(p.score)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deals ({wonDeals.length} gagnés, {lostDeals.length} perdus)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {deals.length === 0 && <p className="text-sm text-muted-foreground">Aucun deal déclaré.</p>}
            {deals.map((d) => (
              <div key={d.id} className="flex items-center justify-between border-t border-border pt-2 text-sm first:border-0 first:pt-0">
                <div className="min-w-0 flex-1 truncate text-foreground">{d.company_name}</div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{formatCurrency(d.deal_value)}</span>
                  <Badge variant={d.status === "won" ? "green" : d.status === "lost" ? "red" : "yellow"}>
                    {d.status === "won" ? "Gagné" : d.status === "lost" ? "Perdu" : "En négociation"}
                  </Badge>
                  {d.status === "won" && (
                    <span className="text-xs text-muted-foreground">
                      {d.attributed_to_dmh ? `Commission ${formatCurrency(d.commission_amount)}` : "Non attribué"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
