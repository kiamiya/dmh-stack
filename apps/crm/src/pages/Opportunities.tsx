import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { useOpportunities } from "../hooks/useOpportunities";
import { useClients } from "../hooks/useClients";
import { useKanbanDndSensors } from "../hooks/useKanbanDndSensors";
import { usePipelineStages } from "../hooks/usePipelineStages";
import { useDealLists } from "../hooks/useDealLists";
import { matchesRuleGroups } from "../lib/segmentEvaluator";
import { listValuesByEntityForClient } from "../services/customFields";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { AddDealDialog } from "../components/AddDealDialog";
import { OpportunityKanbanBoardShell, OpportunityKanbanColumn } from "../components/OpportunityKanbanColumn";
import { RuleGroupsEditor } from "../components/RuleGroupsEditor";
import type { RuleGroupDraft } from "../components/RuleGroupsEditor";
import { PageHeader } from "../components/ui/page-header";
import { formatCurrency, getDealDisplayName } from "../lib/deals";
import {
  computeAverageCycleDays,
  computeDealAgeDays,
  computeNextActionForDeal,
  computeWeightedPipelineValue,
} from "../lib/opportunityStats";
import { getDealStatusColor, getDealStatusLabel } from "../lib/dealStatus";
import { validateStageForm } from "../lib/pipelineForm";
import { useToast } from "../components/ui/toast";
import { useTasks } from "../hooks/useTasks";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { useSession } from "../lib/useSession";
import { useSelectedClient } from "../lib/selectedClient";

const EMPTY_GROUPS: RuleGroupDraft[] = [{ conditions: [{ field: "status", operator: "eq", value: "" }] }];

