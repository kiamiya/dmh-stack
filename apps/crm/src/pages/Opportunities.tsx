import { useState } from "react";
import { useOpportunities } from "../hooks/useOpportunities";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { AddDealDialog } from "../components/AddDealDialog";
import { formatCurrency } from "../lib/deals";
import { ALL_DEAL_STATUSES, getDealStatusColor, getDealStatusLabel } from "../lib/dealStatus";
import type { DealRow, DealStatus } from "../services/deals";
import { useToast } from "../components/ui/toast";

function StatusSelect({ deal, onChange }: { deal: DealRow; onChange: (status: DealStatus) => void }) {
  return (
    <select
      value={deal.status}
      onChange={(e) => onChange(e.target.value as DealStatus)}
      className="rounded-md border border-border px-2 py-1 text-sm"
    >
      {ALL_DEAL_STATUSES.map((s) => (
        <option key={s} value={s}>
          {getDealStatusLabel(s)}
        </option>
      ))}
    </select>
  );
}

export function OpportunitiesPage() {
  const { deals, loading, error, create, changeStatus } = useOpportunities();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("list");

  async function handleStatusChange(id: string, status: DealStatus) {
    try {
      await changeStatus(id, status);
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-3 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Opportunités</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded px-2 py-1 text-xs font-medium ${view === "list" ? "bg-secondary" : "text-muted-foreground"}`}
            >
              Liste
            </button>
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`rounded px-2 py-1 text-xs font-medium ${view === "kanban" ? "bg-secondary" : "text-muted-foreground"}`}
            >
              Kanban
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            + Opportunité
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!loading && !error && view === "list" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entreprise</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Attribution</TableHead>
              <TableHead>Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium text-foreground">{d.company_name}</TableCell>
                <TableCell>{d.contacts ? `${d.contacts.first_name} ${d.contacts.last_name}` : "—"}</TableCell>
                <TableCell>{formatCurrency(d.deal_value)}</TableCell>
                <TableCell>
                  <StatusSelect deal={d} onChange={(status) => handleStatusChange(d.id, status)} />
                </TableCell>
                <TableCell>
                  {d.attributed_to_dmh === null ? "—" : (
                    <Badge variant={d.attributed_to_dmh ? "green" : "default"}>
                      {d.attributed_to_dmh ? "Oui" : "Non"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{formatCurrency(d.commission_amount)}</TableCell>
              </TableRow>
            ))}
            {deals.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Aucune opportunité.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {!loading && !error && view === "kanban" && (
        <div className="flex gap-3 overflow-x-auto">
          {ALL_DEAL_STATUSES.map((status) => {
            const columnDeals = deals.filter((d) => d.status === status);
            return (
              <div key={status} className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-secondary/50 p-2">
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="text-sm font-semibold text-foreground">{getDealStatusLabel(status)}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {columnDeals.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {columnDeals.map((d) => (
                    <div key={d.id} className="rounded-md border border-border bg-card p-2 text-sm shadow-sm">
                      <div className="font-medium text-foreground">{d.company_name}</div>
                      <div className="text-muted-foreground">{formatCurrency(d.deal_value)}</div>
                      <div className="mt-1">
                        <StatusSelect deal={d} onChange={(s) => handleStatusChange(d.id, s)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddDealDialog open={addOpen} onOpenChange={setAddOpen} onCreated={create} />
    </div>
  );
}
