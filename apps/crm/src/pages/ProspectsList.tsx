import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { openProspectLinkState } from "../lib/navigation";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { SortingState, VisibilityState } from "@tanstack/react-table";
import { TriangleAlert } from "lucide-react";
import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { PageHeader } from "../components/ui/page-header";
import { Skeleton } from "../components/ui/skeleton";
import { ALL_PROSPECT_STATUSES, getStatusColor, getStatusLabel } from "../lib/status";
import { formatScore, getScoreColor } from "../lib/score";
import { formatRelativeTime } from "../lib/relativeTime";
import { formatFreshnessDays } from "../lib/dataFreshness";
import { isStagnant } from "../lib/stagnation";
import { computeContactCompleteness } from "../lib/contactCompleteness";
import { hasPhone, isEmailVerified, isFreshUnderDays } from "../lib/quickFilters";
import { cn } from "../lib/cn";
import {
  EMPTY_PROSPECT_FILTERS,
  extractDistinctClients,
  extractDistinctNafLabels,
  filterProspects,
  filtersToSearchParams,
  searchParamsToFilters,
} from "../lib/prospectFilters";
import type { ProspectFilters } from "../lib/prospectFilters";
import { toCsv } from "../lib/csv";
import { applyColumnOrder, loadColumnPreferences, moveColumn, saveColumnPreferences } from "../lib/columnPreferences";
import {
  createSavedView,
  duplicateSavedView,
  loadSavedViews,
  removeSavedView,
  renameSavedView,
  saveSavedViews,
} from "../lib/savedViews";
import type { SavedView } from "../lib/savedViews";
import { useProspects } from "../hooks/useProspects";
import { useCompanies } from "../hooks/useCompanies";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { useKanbanDndSensors } from "../hooks/useKanbanDndSensors";
import { useContactLists } from "../hooks/useContactLists";
import { useSelectedClient } from "../lib/selectedClient";
import { MASKED_VALUE, useViewMode } from "../lib/viewMode";
import { matchesRuleGroups } from "../lib/segmentEvaluator";
import { listValuesByEntityForClient } from "../services/customFields";
import { listActivityFlagsByContactForClient } from "../services/interactions";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/ui/toast";
import { AddContactDialog } from "../components/AddContactDialog";
import { ImportEntitiesDialog } from "../components/ImportEntitiesDialog";
import { RuleGroupsEditor } from "../components/RuleGroupsEditor";
import type { RuleGroupDraft } from "../components/RuleGroupsEditor";
import { KanbanBoardShell, KanbanColumn } from "../components/KanbanColumn";
import { CompletenessBar } from "../components/CompletenessBar";
import { SavedViewTabs } from "../components/SavedViewTabs";
import { QuickFilterChips } from "../components/QuickFilterChips";
import { groupProspectsByStatus } from "../lib/kanban";
import { EntreprisesPanel } from "../components/prospects/EntreprisesPanel";
import type { ProspectListRow } from "../services/prospects";
import type { ProspectStatus } from "@dmh/types";

const columnHelper = createColumnHelper<ProspectListRow>();

const SAVED_VIEWS_STORAGE_KEY = "dmh-crm-saved-views";

const CONFIGURABLE_COLUMN_IDS = ["contact", "company", "coordinates", "source", "confidence", "freshness", "status", "score", "client", "lastActivity"];
const DEFAULT_HIDDEN_COLUMN_IDS = ["score", "client", "lastActivity"];
const COLUMN_LABELS: Record<string, string> = {
  contact: "Contact",
  company: "Société",
  coordinates: "Coordonnées",
  source: "Source",
  confidence: "Confiance",
  freshness: "Fraîcheur",
  status: "Statut",
  score: "Score IA",
  client: "Client DMH",
  lastActivity: "Dernière activité",
};

const DATA_SOURCE_LABELS: Record<string, string> = {
  pharow: "Pharow",
  dropcontact: "Dropcontact",
  linkedin: "LinkedIn",
  manual: "Manuel",
};

