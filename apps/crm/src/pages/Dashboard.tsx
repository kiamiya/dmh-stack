import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { openProspectLinkState } from "../lib/navigation";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { StatusBarList } from "../components/charts/StatusBarList";
import { FunnelChart } from "../components/charts/FunnelChart";
import { WeeklyAreaChart } from "../components/charts/WeeklyAreaChart";
import { StackedWeeklyBarChart } from "../components/charts/StackedWeeklyBarChart";
import { DashboardBlocksDialog } from "../components/DashboardBlocksDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { formatScore, getScoreColor } from "../lib/score";
import { formatCurrency, getDealDisplayName } from "../lib/deals";
import { formatRelativeTime } from "../lib/relativeTime";
import { isStagnant } from "../lib/stagnation";
import { groupActivityEventsByDay, mergeActivityEvents } from "../lib/activityFeed";
import {
  combineWeeklyBreakdown,
  computeFunnelFromHistory,
  computeStatusCounts,
  computeWeeklyCounts,
  topProspectsByScore,
} from "../lib/dashboardStats";
import { computeClientPerformance } from "../lib/reportingStats";
import { useProspects } from "../hooks/useProspects";
import { useStatusHistory } from "../hooks/useStatusHistory";
import { useDeals } from "../hooks/useDeals";
import { useAllInteractions } from "../hooks/useAllInteractions";
import { useMeetings } from "../hooks/useMeetings";
import { useClients } from "../hooks/useClients";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { useTasks } from "../hooks/useTasks";
import { useDashboards } from "../hooks/useDashboards";
import { computeConversionRate, computePipelineValueByStatus } from "../lib/opportunityStats";
import { computeOverdueTasks, computeTaskCountsByStatus } from "../lib/taskStats";
import { PageHeader } from "../components/ui/page-header";
import { DropdownMenu, DropdownMenuItem } from "../components/ui/dropdown-menu";
import { useToast } from "../components/ui/toast";
import { EMPTY_DASHBOARD_FILTERS, filterByOwnerAndDate } from "../lib/dashboardFilters";
import type { DashboardFilters } from "../lib/dashboardFilters";