export function OpportunitiesPage() {
  const { deals, loading, error, create, changeStage } = useOpportunities();
  const { tasks } = useTasks();
  const clients = useClients();
  const { toast } = useToast();
  const staff = useStaffMembers();
  const { session } = useSession();
  // `*_lists.created_by` référence staff_members : un compte client (non-staff) casserait la contrainte FK si on y mettait son propre uid tel quel (même pattern que tasks.created_by, AddTaskDialog.tsx).
  const createdBy = session?.user.id && staff.some((s) => s.id === session.user.id) ? session.user.id : null;
  const now = useMemo(() => new Date(), []);
  const kanbanSensors = useKanbanDndSensors();
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const { clientId, setClientId } = useSelectedClient();
  const { stages, addStage } = usePipelineStages(clientId);
  const [newStageName, setNewStageName] = useState("");
  const [stageError, setStageError] = useState<string | null>(null);

  // Sélecteur de client DMH global (S34) : Liste et Kanban partagent
  // désormais le même client sélectionné (avant S34, deux states
  // indépendants — changer de vue imposait de reprendre le client).
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const deepLinkedClient = searchParams.get("client");
    if (deepLinkedClient) setClientId(deepLinkedClient);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { lists: dealLists, create: createDealList, remove: removeDealList, addDeals: addDealsToList, listMemberIds: listDealMemberIds } = useDealLists(clientId);
  const [listId, setListId] = useState(() => searchParams.get("list") ?? "");
  const [listMemberIdSet, setListMemberIdSet] = useState<Set<string> | null>(null);
  const [customFieldValuesById, setCustomFieldValuesById] = useState<Record<string, Record<string, unknown>>>({});
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListMode, setNewListMode] = useState<"static" | "dynamic">("static");
  const [newListGroups, setNewListGroups] = useState<RuleGroupDraft[]>(EMPTY_GROUPS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupByClient, setGroupByClient] = useState(false);
  const [bulkListId, setBulkListId] = useState("");

  const activeList = dealLists.find((l) => l.id === listId) ?? null;

  useEffect(() => {
    if (!activeList || activeList.rules) {
      setListMemberIdSet(null);
      return;
    }
    listDealMemberIds(activeList.id).then((ids) => setListMemberIdSet(new Set(ids)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeList?.id, activeList?.rules]);

  useEffect(() => {
    if (!clientId) {
      setCustomFieldValuesById({});
      return;
    }
    listValuesByEntityForClient(supabase, "opportunity", clientId)
      .then(setCustomFieldValuesById)
      .catch(() => setCustomFieldValuesById({}));
  }, [clientId]);

  const listViewDeals = useMemo(() => {
    let rows = deals;
    if (clientId) rows = rows.filter((d) => d.client_id === clientId);
    if (activeList) {
      if (activeList.rules) {
        rows = rows.filter((d) =>
          matchesRuleGroups({ ...d, ...customFieldValuesById[d.id] } as unknown as Record<string, unknown>, activeList.rules!),
        );
      } else if (listMemberIdSet) {
        rows = rows.filter((d) => listMemberIdSet.has(d.id));
      }
    }
    return rows;
  }, [deals, clientId, activeList, listMemberIdSet, customFieldValuesById]);

  const weightedPipelineValue = useMemo(() => computeWeightedPipelineValue(listViewDeals), [listViewDeals]);
  const negotiationCount = useMemo(() => listViewDeals.filter((d) => d.status === "negotiation").length, [listViewDeals]);
  const averageCycleDays = useMemo(() => computeAverageCycleDays(listViewDeals), [listViewDeals]);

  const dealsByClient = useMemo(() => {
    const groups = new Map<string, typeof listViewDeals>();
    for (const d of listViewDeals) {
      const group = groups.get(d.client_id);
      if (group) group.push(d);
      else groups.set(d.client_id, [d]);
    }
    return Array.from(groups.entries()).map(([clientId, rows]) => ({
      clientId,
      clientName: clients.find((c) => c.id === clientId)?.name ?? "—",
      rows,
    }));
  }, [listViewDeals, clients]);

  function renderDealRow(d: (typeof listViewDeals)[number]) {
    const nextAction = computeNextActionForDeal(d.id, tasks);
    return (
      <TableRow key={d.id}>
        <TableCell>
          <input type="checkbox" checked={selectedIds.has(d.id)} onChange={() => toggleSelected(d.id)} />
        </TableCell>
        <TableCell className="font-medium text-foreground">
          <Link to={`/opportunities/${d.id}`} className="hover:underline">
            {getDealDisplayName(d)}
          </Link>
        </TableCell>
        <TableCell>{d.contacts ? `${d.contacts.first_name} ${d.contacts.last_name}` : "—"}</TableCell>
        <TableCell>{formatCurrency(d.deal_value)}</TableCell>
        <TableCell>{d.probability != null ? `${d.probability}%` : "—"}</TableCell>
        <TableCell>
          <Badge variant={getDealStatusColor(d.status)}>{getDealStatusLabel(d.status)}</Badge>
        </TableCell>
        <TableCell>{computeDealAgeDays(d, now)} j</TableCell>
        <TableCell className="text-muted-foreground">
          {nextAction ? `${nextAction.title} (${nextAction.dueDate})` : "—"}
        </TableCell>
        <TableCell>
          {d.attributed_to_dmh === null ? (
            "—"
          ) : (
            <Badge variant={d.attributed_to_dmh ? "green" : "default"}>{d.attributed_to_dmh ? "Oui" : "Non"}</Badge>
          )}
        </TableCell>
        <TableCell>{formatCurrency(d.commission_amount)}</TableCell>
      </TableRow>
    );
  }

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

  function resetNewListForm() {
    setNewListName("");
    setNewListMode("static");
    setNewListGroups(EMPTY_GROUPS);
    setNewListOpen(false);
  }

  async function handleCreateDealList(e: FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    const rules =
      newListMode === "dynamic"
        ? newListGroups
            .map((g) => ({
              conditions: g.conditions
                .filter((c) => c.field.trim())
                .map((c) => ({ field: c.field, operator: c.operator, value: c.operator === "is_set" || c.operator === "is_not_set" ? true : c.value })),
            }))
            .filter((g) => g.conditions.length > 0)
        : undefined;
    await createDealList({ clientId: clientId, name: newListName.trim(), rules, createdBy });
    toast(`Liste "${newListName.trim()}" créée.`, "success");
    resetNewListForm();
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
    <div className="space-y-3 p-6">
      <PageHeader
        kicker="Prospection · affaires en cours"
        title="Opportunités"
        actions={
          <>
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
          </>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!loading && !error && view === "list" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-secondary/40 p-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Client DMH</label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
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
            {clientId && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Liste</label>
                <div className="flex gap-2">
                  <select
                    value={listId}
                    onChange={(e) => setListId(e.target.value)}
                    className="rounded-md border border-border px-2 py-1 text-sm"
                  >
                    <option value="">Toutes les opportunités</option>
                    {dealLists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.rules ? "(dynamique)" : ""}
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
            {!clientId && (
              <p className="text-xs text-muted-foreground">Choisis un client DMH pour créer/filtrer des listes.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-secondary/40 p-3 text-sm">
            <span className="text-foreground">
              Pipe pondéré <strong className="font-semibold">{formatCurrency(weightedPipelineValue)}</strong> · {negotiationCount} affaire(s) en négociation
              {averageCycleDays !== null && <> · cycle moyen {averageCycleDays} j</>}
            </span>
            <Button variant="outline" size="sm" onClick={() => setGroupByClient((v) => !v)} disabled={!!clientId}>
              {groupByClient ? "Vue à plat" : "Grouper par client"}
            </Button>
          </div>

          {newListOpen && clientId && (
            <form onSubmit={handleCreateDealList} className="space-y-3 rounded-md border border-border p-3">
              <input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Nom de la liste"
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
              <div className="flex w-fit gap-1 rounded-md border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => setNewListMode("static")}
                  className={`rounded px-2 py-1 text-xs font-medium ${newListMode === "static" ? "bg-secondary" : "text-muted-foreground"}`}
                >
                  Statique
                </button>
                <button
                  type="button"
                  onClick={() => setNewListMode("dynamic")}
                  className={`rounded px-2 py-1 text-xs font-medium ${newListMode === "dynamic" ? "bg-secondary" : "text-muted-foreground"}`}
                >
                  Dynamique (critères)
                </button>
              </div>
              {newListMode === "dynamic" && (
                <RuleGroupsEditor entityType="opportunity" clientId={clientId} groups={newListGroups} onChange={setNewListGroups} />
              )}
              <Button type="submit" size="sm" disabled={!newListName.trim()}>
                Créer la liste
              </Button>
            </form>
          )}

          {selectedIds.size > 0 && clientId && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 p-3 text-sm">
              <span className="font-medium text-foreground">{selectedIds.size} sélectionné(s)</span>
              <select
                value={bulkListId}
                onChange={(e) => setBulkListId(e.target.value)}
                className="rounded-md border border-border px-2 py-1 text-sm"
              >
                <option value="">Choisir une liste…</option>
                {dealLists.filter((l) => !l.rules).map((l) => (
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

          {groupByClient ? (
            <div className="space-y-4">
              {dealsByClient.map((group) => (
                <div key={group.clientId} className="space-y-1.5">
                  <span className="font-heading text-sm font-semibold text-foreground">{group.clientName}</span>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Entreprise</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Proba.</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Ancienneté</TableHead>
                        <TableHead>Prochaine action</TableHead>
                        <TableHead>Attribution</TableHead>
                        <TableHead>Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>{group.rows.map(renderDealRow)}</TableBody>
                  </Table>
                </div>
              ))}
              {dealsByClient.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">Aucune opportunité.</p>
              )}
            </div>
          ) : (
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
                  <TableHead>Proba.</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Ancienneté</TableHead>
                  <TableHead>Prochaine action</TableHead>
                  <TableHead>Attribution</TableHead>
                  <TableHead>Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listViewDeals.map(renderDealRow)}
                {listViewDeals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      Aucune opportunité.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {!loading && !error && view === "kanban" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Client DMH</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
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

          {!clientId && (
            <p className="text-sm text-muted-foreground">
              Choisis un client pour voir son Kanban — les étapes sont propres à chaque client.
            </p>
          )}

          {clientId && (
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

              <DndContext sensors={kanbanSensors} onDragEnd={handleDragEnd}>
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
