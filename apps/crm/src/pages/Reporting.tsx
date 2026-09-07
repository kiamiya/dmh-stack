import { useMemo } from "react";
import { PageHeader } from "../components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { FunnelChart } from "../components/charts/FunnelChart";
import { formatCurrency } from "../lib/deals";
import { computeFunnelFromHistory } from "../lib/dashboardStats";
import { computeConversionRate, computePipelineValueByStatus } from "../lib/opportunityStats";
import { computeClientPerformance } from "../lib/reportingStats";
import { useProspects } from "../hooks/useProspects";
import { useStatusHistory } from "../hooks/useStatusHistory";
import { useDeals } from "../hooks/useDeals";
import { useMeetings } from "../hooks/useMeetings";
import { useClients } from "../hooks/useClients";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { useAllInteractions } from "../hooks/useAllInteractions";

export function ReportingPage() {
  const { prospects, loading: prospectsLoading } = useProspects();
  const { history, loading: historyLoading } = useStatusHistory();
  const { deals, loading: dealsLoading } = useDeals();
  const { meetings, loading: meetingsLoading } = useMeetings();
  const { interactions, loading: interactionsLoading } = useAllInteractions();
  const clients = useClients();
  const staff = useStaffMembers();

  const loading = prospectsLoading || historyLoading || dealsLoading || meetingsLoading || interactionsLoading;

  const wonDeals = deals.filter((d) => d.status === "won");
  const pipelineValue = useMemo(() => computePipelineValueByStatus(deals), [deals]);
  const conversionRate = useMemo(() => computeConversionRate(deals), [deals]);
  const funnel = useMemo(() => computeFunnelFromHistory(history), [history]);
  const clientPerformance = useMemo(
    () => computeClientPerformance(clients, deals, meetings, staff, prospects, interactions),
    [clients, deals, meetings, staff, prospects, interactions],
  );

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
      <PageHeader kicker="Pilotage · performance" title="Reporting" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card blueprint>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total prospects</div>
            <div className="text-2xl font-semibold text-foreground">{prospects.length}</div>
          </CardContent>
        </Card>
        <Card blueprint>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Deals gagnés</div>
            <div className="text-2xl font-semibold text-foreground">{wonDeals.length}</div>
          </CardContent>
        </Card>
        <Card blueprint>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Taux de conversion</div>
            <div className="text-2xl font-semibold text-foreground">{conversionRate}%</div>
          </CardContent>
        </Card>
        <Card blueprint>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">RDV planifiés</div>
            <div className="text-2xl font-semibold text-foreground">{meetings.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Entonnoir de conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={funnel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline des opportunités</CardTitle>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance par client</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Commercial</TableHead>
                <TableHead>Contacts travaillés</TableHead>
                <TableHead>Opportunités</TableHead>
                <TableHead>Gagnées</TableHead>
                <TableHead>Valeur pipeline</TableHead>
                <TableHead>RDV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientPerformance.map((row) => (
                <TableRow key={row.clientId}>
                  <TableCell className="font-medium text-foreground">{row.clientName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.topStaffName ?? "—"}</TableCell>
                  <TableCell>{row.workedContactsCount}</TableCell>
                  <TableCell>{row.dealsCount}</TableCell>
                  <TableCell>{row.wonDealsCount}</TableCell>
                  <TableCell>{formatCurrency(row.pipelineValue)}</TableCell>
                  <TableCell>{row.meetingsCount}</TableCell>
                </TableRow>
              ))}
              {clientPerformance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Aucun client DMH enregistré.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