export function DashboardPage() {
  const location = useLocation();
  const {
    prospects: rawProspects,
    loading: prospectsLoading,
    reload: reloadProspects,
  } = useProspects();
  const { history, loading: historyLoading, reload: reloadHistory } = useStatusHistory();
  const { deals: rawDeals, loading: dealsLoading, reload: reloadDeals } = useDeals();
  const {
    interactions: rawInteractions,
    loading: interactionsLoading,
    reload: reloadInteractions,
  } = useAllInteractions();
  const { meetings: rawMeetings, loading: meetingsLoading, reload: reloadMeetings } = useMeetings();
  const clients = useClients();
  const staff = useStaffMembers();
  const { tasks: rawTasks, loading: tasksLoading, reload: reloadTasks } = useTasks();
  const { dashboards, create, update, remove, duplicate } = useDashboards();
  const { toast } = useToast();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [blocksDialogOpen, setBlocksDialogOpen] = useState(false);
  const activeDashboard = dashboards.find((d) => d.id === activeId) ?? null;

  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_DASHBOARD_FILTERS);
  const hasActiveFilters = filters.ownerId !== null || filters.dateFrom !== null || filters.dateTo !== null;

  /** Filtre "rapide" du mockup (Propriétaire + Plage de dates), appliqué une fois ici — chaque bloc existant continue de consommer ces variables sans changer sa propre logique. `deals` n'a pas encore de propriétaire (pas de colonne `assigned_to`, prévue avec le chantier Pipeline) donc seule la plage de dates s'y applique ; `interactions`/`meetings` filtrent sur leur créateur/organisateur réel. */
  const prospects = useMemo(
    () => filterByOwnerAndDate(rawProspects, filters, (p) => p.assigned_to, (p) => p.created_at),
    [rawProspects, filters],
  );
  const deals = useMemo(
    () => filterByOwnerAndDate(rawDeals, filters, () => null, (d) => d.signed_at ?? d.created_at),
    [rawDeals, filters],
  );
  const interactions = useMemo(
    () => filterByOwnerAndDate(rawInteractions, filters, (i) => i.created_by, (i) => i.occurred_at),
    [rawInteractions, filters],
  );
  const meetings = useMemo(
    () => filterByOwnerAndDate(rawMeetings, filters, (m) => m.staff_id, (m) => m.starts_at),
    [rawMeetings, filters],
  );
  const tasks = useMemo(
    () => filterByOwnerAndDate(rawTasks, filters, (t) => t.assigned_to, () => null),
    [rawTasks, filters],
  );

  const [refreshedAt, setRefreshedAt] = useState(() => new Date());
  function handleRefresh() {
    reloadProspects();
    reloadHistory();
    reloadDeals();
    reloadInteractions();
    reloadMeetings();
    reloadTasks();
    setRefreshedAt(new Date());
  }

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
  const weeklyActivity = useMemo(() => {
    const calls = computeWeeklyCounts(
      interactions.filter((i) => i.type === "call").map((i) => i.occurred_at),
      8,
      now,
    );
    const emails = computeWeeklyCounts(
      interactions.filter((i) => i.type === "email_sent").map((i) => i.occurred_at),
      8,
      now,
    );
    // "RDV posés" approximé par la date de l'événement lui-même (`starts_at`) — `meetings` n'a pas de date de création distincte.
    const bookedMeetings = computeWeeklyCounts(meetings.map((m) => m.starts_at), 8, now);
    return combineWeeklyBreakdown(calls, emails, bookedMeetings);
  }, [interactions, meetings, now]);
  const toEnrichCount = useMemo(() => prospects.filter((p) => p.status === "to_enrich").length, [prospects]);
  /** Compte réel par étape d'enrichissement (pas de quota/usage fournisseur — non tracé en base, cf. Integrations.tsx) — juste combien de prospects attendent chaque étape. */
  const enrichmentQueue = useMemo(
    () => ({
      pappers: prospects.filter((p) => p.status === "to_enrich").length,
      dropcontact: prospects.filter((p) => p.status === "enriched_pappers").length,
    }),
    [prospects],
  );
  const clientPerformance = useMemo(
    () => computeClientPerformance(clients, deals, meetings, staff, prospects, interactions),
    [clients, deals, meetings, staff, prospects, interactions],
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

  const loading = prospectsLoading || historyLoading || dealsLoading || interactionsLoading || meetingsLoading || tasksLoading;
  const wonDeals = deals.filter((d) => d.status === "won");
  const lostDeals = deals.filter((d) => d.status === "lost");
  const totalCommission = wonDeals.reduce((sum, d) => sum + (d.commission_amount ?? 0), 0);

  const pipelineValue = useMemo(() => computePipelineValueByStatus(deals), [deals]);
  const conversionRate = useMemo(() => computeConversionRate(deals), [deals]);
  const taskCounts = useMemo(() => computeTaskCountsByStatus(tasks), [tasks]);
  const overdueTasks = useMemo(() => computeOverdueTasks(tasks, now), [tasks, now]);

  /** Un bloc par clé du catalogue (`lib/dashboardBlocks.ts`) — même JSX que "Vue d'ensemble" consomme aussi, source unique pour les dashboards nommés (S34-15). */
  function renderBlock(key: string) {
    switch (key) {
      case "weekly_activity":
        return (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Activité de la force de vente</CardTitle>
            </CardHeader>
            <CardContent>
              <StackedWeeklyBarChart title="Activité de la force de vente" data={weeklyActivity} />
            </CardContent>
          </Card>
        );
      case "status_bar":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Prospects par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBarList counts={statusCounts} />
            </CardContent>
          </Card>
        );
      case "funnel":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Funnel de conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelChart stages={funnel} />
            </CardContent>
          </Card>
        );
      case "to_enrich_count":
        return (
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">En attente d'enrichissement</div>
              <div className="text-2xl font-semibold text-foreground">{toEnrichCount}</div>
            </CardContent>
          </Card>
        );
      case "enrichment_queue":
        return (
          <Card>
            <CardHeader>
              <CardTitle>File d'enrichissement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">Pappers (SIREN, secteur, effectif…)</span>
                <Badge variant="blue">{enrichmentQueue.pappers} en attente</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">Dropcontact (email, téléphone…)</span>
                <Badge variant="blue">{enrichmentQueue.dropcontact} en attente</Badge>
              </div>
              <Link to="/integrations" className="text-xs text-accent hover:underline">
                Ouvrir le hub API
              </Link>
            </CardContent>
          </Card>
        );
      case "client_performance":
        return (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Comptes clients suivis</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Commercial</TableHead>
                    <TableHead className="text-right">RDV</TableHead>
                    <TableHead className="text-right">Pipe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientPerformance.map((row) => (
                    <TableRow key={row.clientId}>
                      <TableCell className="font-medium text-foreground">{row.clientName}</TableCell>
                      <TableCell className="text-muted-foreground">{row.topStaffName ?? "—"}</TableCell>
                      <TableCell className="text-right">{row.meetingsCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.pipelineValue)}</TableCell>
                    </TableRow>
                  ))}
                  {clientPerformance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Aucun client DMH enregistré.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      case "weekly_new_prospects":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Nouveaux prospects par semaine</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyAreaChart title="Nouveaux prospects par semaine" data={weeklyNewProspects} />
            </CardContent>
          </Card>
        );
      case "weekly_deals_won":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Deals gagnés par semaine</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyAreaChart title="Deals gagnés par semaine" data={weeklyDealsWon} />
            </CardContent>
          </Card>
        );
      case "top_scores":
        return (
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
        );
      case "deals_list":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Deals ({wonDeals.length} gagnés, {lostDeals.length} perdus)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {deals.length === 0 && <p className="text-sm text-muted-foreground">Aucun deal déclaré.</p>}
              {deals.map((d) => (
                <div key={d.id} className="flex items-center justify-between border-t border-border pt-2 text-sm first:border-0 first:pt-0">
                  <div className="min-w-0 flex-1 truncate text-foreground">{getDealDisplayName(d)}</div>
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
        );
      case "pipeline_value":
        return (
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
        );
      case "task_counts":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Tâches par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBarList counts={taskCounts} />
            </CardContent>
          </Card>
        );
      case "overdue_tasks":
        return (
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
        );
      case "activity_feed":
        return (
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
        );
      case "stagnant_prospects":
        return (
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
        );
      default:
        return null;
    }
  }

  async function handleNewDashboard() {
    const name = window.prompt("Nom du nouveau dashboard :");
    if (!name?.trim()) return;
    await create(name.trim());
  }

  async function handleRenameDashboard(id: string, currentName: string) {
    const name = window.prompt("Nouveau nom :", currentName);
    if (!name?.trim() || name.trim() === currentName) return;
    await update(id, { name: name.trim() });
  }

  async function handleDeleteDashboard(id: string) {
    if (!window.confirm("Supprimer ce dashboard ?")) return;
    if (activeId === id) setActiveId(null);
    await remove(id);
  }

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Lien copié.", "success");
    } catch {
      toast("Impossible de copier le lien.", "destructive");
    }
  }

  function handleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        kicker="Pilotage · vue d'ensemble"
        title="Dashboard"
        actions={
          <>
            <DropdownMenu trigger={<Button variant="outline" size="sm">Partager ▾</Button>} align="end">
              <DropdownMenuItem onClick={handleCopyUrl}>Copier l'URL</DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>Exporter en PDF</DropdownMenuItem>
            </DropdownMenu>
            <DropdownMenu trigger={<Button variant="outline" size="sm">Actions ▾</Button>} align="end">
              <DropdownMenuItem onClick={handleFullscreen}>Afficher en plein écran</DropdownMenuItem>
              {activeDashboard && (
                <>
                  <DropdownMenuItem onClick={() => duplicate(activeDashboard)}>Cloner</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRenameDashboard(activeDashboard.id, activeDashboard.name)}>Renommer</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeleteDashboard(activeDashboard.id)} className="text-destructive">
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenu>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <DropdownMenu
          trigger={
            <Button variant="outline" size="sm">
              {activeDashboard?.name ?? "Vue d'ensemble"} ▾
            </Button>
          }
        >
          <DropdownMenuItem onClick={() => setActiveId(null)}>Vue d'ensemble</DropdownMenuItem>
          {dashboards.map((d) => (
            <DropdownMenuItem key={d.id} onClick={() => setActiveId(d.id)}>
              {d.name}
            </DropdownMenuItem>
          ))}
          <div className="my-1 border-t border-border" />
          <DropdownMenuItem onClick={handleNewDashboard}>+ Créer un tableau de bord</DropdownMenuItem>
        </DropdownMenu>
        {activeDashboard && (
          <Button variant="outline" size="sm" onClick={() => setBlocksDialogOpen(true)}>
            Gérer les blocs ({activeDashboard.blocks.length})
          </Button>
        )}
        <span className="text-xs text-muted-foreground">actualisé {formatRelativeTime(refreshedAt.toISOString())}</span>
        <button
          type="button"
          title="Rafraîchir"
          aria-label="Rafraîchir"
          onClick={handleRefresh}
          className="rounded px-1.5 py-0.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          ↻
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-secondary/40 p-3 print:hidden">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Propriétaire</label>
          <select
            value={filters.ownerId ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, ownerId: e.target.value || null }))}
            className="rounded-md border border-border px-2 py-1 text-sm"
          >
            <option value="">Tous</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Depuis le</label>
          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || null }))}
            className="rounded-md border border-border px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Jusqu'au</label>
          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || null }))}
            className="rounded-md border border-border px-2 py-1 text-sm"
          />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_DASHBOARD_FILTERS)}>
            Réinitialiser
          </Button>
        )}
      </div>

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

      {activeDashboard ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {activeDashboard.blocks.length === 0 && (
            <Card className="lg:col-span-2">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Aucun bloc sélectionné — clique "Gérer les blocs" pour en ajouter.
              </CardContent>
            </Card>
          )}
          {activeDashboard.blocks.map((key) => <div key={key}>{renderBlock(key)}</div>)}
        </div>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="print:hidden">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="evolution">Évolution</TabsTrigger>
            <TabsTrigger value="scores-deals">Scores &amp; Deals</TabsTrigger>
            <TabsTrigger value="opportunities-tasks">Opportunités &amp; Tâches</TabsTrigger>
            <TabsTrigger value="activity">Activité</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {renderBlock("weekly_activity")}
              {renderBlock("status_bar")}
              {renderBlock("funnel")}
              {renderBlock("to_enrich_count")}
              {renderBlock("enrichment_queue")}
              {renderBlock("client_performance")}
            </div>
          </TabsContent>

          <TabsContent value="evolution">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {renderBlock("weekly_new_prospects")}
              {renderBlock("weekly_deals_won")}
            </div>
          </TabsContent>

          <TabsContent value="scores-deals">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {renderBlock("top_scores")}
              {renderBlock("deals_list")}
            </div>
          </TabsContent>

          <TabsContent value="opportunities-tasks">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {renderBlock("pipeline_value")}
              {renderBlock("task_counts")}
              {renderBlock("overdue_tasks")}
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {renderBlock("activity_feed")}
              {renderBlock("stagnant_prospects")}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {activeDashboard && (
        <DashboardBlocksDialog
          open={blocksDialogOpen}
          onOpenChange={setBlocksDialogOpen}
          blocks={activeDashboard.blocks}
          onSave={(blocks) => update(activeDashboard.id, { blocks })}
        />
      )}
    </div>
  );
}
