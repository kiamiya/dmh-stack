import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { SortingState, VisibilityState } from "@tanstack/react-table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "../components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { ALL_PROSPECT_STATUSES, getStatusColor, getStatusLabel } from "../lib/status";
import { formatScore, getScoreColor } from "../lib/score";
import { formatRelativeTime } from "../lib/relativeTime";
import { EMPTY_PROSPECT_FILTERS, extractDistinctClients, extractDistinctNafLabels, filterProspects } from "../lib/prospectFilters";
import type { ProspectFilters } from "../lib/prospectFilters";
import { toCsv } from "../lib/csv";
import { applyColumnOrder, loadColumnPreferences, moveColumn, saveColumnPreferences } from "../lib/columnPreferences";
import { useProspects } from "../hooks/useProspects";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { useToast } from "../components/ui/toast";
import type { ProspectListRow } from "../services/prospects";
import type { ProspectStatus } from "@dmh/types";

const columnHelper = createColumnHelper<ProspectListRow>();

const CONFIGURABLE_COLUMN_IDS = ["company", "contact", "client", "naf", "score", "status", "lastActivity"];
const COLUMN_LABELS: Record<string, string> = {
  company: "Entreprise",
  contact: "Contact",
  client: "Client DMH",
  naf: "Secteur",
  score: "Score IA",
  status: "Statut",
  lastActivity: "Dernière activité",
};

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProspectsListPage() {
  const { prospects, loading, error, bulkUpdateStatus, bulkUpdateAssignment } = useProspects();
  const staff = useStaffMembers();
  const { toast } = useToast();

  const [filters, setFilters] = useState<ProspectFilters>(EMPTY_PROSPECT_FILTERS);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<string[]>(CONFIGURABLE_COLUMN_IDS);

  useEffect(() => {
    const saved = loadColumnPreferences(localStorage);
    if (saved) {
      setColumnOrder(applyColumnOrder(CONFIGURABLE_COLUMN_IDS, saved.order));
      setColumnVisibility(Object.fromEntries(saved.hidden.map((id) => [id, false])));
    }
  }, []);

  function persistColumnPrefs(order: string[], visibility: VisibilityState) {
    const hidden = Object.entries(visibility)
      .filter(([, visible]) => visible === false)
      .map(([id]) => id);
    saveColumnPreferences(localStorage, { order, hidden });
  }

  const filtered = useMemo(() => filterProspects(prospects, filters), [prospects, filters]);
  const nafOptions = useMemo(() => extractDistinctNafLabels(prospects), [prospects]);
  const clientOptions = useMemo(() => extractDistinctClients(prospects), [prospects]);

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
      columnHelper.accessor((row) => row.companies?.name ?? "", {
        id: "company",
        header: "Entreprise",
        cell: ({ row }) => (
          <Link to={`/prospects/${row.original.id}`} className="font-medium text-foreground hover:underline">
            {row.original.companies?.name ?? "—"}
          </Link>
        ),
      }),
      columnHelper.accessor((row) => `${row.contacts?.first_name ?? ""} ${row.contacts?.last_name ?? ""}`, {
        id: "contact",
        header: "Contact",
        cell: ({ getValue }) => getValue().trim() || "—",
      }),
      columnHelper.accessor((row) => row.dmh_clients?.name ?? "", {
        id: "client",
        header: "Client DMH",
        cell: ({ getValue }) => getValue() || "—",
      }),
      columnHelper.accessor((row) => row.companies?.naf_label ?? "", {
        id: "naf",
        header: "Secteur",
        cell: ({ getValue }) => getValue() || "—",
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
      columnHelper.accessor("status", {
        id: "status",
        header: "Statut",
        cell: ({ row }) => <Badge variant={getStatusColor(row.original.status)}>{getStatusLabel(row.original.status)}</Badge>,
      }),
      columnHelper.accessor((row) => row.last_activity_at ?? "", {
        id: "lastActivity",
        header: "Dernière activité",
        cell: ({ row }) => formatRelativeTime(row.original.last_activity_at),
      }),
    ],
    [],
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

  async function handleBulkStatus(status: ProspectStatus) {
    const result = await bulkUpdateStatus(selectedIds, status);
    if (result.ok) {
      toast(`Statut mis à jour pour ${selectedIds.length} prospect(s).`, "success");
      setRowSelection({});
    } else {
      toast(`Échec : ${result.error}`, "destructive");
    }
  }

  async function handleBulkAssign(staffId: string | null) {
    const result = await bulkUpdateAssignment(selectedIds, staffId);
    if (result.ok) {
      toast(`Assignation mise à jour pour ${selectedIds.length} prospect(s).`, "success");
      setRowSelection({});
    } else {
      toast(`Échec : ${result.error}`, "destructive");
    }
  }

  function handleExport() {
    const rowsToExport = selectedIds.length > 0 ? filtered.filter((p) => selectedIds.includes(p.id)) : filtered;
    const csv = toCsv(rowsToExport, [
      { header: "Entreprise", value: (p) => p.companies?.name ?? "" },
      { header: "Contact", value: (p) => `${p.contacts?.first_name ?? ""} ${p.contacts?.last_name ?? ""}`.trim() },
      { header: "Email", value: (p) => p.contacts?.email ?? "" },
      { header: "Client DMH", value: (p) => p.dmh_clients?.name ?? "" },
      { header: "Secteur", value: (p) => p.companies?.naf_label ?? "" },
      { header: "Score IA", value: (p) => (p.companies?.ai_score != null ? String(p.companies.ai_score) : "") },
      { header: "Statut", value: (p) => getStatusLabel(p.status) },
    ]);
    downloadCsv(csv, `prospects-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">Prospects</h1>
        <DropdownMenu
          align="end"
          trigger={
            <Button variant="outline" size="sm">
              Colonnes
            </Button>
          }
        >
          {columnOrder.map((id, index) => (
            <div key={id} className="flex items-center gap-2 px-2 py-1.5 text-sm" onClick={(e) => e.stopPropagation()}>
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
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-secondary/40 p-3">
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
          <select
            multiple
            value={filters.statuses}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                statuses: Array.from(e.target.selectedOptions).map((o) => o.value as ProspectStatus),
              }))
            }
            className="h-8 rounded-md border border-border px-2 py-1 text-sm"
          >
            {ALL_PROSPECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
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
        <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_PROSPECT_FILTERS)}>
          Réinitialiser
        </Button>
      </div>

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

      {!loading && !error && (
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
                  Aucun prospect.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
