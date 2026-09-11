import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useCompanies } from "../../hooks/useCompanies";
import { useContacts } from "../../hooks/useContacts";
import { useCompanyLists } from "../../hooks/useCompanyLists";
import { useProspects } from "../../hooks/useProspects";
import { matchesRuleGroups } from "../../lib/segmentEvaluator";
import { listValuesByEntityForClient } from "../../services/customFields";
import { supabase } from "../../lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { RuleGroupsEditor } from "../RuleGroupsEditor";
import type { RuleGroupDraft } from "../RuleGroupsEditor";
import { getStatusColor, getStatusLabel } from "../../lib/status";
import { formatCurrency } from "../../lib/deals";
import { computeCompanyCompleteness } from "../../lib/companyCompleteness";
import { hasSiren, isCompleteAbove, isFreshUnderDays } from "../../lib/quickFilters";
import { toCsv } from "../../lib/csv";
import {
  createSavedView,
  duplicateSavedView,
  loadSavedViews,
  removeSavedView,
  renameSavedView,
  saveSavedViews,
} from "../../lib/savedViews";
import type { SavedView } from "../../lib/savedViews";
import { SavedViewTabs } from "../SavedViewTabs";
import { QuickFilterChips } from "../QuickFilterChips";
import { CompletenessBar } from "../CompletenessBar";
import { AddCompanyDialog } from "../AddCompanyDialog";
import { ImportEntitiesDialog } from "../ImportEntitiesDialog";
import { useToast } from "../ui/toast";
import { useStaffMembers } from "../../hooks/useStaffMembers";
import { useSession } from "../../lib/useSession";
import type { ProspectStatus } from "@dmh/types";

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const EMPTY_GROUPS: RuleGroupDraft[] = [{ conditions: [{ field: "name", operator: "contains", value: "" }] }];

interface CompanyFilters {
  sirenKnown: boolean;
  completeAbove80: boolean;
  freshUnder7d: boolean;
  listId: string;
}

const EMPTY_COMPANY_FILTERS: CompanyFilters = { sirenKnown: false, completeAbove80: false, freshUnder7d: false, listId: "" };
const SAVED_VIEWS_STORAGE_KEY = "dmh-crm-saved-views-companies";

export interface EntreprisesPanelProps {
  clientId: string;
}

/**
 * Table "Entreprises" (correction Claude Design, S34) — porte le contenu
 * de l'ancienne page `Companies.tsx` (segments réels via
 * `useCompanyLists`, import/export, bulk-ajout à une liste), désormais un
 * onglet de l'écran Prospects unifié plutôt qu'une page séparée. Le
 * client DMH n'est plus choisi localement : il vient du sélecteur global
 * du Header (`useSelectedClient`, déjà utilisé partout ailleurs).
 *
 * Bandeau de vues + menu "..." identique à l'onglet Contacts (le mockup
 * partage exactement le même bandeau entre les deux onglets, seule la
 * donnée change) — vues sauvegardées propres aux entreprises (clé
 * localStorage distincte de celle des Contacts).
 */
