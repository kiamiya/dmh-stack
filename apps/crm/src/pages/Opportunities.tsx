import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useOpportunities } from "../hooks/useOpportunities";
import { useClients } from "../hooks/useClients";
import { usePipelineStages } from "../hooks/usePipelineStages";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { AddDealDialog } from "../components/AddDealDialog";
import { formatCurrency } from "../lib/deals";
import { getDealStatusColor, getDealStatusLabel } from "../lib/dealStatus";
import { validateStageForm } from "../lib/pipelineForm";
import { useToast } from "../components/ui/toast";

export function OpportunitiesPage() {
  const { deals, loading, error, create, changeStage } = useOpportunities();
  const clients = useClients();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [kanbanClientId, setKanbanClientId] = useState("");
  const { stages, addStage } = usePipelineStages(kanbanClientId);
  const [newStageName, setNewStageName] = useState("");
  const [stageError, setStageError] = useState<string | null>(null);

  async function handleStageChange(id: string, stageId: string) {
    try {
      await changeStage(id, stageId);
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

  async function handleAddStage(e: FormEvent) {
    e.preventDefault();
    const validationError = validateStageForm({ name: newStageName, existingNames: stages.map((s) => s.name) });
    if (validationError) {
      setStageError(validationError);
      return;
    }
    setStageError(null);
    try {
      await addStage(newStageName.trim());
      setNewStageName("");
    } catch (err) {
      setStageError((err as Error).message);
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
                <TableCell className="font-medium text-foreground">
                  <Link to={`/opportunities/${d.id}`} className="hover:underline">
                    {d.company_name}
                  </Link>
                </TableCell>
                <TableCell>{d.contacts ? `${d.contacts.first_name} ${d.contacts.last_name}` : "—"}</TableCell>
                <TableCell>{formatCurrency(d.deal_value)}</TableCell>
                <TableCell>
                  <Badge variant={getDealStatusColor(d.status)}>{getDealStatusLabel(d.status)}</Badge>
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Client DMH</label>
            <select
              value={kanbanClientId}
              onChange={(e) => setKanbanClientId(e.target.value)}
              className="rounded-md border border-border px-2 py-1 text-sm"
            >
              <option value="">Choisir un client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {!kanbanClientId && (
            <p className="text-sm text-muted-foreground">
              Choisis un client pour voir son Kanban — les étapes sont propres à chaque client.
            </p>
          )}

          {kanbanClientId && (
            <>
              <form onSubmit={handleAddStage} className="flex items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Ajouter une étape</label>
                  <input
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="Nom de l'étape"
                    className="rounded-md border border-border px-2 py-1.5 text-sm"
                  />
                </div>
                <Button type="submit" size="sm" variant="outline">
                  + Étape
                </Button>
                {stageError && <p className="text-sm text-destructive">{stageError}</p>}
              </form>

              <div className="flex gap-3 overflow-x-auto">
                {stages.map((stage) => {
                  const columnDeals = deals.filter((d) => d.stage_id === stage.id);
                  return (
                    <div
                      key={stage.id}
                      className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-secondary/50 p-2"
                    >
                      <div className="flex items-center justify-between px-1 pb-2">
                        <span className="text-sm font-semibold text-foreground">{stage.name}</span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {columnDeals.length}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {columnDeals.map((d) => (
                          <div key={d.id} className="rounded-md border border-border bg-card p-2 text-sm shadow-sm">
                            <Link to={`/opportunities/${d.id}`} className="font-medium text-foreground hover:underline">
                              {d.company_name}
                            </Link>
                            <div className="text-muted-foreground">{formatCurrency(d.deal_value)}</div>
                            <div className="mt-1">
                              <select
                                value={stage.id}
                                onChange={(e) => handleStageChange(d.id, e.target.value)}
                                className="w-full rounded-md border border-border px-2 py-1 text-sm"
                              >
                                {stages.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <AddDealDialog open={addOpen} onOpenChange={setAddOpen} onCreated={create} />
    </div>
  );
}
