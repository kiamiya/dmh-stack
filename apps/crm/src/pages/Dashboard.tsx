import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { openProspectLinkState } from "../lib/navigation";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { StatusBarList } from "../components/charts/StatusBarList";
import { FunnelChart } from "../components/charts/FunnelChart";
import { WeeklyAreaChart } from "../components/charts/WeeklyAreaChart";
import { formatScore, getScoreColor } from "../lib/score";
import { formatCurrency } from "../lib/deals";
import { formatRelativeTime } from "../lib/relativeTime";
import { isStagnant } from "../lib/stagnation";
import { groupActivityEventsByDay, mergeActivityEvents } from "../lib/activityFeed";
import {
  computeFunnelFromHistory,
  computeStatusCounts,
  computeWeeklyCounts,
  topProspectsByScore,
} from "../lib/dashboardStats";
import { useProspects } from "../hooks/useProspects";
import { useStatusHistory } from "../hooks/useStatusHistory";
import { useDeals } from "../hooks/useDeals";
import { useAllInteractions } from "../hooks/useAllInteractions";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { useTasks } from "../hooks/useTasks";
import { computeConversionRate, computePipelineValueByStatus } from "../lib/opportunityStats";
import { computeOverdueTasks, computeTaskCountsByStatus } from "../lib/taskStats";
import { PageHeader } from "../components/ui/page-header";

export function DashboardPage() {
  const location = useLocation();
  const { prospects, loading: prospectsLoading } = useProspects();
  const { history, loading: historyLoading } = useStatusHistory();
  const { deals, loading: dealsLoading } = useDeals();
  const { interactions, loading: interactionsLoading } = useAllInteractions();
  const staff = useStaffMembers();
  const { tasks, loading: tasksLoading } = useTasks();

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

  const companyNameByProspectId = useMemo(
    () => new Map(prospects.map((p) => [p.id, p.companies?.name ?? "—"])),
    [prospects],
  );
  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const activityEvents = useMemo(
    () => mergeActivityEvents(history, interactions, companyNameByProspectId, staffById, 15),
    [history, interactions, companyNameByProspectId, staffById],
  );
  const activityDayGroups = useMemo(() => groupActivityEventsByDay(activityEvents, now), [activityEvents, now]);
  const stagnantProspects = useMemo(
    () => prospects.filter((p) => isStagnant(p.last_activity_at, undefined, now) && p.status !== "won" && p.status !== "lost" && p.status !== "not_interested"),
    [prospects, now],
  );

  const loading = prospectsLoading || historyLoading || dealsLoading || interactionsLoading || tasksLoading;
  const wonDeals = deals.filter((d) => d.status === "won");
  const lostDeals = deals.filter((d) => d.status === "lost");
  const totalCommission = wonDeals.reduce((sum, d) => sum + (d.commission_amount ?? 0), 0);

  const pipelineValue = useMemo(() => computePipelineValueByStatus(deals), [deals]);
  const conversionRate = useMemo(() => computeConversionRate(deals), [deals]);
  const taskCounts = useMemo(() => computeTaskCountsByStatus(tasks), [tasks]);
  const overdueTasks = useMemo(() => computeOverdueTasks(tasks, now), [tasks, now]);

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
      <PageHeader kicker="Pilotage · vue d'ensemble" title="Dashboard" />

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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="evolution">Évolution</TabsTrigger>
          <TabsTrigger value="scores-deals">Scores &amp; Deals</TabsTrigger>
          <TabsTrigger value="opportunities-tasks">Opportunités &amp; Tâches</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
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
        </TabsContent>

        <TabsContent value="evolution">
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
        </TabsContent>

        <TabsContent value="scores-deals">
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
                    <Link to={`/prospects/${p.id}`} state={openProspectLinkState(location)} className="flex-1 truncate text-foreground hover:underline">
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
        </TabsContent>

        <TabsContent value="opportunities-tasks">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pipeline des opportunités</span>
                  <Badge variant="blue">{conversionRate}% de conversion</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pipelineValue.map((row) => (
                  <div key={row.status} className="flex items-center justify-between border-t border-border pt-2 text-sm first:border-0 first:pt-0">
                    <span className="text-foreground">{row.label}</span>
                    <span className="text-muted-foreground">
                      {row.count} · {formatCurrency(row.totalValue)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tâches par statut</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusBarList counts={taskCounts} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tâches en retard ({overdueTasks.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overdueTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune tâche en retard — bon rythme.</p>
                )}
                {overdueTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between border-t border-border pt-2 text-sm first:border-0 first:pt-0">
                    <span className="truncate text-foreground">{t.title}</span>
                    <Badge variant="red">Échéance {t.due_date}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Fil d'activité récent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activityEvents.length === 0 && <p className="text-sm text-muted-foreground">Aucune activité.</p>}
                {activityDayGroups.map((group) => (
                  <div key={group.label}>
                    <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </div>
                    <div className="space-y-2">
                      {group.events.map((e) => (
                        <div key={e.id} className="border-t border-border pt-2 text-sm first:border-0 first:pt-0">
                          <div className="flex items-center justify-between">
                            <Link to={`/prospects/${e.prospectId}`} state={openProspectLinkState(location)} className="font-medium text-foreground hover:underline">
                              {e.companyName}
                            </Link>
                            <span className="text-xs text-muted-foreground">{formatRelativeTime(e.timestamp)}</span>
                          </div>
                          <div className="text-muted-foreground">
                            {e.description}
                            {e.authorName && <span className="text-xs"> — {e.authorName}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prospects stagnants ({stagnantProspects.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stagnantProspects.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun prospect stagnant — bon rythme.</p>
                )}
                {stagnantProspects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-t border-border pt-2 text-sm first:border-0 first:pt-0">
                    <Link to={`/prospects/${p.id}`} state={openProspectLinkState(location)} className="truncate text-foreground hover:underline">
                      {p.companies?.name ?? "—"}
                    </Link>
                    <Badge variant="yellow">Aucune activité {formatRelativeTime(p.last_activity_at)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
