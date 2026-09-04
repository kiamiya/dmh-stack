import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { useOpportunities } from "../hooks/useOpportunities";
import { useClients } from "../hooks/useClients";
import { usePipelineStages } from "../hooks/usePipelineStages";
import { useDealLists } from "../hooks/useDealLists";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { AddDealDialog } from "../components/AddDealDialog";
import { OpportunityKanbanBoardShell, OpportunityKanbanColumn } from "../components/OpportunityKanbanColumn";
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

  // Filtre/liste de la vue "Liste" — état indépendant de kanbanClientId
  // pour ne pas toucher au fonctionnement déjà validé de l'onglet Kanban.
  const [listViewClientId, setListViewClientId] = useState("");
  const { lists: dealLists, create: createDealList, remove: removeDealList, addDeals: addDealsToList, listMemberIds: listDealMemberIds } = useDealLists(listViewClientId);
  const [listId, setListId] = useState("");
  const [listMemberIdSet, setListMemberIdSet] = useState<Set<string> | null>(null);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkListId, setBulkListId] = useState("");

  useEffect(() => {
    if (!listId) {
      setListMemberIdSet(null);
      return;
    }
    listDealMemberIds(listId).then((ids) => setListMemberIdSet(new Set(ids)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  const listViewDeals = useMemo(() => {
    let rows = deals;
    if (listViewClientId) rows = rows.filter((d) => d.client_id === listViewClientId);
    if (listMemberIdSet) rows = rows.filter((d) => listMemberIdSet.has(d.id));
    return rows;
  }, [deals, listViewClientId, listMemberIdSet]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === listViewDeals.length ? new Set() : new Set(listViewDeals.map((d) => d.id))));
  }

  async function handleCreateDealList(e: FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    await createDealList({ clientId: listViewClientId, name: newListName.trim() });
    toast(`Liste "${newListName.trim()}" créée.`, "success");
    setNewListName("");
    setNewListOpen(false);
  }

  async function handleAddSelectedToList() {
    if (!bulkListId || selectedIds.size === 0) return;
    await addDealsToList(bulkListId, Array.from(selectedIds));
    toast(`${selectedIds.size} opportunité(s) ajoutée(s) à la liste.`, "success");
    setSelectedIds(new Set());
    setBulkListId("");
    if (bulkListId === listId) {
      listDealMemberIds(listId).then((ids) => setListMemberIdSet(new Set(ids)));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const targetStageId = String(over.id);
    const current = deals.find((d) => d.id === dealId);
    if (!current || current.stage_id === targetStageId) return;

    try {
      await changeStage(dealId, targetStageId);
    } catch (err) {
      toast(`Échec du changement d'étape : ${(err as Error).message}`, "destructive");
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
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-secondary/40 p-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Client DMH</label>
              <select
                value={listViewClientId}
                onChange={(e) => {
                  setListViewClientId(e.target.value);
                  setListId("");
                  setSelectedIds(new Set());
                }}
                className="rounded-md border border-border px-2 py-1 text-sm"
              >
                <option value="">Tous</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {listViewClientId && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Liste</label>
                <div className="flex gap-2">
                  <select
                    value={listId}
                    onChange={(e) => setListId(e.target.value)}
                    className="rounded-md border border-border px-2 py-1 text-sm"
                  >
                    <option value="">Toutes les listes</option>
                    {dealLists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  {listId && (
                    <Button variant="ghost" size="sm" onClick={() => { removeDealList(listId); setListId(""); }}>
                      Supprimer la liste
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setNewListOpen((v) => !v)}>
                    + Nouvelle liste
                  </Button>
                </div>
              </div>
            )}
            {!listViewClientId && (
              <p className="text-xs text-muted-foreground">Choisis un client DMH pour créer/filtrer des listes.</p>
            )}
          </div>

          {newListOpen && listViewClientId && (
            <form onSubmit={handleCreateDealList} className="flex items-end gap-2 rounded-md border border-border p-3">
              <input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Nom de la liste"
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
              />
              <Button type="submit" size="sm" disabled={!newListName.trim()}>
                Créer la liste
              </Button>
            </form>
          )}

          {selectedIds.size > 0 && listViewClientId && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 p-3 text-sm">
              <span className="font-medium text-foreground">{selectedIds.size} sélectionné(s)</span>
              <select
                value={bulkListId}
                onChange={(e) => setBulkListId(e.target.value)}
                className="rounded-md border border-border px-2 py-1 text-sm"
              >
                <option value="">Choisir une liste…</option>
                {dealLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <Button size="sm" disabled={!bulkListId} onClick={handleAddSelectedToList}>
                Ajouter à la liste
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                Annuler
              </Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    checked={listViewDeals.length > 0 && selectedIds.size === listViewDeals.length}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Attribution</TableHead>
                <TableHead>Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listViewDeals.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <input type="checkbox" checked={selectedIds.has(d.id)} onChange={() => toggleSelected(d.id)} />
                  </TableCell>
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
              {listViewDeals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Aucune opportunité.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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

              <DndContext onDragEnd={handleDragEnd}>
                <OpportunityKanbanBoardShell>
                  {stages.map((stage) => (
                    <OpportunityKanbanColumn
                      key={stage.id}
                      stage={stage}
                      deals={deals.filter((d) => d.stage_id === stage.id)}
                    />
                  ))}
                </OpportunityKanbanBoardShell>
              </DndContext>
            </>
          )}
        </div>
      )}

      <AddDealDialog open={addOpen} onOpenChange={setAddOpen} onCreated={create} />
    </div>
  );
}