const EMPTY_GROUPS: RuleGroupDraft[] = [{ conditions: [{ field: "job_title", operator: "eq", value: "" }] }];

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Écran unifié Prospects/Contacts/Entreprises (correction Claude Design,
 * S34) — auparavant 3 pages séparées (Vue globale/Contacts/Entreprises)
 * reliées par `ProspectSubNav`, ne correspondant pas à l'écran "Prospects"
 * du mockup (bascule Contacts/Entreprises unique, onglets de vues
 * enregistrées, menu "..." consolidé, filtres rapides). L'onglet
 * "Contacts" reprend le grain de l'ancienne "Vue globale" (1 ligne =
 * 1 prospect/contact avec statut pipeline), recolonné pour coller au
 * mockup ; l'onglet "Entreprises" porte l'ancienne page `Companies.tsx`
 * (désormais `EntreprisesPanel`).
 */
export function ProspectsListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    prospects,
    loading,
    error,
    reload,
    bulkUpdateStatus,
    bulkUpdateAssignment,
    restoreStatuses,
    restoreAssignments,
  } = useProspects();
  const { companies } = useCompanies();
  const staff = useStaffMembers();
  const { toast } = useToast();
  const kanbanSensors = useKanbanDndSensors();
  const { clientId } = useSelectedClient();
  const { viewMode } = useViewMode();
  const masked = viewMode === "client_portal";

  const initialViewParam = searchParams.get("view");
  const [entityView, setEntityView] = useState<"contacts" | "companies">(initialViewParam === "companies" ? "companies" : "contacts");
  const [displayMode, setDisplayMode] = useState<"list" | "kanban">(initialViewParam === "kanban" ? "kanban" : "list");
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filters, setFilters] = useState<ProspectFilters>(() => searchParamsToFilters(searchParams));
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    Object.fromEntries(DEFAULT_HIDDEN_COLUMN_IDS.map((id) => [id, false])),
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(CONFIGURABLE_COLUMN_IDS);
  const [savedViews, setSavedViews] = useState<SavedView<ProspectFilters>[]>([]);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null);
  const [newViewName, setNewViewName] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);

  const { lists: contactLists, addContacts: addContactsToList, listMemberIds: listContactMemberIds, create: createContactList } = useContactLists(clientId || "");
  const [segmentId, setSegmentId] = useState("");
  const [segmentMemberIdSet, setSegmentMemberIdSet] = useState<Set<string> | null>(null);
  const [customFieldValuesById, setCustomFieldValuesById] = useState<Record<string, Record<string, unknown>>>({});
  const [activityFlagsById, setActivityFlagsById] = useState<Record<string, Record<string, boolean>>>({});
  const [newSegmentOpen, setNewSegmentOpen] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState("");
  const [newSegmentMode, setNewSegmentMode] = useState<"static" | "dynamic">("static");
  const [newSegmentGroups, setNewSegmentGroups] = useState<RuleGroupDraft[]>(EMPTY_GROUPS);
  const [bulkListId, setBulkListId] = useState("");

  const activeSegment = contactLists.find((l) => l.id === segmentId) ?? null;

  useEffect(() => {
    const saved = loadColumnPreferences(localStorage);
    if (saved) {
      setColumnOrder(applyColumnOrder(CONFIGURABLE_COLUMN_IDS, saved.order));
      setColumnVisibility(Object.fromEntries(saved.hidden.map((id) => [id, false])));
    }
    setSavedViews(loadSavedViews(localStorage, SAVED_VIEWS_STORAGE_KEY));
  }, []);

  /** Le client DMH suit désormais le sélecteur global du Header (S34-6) — plus de `<select>` local redondant, alignement avec Contacts/Entreprises/Opportunités qui le font déjà. */
  useEffect(() => {
    setFilters((f) => ({ ...f, clientId: clientId || null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  /** Partage de lien de vue (CR du 11/09/2026) : filtres + bascule d'entité/affichage toujours reflétés dans l'URL. */
  useEffect(() => {
    const params = filtersToSearchParams(filters);
    if (entityView === "companies") params.set("view", "companies");
    else if (displayMode === "kanban") params.set("view", "kanban");
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, entityView, displayMode]);

  useEffect(() => {
    if (!activeSegment || activeSegment.rules) {
      setSegmentMemberIdSet(null);
      return;
    }
    listContactMemberIds(activeSegment.id).then((ids) => setSegmentMemberIdSet(new Set(ids)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSegment?.id, activeSegment?.rules]);

  useEffect(() => {
    if (!clientId) {
      setCustomFieldValuesById({});
      setActivityFlagsById({});
      return;
    }
    listValuesByEntityForClient(supabase, "contact", clientId)
      .then(setCustomFieldValuesById)
      .catch(() => setCustomFieldValuesById({}));
    listActivityFlagsByContactForClient(supabase, clientId)
      .then(setActivityFlagsById)
      .catch(() => setActivityFlagsById({}));
  }, [clientId]);

  function openCreateViewDialog() {
    setRenamingViewId(null);
    setNewViewName("");
    setSaveViewOpen(true);
  }

  function openRenameViewDialog(id: string, currentName: string) {
    setRenamingViewId(id);
    setNewViewName(currentName);
    setSaveViewOpen(true);
  }

  function handleSubmitViewDialog() {
    if (!newViewName.trim()) return;
    if (renamingViewId) {
      const next = renameSavedView(savedViews, renamingViewId, newViewName);
      setSavedViews(next);
      saveSavedViews(localStorage, SAVED_VIEWS_STORAGE_KEY, next);
      toast(`Vue renommée "${newViewName.trim()}".`, "success");
    } else {
      const view = createSavedView(crypto.randomUUID(), newViewName, filters, new Date().toISOString());
      const next = [...savedViews, view];
      setSavedViews(next);
      saveSavedViews(localStorage, SAVED_VIEWS_STORAGE_KEY, next);
      toast(`Vue "${view.name}" enregistrée.`, "success");
    }
    setSaveViewOpen(false);
    setRenamingViewId(null);
    setNewViewName("");
  }

  function handleDeleteView(id: string) {
    const next = removeSavedView(savedViews, id);
    setSavedViews(next);
    saveSavedViews(localStorage, SAVED_VIEWS_STORAGE_KEY, next);
  }

  function handleDuplicateView(id: string) {
    const next = duplicateSavedView(savedViews, id, crypto.randomUUID(), new Date().toISOString());
    setSavedViews(next);
    saveSavedViews(localStorage, SAVED_VIEWS_STORAGE_KEY, next);
    toast("Vue dupliquée.", "success");
  }

  async function handleCopyViewLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Lien de la vue copié.", "success");
    } catch {
      toast("Impossible de copier le lien.", "destructive");
    }
  }

  function persistColumnPrefs(order: string[], visibility: VisibilityState) {
    const hidden = Object.entries(visibility)
      .filter(([, visible]) => visible === false)
      .map(([id]) => id);
    saveColumnPreferences(localStorage, { order, hidden });
  }

  const filtered = useMemo(() => {
    let rows = filterProspects(prospects, filters);
    if (activeSegment) {
      if (activeSegment.rules) {
        rows = rows.filter(
          (p) =>
            p.contact_id &&
            matchesRuleGroups(
              { ...p.contacts, ...customFieldValuesById[p.contact_id], ...activityFlagsById[p.contact_id] } as unknown as Record<string, unknown>,
              activeSegment.rules!,
            ),
        );
      } else if (segmentMemberIdSet) {
        rows = rows.filter((p) => p.contact_id && segmentMemberIdSet.has(p.contact_id));
      }
    }
    return rows;
  }, [prospects, filters, activeSegment, segmentMemberIdSet, customFieldValuesById, activityFlagsById]);

  /** Dérivé (pas un state séparé) : l'onglet actif reflète toujours exactement les filtres courants. */
  const activeViewId = useMemo(() => {
    const match = savedViews.find((v) => JSON.stringify(v.filters) === JSON.stringify(filters));
    return match?.id ?? null;
  }, [savedViews, filters]);
  const activeSavedView = savedViews.find((v) => v.id === activeViewId) ?? null;
  const nafOptions = useMemo(() => extractDistinctNafLabels(prospects), [prospects]);
  const clientOptions = useMemo(() => extractDistinctClients(prospects), [prospects]);

  const byClientForCount = useMemo(() => (clientId ? prospects.filter((p) => p.client_id === clientId) : prospects), [prospects, clientId]);
  const companiesForCount = useMemo(() => (clientId ? companies.filter((c) => c.client_id === clientId) : companies), [companies, clientId]);

  const chipCounts = useMemo(
    () => ({
      emailVerified: byClientForCount.filter((p) => isEmailVerified({ email_confidence: p.contacts?.email_confidence ?? null })).length,
      hasPhone: byClientForCount.filter((p) => hasPhone({ phone: p.contacts?.phone ?? null })).length,
      freshUnder7d: byClientForCount.filter((p) => isFreshUnderDays(7, p.contacts?.updated_at ?? null)).length,
    }),
    [byClientForCount],
  );

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
        ),
      }),
      columnHelper.accessor((row) => `${row.contacts?.first_name ?? ""} ${row.contacts?.last_name ?? ""}`, {
        id: "contact",
        header: "Contact",
        cell: ({ row }) => (
          <Link
            to={`/prospects/${row.original.id}`}
            state={openProspectLinkState(location)}
            className="flex flex-col"
          >
            <span className="font-medium text-foreground hover:underline">{row.getValue<string>("contact").trim() || "—"}</span>
            <span className="text-xs text-muted-foreground">{row.original.contacts?.job_title ?? "—"}</span>
          </Link>
        ),
      }),
      columnHelper.accessor((row) => row.companies?.name ?? "", {
        id: "company",
        header: "Société",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-foreground">{row.original.companies?.name ?? "—"}</span>
            <span className="text-xs text-muted-foreground">{row.original.companies?.naf_label ?? "—"}</span>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.contacts?.email ?? "", {
        id: "coordinates",
        header: "Coordonnées",
        cell: ({ row }) => (
          <div className="flex flex-col text-xs">
            <span>{masked ? MASKED_VALUE : (row.original.contacts?.email ?? "—")}</span>
            <span className="text-muted-foreground">{masked ? MASKED_VALUE : (row.original.contacts?.phone ?? "—")}</span>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.contacts?.data_source ?? "", {
        id: "source",
        header: "Source",
        cell: ({ getValue }) => {
          const value = getValue();
          return value ? (DATA_SOURCE_LABELS[value] ?? value) : "—";
        },
      }),
      columnHelper.accessor((row) => computeContactCompleteness(row.contacts ?? { job_title: null, email: null, linkedin_url: null }), {
        id: "confidence",
        header: "Confiance",
        cell: ({ getValue }) => <CompletenessBar percent={getValue()} />,
      }),
      columnHelper.accessor((row) => row.contacts?.updated_at ?? "", {
        id: "freshness",
        header: "Fraîcheur",
        cell: ({ row }) => formatFreshnessDays(row.original.contacts?.updated_at ?? null),
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Statut",
        cell: ({ row }) => <Badge variant={getStatusColor(row.original.status)}>{getStatusLabel(row.original.status)}</Badge>,
      }),
      columnHelper.accessor((row) => row.companies?.ai_score ?? -1, {
        id: "score",
        header: "Score IA",
        cell: ({ row }) => (
          <Badge variant={getScoreColor(row.original.companies?.ai_score ?? null)}>
            {formatScore(row.original.companies?.ai_score ?? null)}
          </Badge>
        ),
      }),
      columnHelper.accessor((row) => row.dmh_clients?.name ?? "", {
        id: "client",
        header: "Client DMH",
        cell: ({ getValue }) => getValue() || "—",
      }),
      columnHelper.accessor((row) => row.last_activity_at ?? "", {
        id: "lastActivity",
        header: "Dernière activité",
        cell: ({ row }) => {
          const stagnant = isStagnant(row.original.last_activity_at);
          return (
            <span
              className={cn(
                "flex items-center gap-1",
                stagnant && "font-medium text-yellow-700 dark:text-yellow-400",
              )}
            >
              {stagnant && <TriangleAlert className="h-3.5 w-3.5" strokeWidth={1.5} />}
              {formatRelativeTime(row.original.last_activity_at)}
            </span>
          );
        },
      }),
    ],
    [location, masked],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, rowSelection, columnVisibility, columnOrder: ["select", ...columnOrder] },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row.id,
    enableMultiSort: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const contactIdByProspectId = useMemo(() => new Map(prospects.map((p) => [p.id, p.contact_id])), [prospects]);

  async function handleBulkStatus(status: ProspectStatus) {
    const previousEntries = prospects
      .filter((p) => selectedIds.includes(p.id))
      .map((p) => ({ id: p.id, status: p.status }));

    const result = await bulkUpdateStatus(selectedIds, status);
    if (result.ok) {
      toast(`Statut mis à jour pour ${selectedIds.length} prospect(s).`, "success", {
        label: "Annuler",
        onClick: async () => {
          await restoreStatuses(previousEntries);
          toast("Changement de statut annulé.", "default");
        },
      });
      setRowSelection({});
    } else {
      toast(`Échec : ${result.error}`, "destructive");
    }
  }

  async function handleBulkAssign(staffId: string | null) {
    const previousEntries = prospects
      .filter((p) => selectedIds.includes(p.id))
      .map((p) => ({ id: p.id, assignedTo: p.assigned_to }));

    const result = await bulkUpdateAssignment(selectedIds, staffId);
    if (result.ok) {
      toast(`Assignation mise à jour pour ${selectedIds.length} prospect(s).`, "success", {
        label: "Annuler",
        onClick: async () => {
          await restoreAssignments(previousEntries);
          toast("Assignation annulée.", "default");
        },
      });
      setRowSelection({});
    } else {
      toast(`Échec : ${result.error}`, "destructive");
    }
  }

  async function handleBulkAddToSegment(listId: string) {
    const contactIds = selectedIds.map((id) => contactIdByProspectId.get(id)).filter((id): id is string => Boolean(id));
    if (contactIds.length === 0) return;
    await addContactsToList(listId, contactIds);
    toast(`${contactIds.length} contact(s) ajouté(s) à la liste.`, "success");
    setRowSelection({});
  }

  async function handleKanbanDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const prospectId = String(active.id);
    const targetStatus = over.id as ProspectStatus;
    const current = prospects.find((p) => p.id === prospectId);
    if (!current || current.status === targetStatus) return;

    const result = await bulkUpdateStatus([prospectId], targetStatus);
    if (!result.ok) toast(`Échec du changement de statut : ${result.error}`, "destructive");
  }

  function handleExport() {
    const rowsToExport = selectedIds.length > 0 ? filtered.filter((p) => selectedIds.includes(p.id)) : filtered;
    const csv = toCsv(rowsToExport, [
      { header: "Contact", value: (p) => `${p.contacts?.first_name ?? ""} ${p.contacts?.last_name ?? ""}`.trim() },
      { header: "Entreprise", value: (p) => p.companies?.name ?? "" },
      { header: "Email", value: (p) => (masked ? MASKED_VALUE : (p.contacts?.email ?? "")) },
      { header: "Téléphone", value: (p) => (masked ? MASKED_VALUE : (p.contacts?.phone ?? "")) },
      { header: "Client DMH", value: (p) => p.dmh_clients?.name ?? "" },
      { header: "Secteur", value: (p) => p.companies?.naf_label ?? "" },
      { header: "Statut", value: (p) => getStatusLabel(p.status) },
    ]);
    downloadCsv(csv, `contacts-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  async function handleCreateSegment(e: FormEvent) {
    e.preventDefault();
    if (!newSegmentName.trim() || !clientId) return;
    const rules =
      newSegmentMode === "dynamic"
        ? newSegmentGroups
            .map((g) => ({
              conditions: g.conditions
                .filter((c) => c.field.trim())
                .map((c) => ({ field: c.field, operator: c.operator, value: c.operator === "is_set" || c.operator === "is_not_set" ? true : c.value })),
            }))
            .filter((g) => g.conditions.length > 0)
        : undefined;
    await createContactList({ clientId, name: newSegmentName.trim(), rules, createdBy: null });
    toast(`Segment "${newSegmentName.trim()}" créé.`, "success");
    setNewSegmentName("");
    setNewSegmentMode("static");
    setNewSegmentGroups(EMPTY_GROUPS);
    setNewSegmentOpen(false);
  }

  const viewMenuActions = [
    { label: "Modifier les colonnes", onClick: () => setColumnsDialogOpen(true) },
    { label: "Partager le lien de la vue", onClick: handleCopyViewLink },
    ...(activeSavedView
      ? [
          { label: "Dupliquer la vue", onClick: () => handleDuplicateView(activeSavedView.id) },
          { label: "Renommer la vue", onClick: () => openRenameViewDialog(activeSavedView.id, activeSavedView.name) },
          { label: "Supprimer la vue", onClick: () => handleDeleteView(activeSavedView.id), danger: true },
        ]
      : []),
  ];

  return (
    <div className="space-y-3 p-6">
      <PageHeader
        kicker="Prospection · pipeline d'enrichissement"
        title="Prospects"
        actions={
          entityView === "contacts" ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                Importer
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAddContactOpen(true)}>
                + Contact
              </Button>
            </>
          ) : null
        }
      />

      <div className="flex items-center gap-3 border-b border-border pb-3">
        <div className="flex rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => setEntityView("contacts")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${entityView === "contacts" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
          >
            Contacts <span className="ml-1 text-xs opacity-70">{byClientForCount.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setEntityView("companies")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${entityView === "companies" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
          >
            Entreprises <span className="ml-1 text-xs opacity-70">{companiesForCount.length}</span>
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          Les entreprises regroupent leurs contacts ; l'enrichissement légal s'applique au niveau entreprise, l'enrichissement de coordonnées au niveau contact.
        </span>
      </div>

      {entityView === "companies" && <EntreprisesPanel clientId={clientId} />}

      {entityView === "contacts" && (
        <>
          <SavedViewTabs
            tabs={[
              { id: "__all__", label: "Tous les contacts", count: filterProspects(byClientForCount, EMPTY_PROSPECT_FILTERS).length },
              ...savedViews.map((v) => ({ id: v.id, label: v.name })),
            ]}
            activeId={activeViewId ?? "__all__"}
            onSelect={(id) => {
              if (id === "__all__") {
                setFilters(EMPTY_PROSPECT_FILTERS);
                return;
              }
              const target = savedViews.find((v) => v.id === id);
              if (target) setFilters(target.filters);
            }}
            onCreate={openCreateViewDialog}
            menuActions={viewMenuActions}
            extra={
              <>
                <button
                  type="button"
                  title="Synchroniser"
                  aria-label="Synchroniser"
                  onClick={() => reload()}
                  className="rounded px-1.5 py-0.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  ↻
                </button>
                <div className="flex rounded-md border border-border p-0.5">
                  <button
                    type="button"
                    onClick={() => setDisplayMode("list")}
                    className={`rounded px-2 py-1 text-xs font-medium ${displayMode === "list" ? "bg-secondary" : "text-muted-foreground"}`}
                  >
                    Liste
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayMode("kanban")}
                    className={`rounded px-2 py-1 text-xs font-medium ${displayMode === "kanban" ? "bg-secondary" : "text-muted-foreground"}`}
                  >
                    Kanban
                  </button>
                </div>
              </>
            }
          />

          <Dialog open={saveViewOpen} onOpenChange={setSaveViewOpen}>
            <DialogHeader>
              <DialogTitle>{renamingViewId ? "Renommer la vue" : "Enregistrer la vue actuelle"}</DialogTitle>
            </DialogHeader>
            <DialogContent>
              <input
                autoFocus
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="Nom de la vue…"
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </DialogContent>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveViewOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmitViewDialog} disabled={!newViewName.trim()}>
                {renamingViewId ? "Renommer" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </Dialog>

          <Dialog open={columnsDialogOpen} onOpenChange={setColumnsDialogOpen}>
            <DialogHeader>
              <DialogTitle>Modifier les colonnes</DialogTitle>
            </DialogHeader>
            <DialogContent className="space-y-1">
              {columnOrder.map((id, index) => (
                <div key={id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={columnVisibility[id] !== false}
                    onChange={(e) => {
                      const next = { ...columnVisibility, [id]: e.target.checked };
                      setColumnVisibility(next);
                      persistColumnPrefs(columnOrder, next);
                    }}
                  />
                  <span className="flex-1 text-foreground">{COLUMN_LABELS[id]}</span>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => {
                      const next = moveColumn(columnOrder, id, -1);
                      setColumnOrder(next);
                      persistColumnPrefs(next, columnVisibility);
                    }}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === columnOrder.length - 1}
                    onClick={() => {
                      const next = moveColumn(columnOrder, id, 1);
                      setColumnOrder(next);
                      persistColumnPrefs(next, columnVisibility);
                    }}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              ))}
            </DialogContent>
            <DialogFooter>
              <Button onClick={() => setColumnsDialogOpen(false)}>Fermer</Button>
            </DialogFooter>
          </Dialog>

          <QuickFilterChips
            chips={[
              { key: "emailVerified", label: "Email vérifié", count: chipCounts.emailVerified, active: filters.emailVerified },
              { key: "hasPhone", label: "Téléphone direct", count: chipCounts.hasPhone, active: filters.hasPhone },
              { key: "freshUnder7d", label: "Fraîcheur < 7j", count: chipCounts.freshUnder7d, active: filters.freshUnder7d },
            ]}
            onToggle={(key) => setFilters((f) => ({ ...f, [key]: !f[key as keyof ProspectFilters] }))}
            showAdvanced={showAdvanced}
            onToggleAdvanced={() => setShowAdvanced((v) => !v)}
            hasActiveFilters={JSON.stringify(filters) !== JSON.stringify({ ...EMPTY_PROSPECT_FILTERS, clientId: filters.clientId })}
            onReset={() => setFilters({ ...EMPTY_PROSPECT_FILTERS, clientId: filters.clientId })}
          >
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Recherche</label>
              <input
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Entreprise, contact, email…"
                className="rounded-md border border-border px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Statuts</label>
              <DropdownMenu
                trigger={
                  <Button variant="outline" size="sm" className="h-8">
                    {filters.statuses.length === 0
                      ? "Tous les statuts"
                      : `${filters.statuses.length} statut${filters.statuses.length > 1 ? "s" : ""}`}
                  </Button>
                }
              >
                {ALL_PROSPECT_STATUSES.map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm text-foreground hover:bg-secondary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={filters.statuses.includes(status)}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          statuses: e.target.checked
                            ? [...f.statuses, status]
                            : f.statuses.filter((s) => s !== status),
                        }))
                      }
                    />
                    {getStatusLabel(status)}
                  </label>
                ))}
              </DropdownMenu>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Score min</label>
              <input
                type="number"
                min={1}
                max={10}
                value={filters.scoreMin ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, scoreMin: e.target.value ? Number(e.target.value) : null }))}
                className="w-16 rounded-md border border-border px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Score max</label>
              <input
                type="number"
                min={1}
                max={10}
                value={filters.scoreMax ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, scoreMax: e.target.value ? Number(e.target.value) : null }))}
                className="w-16 rounded-md border border-border px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Secteur</label>
              <select
                value={filters.nafLabel ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, nafLabel: e.target.value || null }))}
                className="rounded-md border border-border px-2 py-1 text-sm"
              >
                <option value="">Tous</option>
                {nafOptions.map((naf) => (
                  <option key={naf} value={naf}>
                    {naf}
                  </option>
                ))}
              </select>
            </div>
            {!clientId && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Client DMH</label>
                <select
                  value={filters.clientId ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, clientId: e.target.value || null }))}
                  className="rounded-md border border-border px-2 py-1 text-sm"
                >
                  <option value="">Tous</option>
                  {clientOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {clientId ? (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Segment</label>
                <div className="flex gap-2">
                  <select
                    value={segmentId}
                    onChange={(e) => setSegmentId(e.target.value)}
                    className="rounded-md border border-border px-2 py-1 text-sm"
                  >
                    <option value="">Tous les contacts</option>
                    {contactLists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.rules ? "(dynamique)" : ""}
                      </option>
                    ))}
                  </select>
                  <Button variant="outline" size="sm" onClick={() => setNewSegmentOpen((v) => !v)}>
                    + Nouveau segment
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Choisis un client DMH (en haut) pour filtrer par segment.</p>
            )}
          </QuickFilterChips>

          {newSegmentOpen && clientId && (
            <form onSubmit={handleCreateSegment} className="space-y-3 rounded-md border border-border p-3">
              <input
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
                placeholder="Nom du segment"
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
              <div className="flex gap-1 rounded-md border border-border p-0.5 w-fit">
                <button
                  type="button"
                  onClick={() => setNewSegmentMode("static")}
                  className={`rounded px-2 py-1 text-xs font-medium ${newSegmentMode === "static" ? "bg-secondary" : "text-muted-foreground"}`}
                >
                  Statique
                </button>
                <button
                  type="button"
                  onClick={() => setNewSegmentMode("dynamic")}
                  className={`rounded px-2 py-1 text-xs font-medium ${newSegmentMode === "dynamic" ? "bg-secondary" : "text-muted-foreground"}`}
                >
                  Dynamique (critères)
                </button>
              </div>
              {newSegmentMode === "dynamic" && (
                <RuleGroupsEditor entityType="contact" clientId={clientId} groups={newSegmentGroups} onChange={setNewSegmentGroups} />
              )}
              <Button type="submit" size="sm" disabled={!newSegmentName.trim()}>
                Créer le segment
              </Button>
            </form>
          )}

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-accent bg-accent/10 p-2 text-sm">
              <span className="font-medium text-foreground">{selectedIds.length} sélectionné(s)</span>
              <DropdownMenu trigger={<Button size="sm" variant="outline">Changer le statut</Button>}>
                {ALL_PROSPECT_STATUSES.map((status) => (
                  <DropdownMenuItem key={status} onClick={() => handleBulkStatus(status)}>
                    {getStatusLabel(status)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenu>
              <DropdownMenu trigger={<Button size="sm" variant="outline">Assigner</Button>}>
                <DropdownMenuItem onClick={() => handleBulkAssign(null)}>Non assigné</DropdownMenuItem>
                {staff.map((s) => (
                  <DropdownMenuItem key={s.id} onClick={() => handleBulkAssign(s.id)}>
                    {s.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenu>
              {clientId && contactLists.filter((l) => !l.rules).length > 0 && (
                <DropdownMenu trigger={<Button size="sm" variant="outline">Ajouter à un segment</Button>}>
                  {contactLists.filter((l) => !l.rules).map((l) => (
                    <DropdownMenuItem key={l.id} onClick={() => handleBulkAddToSegment(l.id)}>
                      {l.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenu>
              )}
              <Button size="sm" variant="outline" onClick={handleExport}>
                Exporter la sélection
              </Button>
            </div>
          )}

          {selectedIds.length === 0 && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={handleExport}>
                Exporter en CSV
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

          {!loading && !error && displayMode === "list" && (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        className={header.column.getCanSort() ? "cursor-pointer select-none" : undefined}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))}
                {table.getRowModel().rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                      Aucun contact.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {displayMode === "kanban" && !loading && !error && (
            <div className="flex h-[calc(100vh-14rem)] flex-col gap-3">
              <DndContext sensors={kanbanSensors} onDragEnd={handleKanbanDragEnd}>
                <KanbanBoardShell>
                  {groupProspectsByStatus(filtered).map((group) => (
                    <KanbanColumn key={group.column.status} column={group.column} prospects={group.prospects} />
                  ))}
                </KanbanBoardShell>
              </DndContext>
            </div>
          )}

          {displayMode === "kanban" && loading && (
            <div className="grid h-[calc(100vh-14rem)] grid-flow-col auto-cols-fr gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-full" />
              ))}
            </div>
          )}

          <AddContactDialog open={addContactOpen} onOpenChange={setAddContactOpen} onCreated={() => reload()} />
          <ImportEntitiesDialog open={importOpen} onOpenChange={setImportOpen} entityType="contact" onImported={() => reload()} />
        </>
      )}
    </div>
  );
}