export function EntreprisesPanel({ clientId }: EntreprisesPanelProps) {
  const { companies, loading, error, reload } = useCompanies();
  const { contacts } = useContacts();
  const { prospects } = useProspects();
  const { toast } = useToast();
  const staff = useStaffMembers();
  const { session } = useSession();
  const createdBy = session?.user.id && staff.some((s) => s.id === session.user.id) ? session.user.id : null;
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { lists, create: createList, remove: removeList, addCompanies: addCompaniesToList, listMemberIds } = useCompanyLists(clientId);
  const [listMemberIdSet, setListMemberIdSet] = useState<Set<string> | null>(null);
  const [customFieldValuesById, setCustomFieldValuesById] = useState<Record<string, Record<string, unknown>>>({});
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListMode, setNewListMode] = useState<"static" | "dynamic">("static");
  const [newListGroups, setNewListGroups] = useState<RuleGroupDraft[]>(EMPTY_GROUPS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkListId, setBulkListId] = useState("");
  const [filters, setFilters] = useState<CompanyFilters>(EMPTY_COMPANY_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [savedViews, setSavedViews] = useState<SavedView<CompanyFilters>[]>([]);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null);
  const [newViewName, setNewViewName] = useState("");

  useEffect(() => {
    setSavedViews(loadSavedViews(localStorage, SAVED_VIEWS_STORAGE_KEY));
  }, []);

  const activeList = lists.find((l) => l.id === filters.listId) ?? null;

  useEffect(() => {
    if (!activeList || activeList.rules) {
      setListMemberIdSet(null);
      return;
    }
    listMemberIds(activeList.id).then((ids) => setListMemberIdSet(new Set(ids)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeList?.id, activeList?.rules]);

  useEffect(() => {
    if (!clientId) {
      setCustomFieldValuesById({});
      return;
    }
    listValuesByEntityForClient(supabase, "company", clientId)
      .then(setCustomFieldValuesById)
      .catch(() => setCustomFieldValuesById({}));
  }, [clientId]);

  const activeViewId = useMemo(() => {
    const match = savedViews.find((v) => JSON.stringify(v.filters) === JSON.stringify(filters));
    return match?.id ?? null;
  }, [savedViews, filters]);
  const activeSavedView = savedViews.find((v) => v.id === activeViewId) ?? null;

  function openCreateViewDialog() {
    setRenamingViewId(null);
    setNewViewName("");
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

  async function handleCopyViewLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Lien de la vue copié.", "success");
    } catch {
      toast("Impossible de copier le lien.", "destructive");
    }
  }

  const byClient = useMemo(() => (clientId ? companies.filter((c) => c.client_id === clientId) : companies), [companies, clientId]);

  const chipCounts = useMemo(
    () => ({
      sirenKnown: byClient.filter(hasSiren).length,
      completeAbove80: byClient.filter((c) => isCompleteAbove(80, computeCompanyCompleteness(c))).length,
      freshUnder7d: byClient.filter((c) => isFreshUnderDays(7, c.updated_at)).length,
    }),
    [byClient],
  );

  const filtered = useMemo(() => {
    let rows = byClient;
    if (activeList) {
      if (activeList.rules) {
        rows = rows.filter((c) =>
          matchesRuleGroups({ ...c, ...customFieldValuesById[c.id] } as unknown as Record<string, unknown>, activeList.rules!),
        );
      } else if (listMemberIdSet) {
        rows = rows.filter((c) => listMemberIdSet.has(c.id));
      }
    }
    if (filters.sirenKnown) rows = rows.filter(hasSiren);
    if (filters.completeAbove80) rows = rows.filter((c) => isCompleteAbove(80, computeCompanyCompleteness(c)));
    if (filters.freshUnder7d) rows = rows.filter((c) => isFreshUnderDays(7, c.updated_at));
    return rows;
  }, [byClient, activeList, listMemberIdSet, customFieldValuesById, filters]);

  const contactCountByCompanyId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of contacts) counts.set(c.company_id, (counts.get(c.company_id) ?? 0) + 1);
    return counts;
  }, [contacts]);

  /** Statut = celui du prospect lié à cette entreprise, quand il existe (une entreprise n'a pas de statut pipeline propre). */
  const statusByCompanyId = useMemo(() => {
    const map = new Map<string, ProspectStatus>();
    for (const p of prospects) {
      if (p.company_id) map.set(p.company_id, p.status);
    }
    return map;
  }, [prospects]);

  function handleExport() {
    const rowsToExport = selectedIds.size > 0 ? filtered.filter((c) => selectedIds.has(c.id)) : filtered;
    const csv = toCsv(rowsToExport, [
      { header: "Nom", value: (c) => c.name },
      { header: "SIREN", value: (c) => c.siren ?? "" },
      { header: "Secteur", value: (c) => c.naf_label ?? "" },
      { header: "Ville", value: (c) => c.city ?? "" },
      { header: "Effectif", value: (c) => c.employee_range ?? "" },
      { header: "CA", value: (c) => (c.revenue != null ? String(c.revenue) : "") },
      { header: "Contacts", value: (c) => String(contactCountByCompanyId.get(c.id) ?? 0) },
      { header: "Complétude", value: (c) => `${computeCompanyCompleteness(c)}%` },
      { header: "Score IA", value: (c) => (c.ai_score != null ? String(c.ai_score) : "") },
      { header: "Statut", value: (c) => {
          const status = statusByCompanyId.get(c.id);
          return status ? getStatusLabel(status) : "";
        } },
    ]);
    downloadCsv(csv, `entreprises-${new Date().toISOString().slice(0, 10)}.csv`);
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
    setSelectedIds((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id))));
  }

  function resetNewListForm() {
    setNewListName("");
    setNewListMode("static");
    setNewListGroups(EMPTY_GROUPS);
    setNewListOpen(false);
  }

  async function handleCreateList(e: FormEvent) {
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
    await createList({ clientId, name: newListName.trim(), rules, createdBy });
    toast(`Liste "${newListName.trim()}" créée.`, "success");
    resetNewListForm();
  }

  async function handleAddSelectedToList() {
    if (!bulkListId || selectedIds.size === 0) return;
    await addCompaniesToList(bulkListId, Array.from(selectedIds));
    toast(`${selectedIds.size} entreprise(s) ajoutée(s) à la liste.`, "success");
    setSelectedIds(new Set());
    setBulkListId("");
    if (bulkListId === filters.listId) {
      listMemberIds(filters.listId).then((ids) => setListMemberIdSet(new Set(ids)));
    }
  }

  const viewMenuActions = [
    { label: "Partager le lien de la vue", onClick: handleCopyViewLink },
    ...(activeSavedView
      ? [
          { label: "Dupliquer la vue", onClick: () => {
              const next = duplicateSavedView(savedViews, activeSavedView.id, crypto.randomUUID(), new Date().toISOString());
              setSavedViews(next);
              saveSavedViews(localStorage, SAVED_VIEWS_STORAGE_KEY, next);
              toast("Vue dupliquée.", "success");
            } },
          { label: "Renommer la vue", onClick: () => {
              setRenamingViewId(activeSavedView.id);
              setNewViewName(activeSavedView.name);
              setSaveViewOpen(true);
            } },
          { label: "Supprimer la vue", onClick: () => {
              const next = removeSavedView(savedViews, activeSavedView.id);
              setSavedViews(next);
              saveSavedViews(localStorage, SAVED_VIEWS_STORAGE_KEY, next);
            }, danger: true },
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      <SavedViewTabs
        tabs={[
          { id: "__all__", label: "Toutes les entreprises", count: byClient.length },
          ...savedViews.map((v) => ({ id: v.id, label: v.name })),
        ]}
        activeId={activeViewId ?? "__all__"}
        onSelect={(id) => {
          if (id === "__all__") {
            setFilters(EMPTY_COMPANY_FILTERS);
            return;
          }
          const target = savedViews.find((v) => v.id === id);
          if (target) setFilters(target.filters);
        }}
        onCreate={openCreateViewDialog}
        menuActions={viewMenuActions}
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

      <QuickFilterChips
        chips={[
          { key: "sirenKnown", label: "SIREN connu", count: chipCounts.sirenKnown, active: filters.sirenKnown },
          { key: "completeAbove80", label: "Complétude ≥ 80%", count: chipCounts.completeAbove80, active: filters.completeAbove80 },
          { key: "freshUnder7d", label: "Fraîcheur < 7j", count: chipCounts.freshUnder7d, active: filters.freshUnder7d },
        ]}
        onToggle={(key) => setFilters((f) => ({ ...f, [key]: !f[key as keyof CompanyFilters] }))}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced((v) => !v)}
        hasActiveFilters={JSON.stringify(filters) !== JSON.stringify(EMPTY_COMPANY_FILTERS)}
        onReset={() => setFilters(EMPTY_COMPANY_FILTERS)}
      >
        {clientId ? (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Segment</label>
            <div className="flex gap-2">
              <select
                value={filters.listId}
                onChange={(e) => setFilters((f) => ({ ...f, listId: e.target.value }))}
                className="rounded-md border border-border px-2 py-1 text-sm"
              >
                <option value="">Toutes les entreprises</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.rules ? "(dynamique)" : ""}
                  </option>
                ))}
              </select>
              {filters.listId && (
                <Button variant="ghost" size="sm" onClick={() => { removeList(filters.listId); setFilters((f) => ({ ...f, listId: "" })); }}>
                  Supprimer la liste
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setNewListOpen((v) => !v)}>
                + Nouvelle liste
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Choisis un client DMH (en haut) pour filtrer par segment.</p>
        )}
      </QuickFilterChips>

      {newListOpen && clientId && (
        <form onSubmit={handleCreateList} className="space-y-3 rounded-md border border-border p-3">
          <input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Nom de la liste"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
          <div className="flex gap-1 rounded-md border border-border p-0.5 w-fit">
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
            <RuleGroupsEditor entityType="company" clientId={clientId} groups={newListGroups} onChange={setNewListGroups} />
          )}
          <Button type="submit" size="sm" disabled={!newListName.trim()}>
            Créer la liste
          </Button>
        </form>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleExport}>
          Exporter
        </Button>
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          Importer des entreprises
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          + Entreprise
        </Button>
      </div>

      {selectedIds.size > 0 && clientId && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 p-3 text-sm">
          <span className="font-medium text-foreground">{selectedIds.size} sélectionné(s)</span>
          <select
            value={bulkListId}
            onChange={(e) => setBulkListId(e.target.value)}
            className="rounded-md border border-border px-2 py-1 text-sm"
          >
            <option value="">Choisir une liste…</option>
            {lists.filter((l) => !l.rules).map((l) => (
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

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>SIREN / Secteur</TableHead>
              <TableHead>Effectif</TableHead>
              <TableHead>CA</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Complétude</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const status = statusByCompanyId.get(c.id);
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelected(c.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <Link to={`/companies/${c.id}`} className="font-medium text-foreground hover:underline">
                        {c.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">{c.city ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col">
                      <span>{c.siren ?? "—"}</span>
                      <span className="text-muted-foreground">{c.naf_label ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{c.employee_range ?? "—"}</TableCell>
                  <TableCell>{c.revenue != null ? formatCurrency(c.revenue) : "—"}</TableCell>
                  <TableCell>{contactCountByCompanyId.get(c.id) ?? 0}</TableCell>
                  <TableCell className="text-xs">{c.siren ? "Pappers" : "—"}</TableCell>
                  <TableCell>
                    <CompletenessBar percent={computeCompanyCompleteness(c)} />
                  </TableCell>
                  <TableCell>
                    {status ? (
                      <Badge variant={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Aucune entreprise.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <AddCompanyDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => reload()} />
      <ImportEntitiesDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entityType="company"
        onImported={() => reload()}
      />
    </div>
  );
}
