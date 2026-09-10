import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui/page-header";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";
import { RuleGroupsEditor } from "../components/RuleGroupsEditor";
import type { RuleGroupDraft } from "../components/RuleGroupsEditor";
import { useListsOverview } from "../hooks/useListsOverview";
import { useClients } from "../hooks/useClients";
import { useContactLists } from "../hooks/useContactLists";
import { useCompanyLists } from "../hooks/useCompanyLists";
import { useDealLists } from "../hooks/useDealLists";
import { useListFolders } from "../hooks/useListFolders";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { useSession } from "../lib/useSession";
import { supabase } from "../lib/supabase";
import {
  deleteList as deleteContactList,
  listDeletedContactLists,
  moveListToFolder as moveContactListToFolder,
  restoreContactList,
} from "../services/contactLists";
import {
  deleteList as deleteCompanyList,
  listDeletedCompanyLists,
  moveListToFolder as moveCompanyListToFolder,
  restoreCompanyList,
} from "../services/companyLists";
import {
  deleteList as deleteOpportunityList,
  listDeletedOpportunityLists,
  moveListToFolder as moveOpportunityListToFolder,
  restoreOpportunityList,
} from "../services/dealLists";
import type { CompanyList, ContactList, OpportunityList } from "@dmh/types";
import { ImportListDialog } from "../components/ImportListDialog";
import { toCsv } from "../lib/csv";
import { useToast } from "../components/ui/toast";
import type { ListEntityType } from "../lib/listsOverview";
import { filterListRows } from "../lib/listsFilters";
import { buildFolderTree, listsUnderFolder } from "../lib/folderTree";

const ENTITY_LABELS: Record<ListEntityType, string> = {
  contact: "Contacts",
  company: "Entreprises",
  opportunity: "Opportunités",
};

const ENTITY_ROUTES: Record<ListEntityType, string> = {
  contact: "/contacts",
  company: "/companies",
  opportunity: "/opportunities",
};

const DEFAULT_FIELD: Record<ListEntityType, string> = {
  contact: "first_name",
  company: "name",
  opportunity: "status",
};

function emptyGroups(entityType: ListEntityType): RuleGroupDraft[] {
  return [{ conditions: [{ field: DEFAULT_FIELD[entityType], operator: "eq", value: "" }] }];
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ListsPage() {
  const { rows, loading, reload } = useListsOverview();
  const clients = useClients();
  const { toast } = useToast();
  const staff = useStaffMembers();
  const { session } = useSession();
  // `*_lists.created_by` référence staff_members : un compte client (non-staff) casserait la contrainte FK si on y mettait son propre uid tel quel (même pattern que tasks.created_by, AddTaskDialog.tsx).
  const createdBy = session?.user.id && staff.some((s) => s.id === session.user.id) ? session.user.id : null;

  const [filterClientId, setFilterClientId] = useState("");
  const [filterEntityType, setFilterEntityType] = useState<ListEntityType | "">("");
  const [filterMode, setFilterMode] = useState<"static" | "dynamic" | "">("");
  const [filterFolderId, setFilterFolderId] = useState("");

  // Dossiers du client sélectionné dans le filtre — n'a de sens que pour un seul
  // client à la fois (décision de cadrage : dossiers rattachés à un client, pas
  // transversaux). L'arbre/le filtre par dossier ne s'affichent donc que quand
  // filterClientId est renseigné.
  const { folders, loading: foldersLoading, create: createFolder, remove: removeFolder } = useListFolders(filterClientId);
  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
  const folderIds = useMemo(() => (filterFolderId ? listsUnderFolder(folders, filterFolderId) : undefined), [folders, filterFolderId]);

  const filteredRows = useMemo(
    () => filterListRows(rows, { clientId: filterClientId, entityType: filterEntityType, mode: filterMode, folderIds }),
    [rows, filterClientId, filterEntityType, filterMode, folderIds],
  );

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState("");

  async function handleCreateFolder(e: FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolder({ clientId: filterClientId, name: newFolderName.trim(), parentId: newFolderParentId || null, createdBy });
      toast(`Dossier "${newFolderName.trim()}" créé.`, "success");
      setNewFolderName("");
      setNewFolderParentId("");
      setNewFolderOpen(false);
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

  async function handleDeleteFolder(id: string, name: string) {
    if (!window.confirm(`Supprimer le dossier "${name}" ? Les listes qu'il contient ne seront pas supprimées, juste déclassées.`)) return;
    try {
      await removeFolder(id);
      if (filterFolderId === id) setFilterFolderId("");
      toast(`Dossier "${name}" supprimé.`, "success");
      await reload();
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

  const MOVE_TO_FOLDER_BY_ENTITY: Record<ListEntityType, (id: string, folderId: string | null) => Promise<void>> = {
    contact: (id, folderId) => moveContactListToFolder(supabase, id, folderId),
    company: (id, folderId) => moveCompanyListToFolder(supabase, id, folderId),
    opportunity: (id, folderId) => moveOpportunityListToFolder(supabase, id, folderId),
  };

  async function handleMoveToFolder(id: string, entityType: ListEntityType, folderId: string) {
    try {
      await MOVE_TO_FOLDER_BY_ENTITY[entityType](id, folderId || null);
      await reload();
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newEntityType, setNewEntityType] = useState<ListEntityType>("contact");
  const [newName, setNewName] = useState("");
  const [newMode, setNewMode] = useState<"static" | "dynamic">("static");
  const [newGroups, setNewGroups] = useState<RuleGroupDraft[]>(emptyGroups("contact"));
  const [newFolderId, setNewFolderId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const contactLists = useContactLists(newClientId);
  const companyLists = useCompanyLists(newClientId);
  const dealLists = useDealLists(newClientId);
  const { folders: newListFolders } = useListFolders(newClientId);

  function handleEntityTypeChange(entityType: ListEntityType) {
    setNewEntityType(entityType);
    setNewGroups(emptyGroups(entityType));
  }

  async function handleCreateList(e: FormEvent) {
    e.preventDefault();
    if (!newClientId || !newName.trim()) return;

    const rules =
      newMode === "dynamic"
        ? newGroups
            .map((g) => ({
              conditions: g.conditions
                .filter((c) => c.field.trim())
                .map((c) => ({ field: c.field, operator: c.operator, value: c.operator === "is_set" || c.operator === "is_not_set" ? true : c.value })),
            }))
            .filter((g) => g.conditions.length > 0)
        : undefined;

    setSubmitting(true);
    try {
      const input = { clientId: newClientId, name: newName.trim(), rules, createdBy, folderId: newFolderId || null };
      if (newEntityType === "contact") await contactLists.create(input);
      else if (newEntityType === "company") await companyLists.create(input);
      else await dealLists.create(input);

      toast(`Liste "${newName.trim()}" créée.`, "success");
      setNewName("");
      setNewGroups(emptyGroups(newEntityType));
      setNewFolderId("");
      setCreateOpen(false);
      await reload();
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    } finally {
      setSubmitting(false);
    }
  }

  const DELETE_BY_ENTITY: Record<ListEntityType, (id: string) => Promise<void>> = {
    contact: (id) => deleteContactList(supabase, id),
    company: (id) => deleteCompanyList(supabase, id),
    opportunity: (id) => deleteOpportunityList(supabase, id),
  };

  async function handleDelete(id: string, entityType: ListEntityType, name: string) {
    if (!window.confirm(`Supprimer la liste "${name}" ? Elle restera récupérable dans la Corbeille pendant 30 jours.`)) return;
    try {
      await DELETE_BY_ENTITY[entityType](id);
      toast(`Liste "${name}" déplacée vers la Corbeille.`, "success");
      await reload();
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

  interface DeletedRow {
    id: string;
    name: string;
    entityType: ListEntityType;
    clientName: string;
    deletedAt: string;
  }

  const [trashOpen, setTrashOpen] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [deletedRows, setDeletedRows] = useState<DeletedRow[]>([]);

  function toDeletedRow(list: ContactList | CompanyList | OpportunityList, entityType: ListEntityType): DeletedRow {
    return {
      id: list.id,
      name: list.name,
      entityType,
      clientName: clients.find((c) => c.id === list.client_id)?.name ?? "—",
      deletedAt: list.deleted_at ?? "",
    };
  }

  async function loadTrash() {
    setTrashLoading(true);
    try {
      const [c, co, o] = await Promise.all([
        listDeletedContactLists(supabase),
        listDeletedCompanyLists(supabase),
        listDeletedOpportunityLists(supabase),
      ]);
      setDeletedRows([
        ...c.map((l) => toDeletedRow(l, "contact")),
        ...co.map((l) => toDeletedRow(l, "company")),
        ...o.map((l) => toDeletedRow(l, "opportunity")),
      ]);
    } finally {
      setTrashLoading(false);
    }
  }

  async function handleToggleTrash() {
    const next = !trashOpen;
    setTrashOpen(next);
    if (next) await loadTrash();
  }

  const RESTORE_BY_ENTITY: Record<ListEntityType, (id: string) => Promise<void>> = {
    contact: (id) => restoreContactList(supabase, id),
    company: (id) => restoreCompanyList(supabase, id),
    opportunity: (id) => restoreOpportunityList(supabase, id),
  };

  async function handleRestore(row: DeletedRow) {
    try {
      await RESTORE_BY_ENTITY[row.entityType](row.id);
      toast(`Liste "${row.name}" restaurée.`, "success");
      await loadTrash();
      await reload();
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

  function handleExport() {
    const csv = toCsv(filteredRows, [
      { header: "Nom", value: (r) => r.name },
      { header: "Type", value: (r) => ENTITY_LABELS[r.entityType] },
      { header: "Mode", value: (r) => (r.mode === "dynamic" ? "Dynamique" : "Statique") },
      { header: "Critères", value: (r) => (r.criteriaCount != null ? String(r.criteriaCount) : "") },
      { header: "Client", value: (r) => r.clientName },
      { header: "Dossier", value: (r) => r.folderName ?? "" },
      { header: "Membres", value: (r) => String(r.memberCount) },
      { header: "Enrichis", value: (r) => (r.enrichmentRate != null ? `${r.enrichmentRate}%` : "") },
      { header: "Créée le", value: (r) => r.createdAt.slice(0, 10) },
    ]);
    downloadCsv(csv, `segments-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        kicker="Prospection · toutes les listes"
        title="Segments"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleToggleTrash}>
              Corbeille
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              Exporter
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              Importer un fichier
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen((v) => !v)}>
              + Créer une liste
            </Button>
          </>
        }
      />

      <p className="text-sm text-muted-foreground">
        Toutes les listes de Contacts, Entreprises et Opportunités, tous clients confondus — statiques ou
        dynamiques. Les effectifs sont réels (comptage direct pour les statiques, évaluation des critères pour
        les dynamiques).
      </p>

      <div className="flex items-start gap-4">
        {filterClientId && (
          <aside className="w-56 shrink-0">
            <Card>
              <CardContent className="space-y-2 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Dossiers</span>
                  <button
                    type="button"
                    onClick={() => setNewFolderOpen((v) => !v)}
                    className="text-xs text-accent hover:underline"
                  >
                    + Dossier
                  </button>
                </div>

                {newFolderOpen && (
                  <form onSubmit={handleCreateFolder} className="space-y-1.5 border-t border-border pt-2">
                    <input
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Nom du dossier"
                      className="w-full rounded-md border border-border px-2 py-1 text-xs"
                    />
                    <select
                      value={newFolderParentId}
                      onChange={(e) => setNewFolderParentId(e.target.value)}
                      className="w-full rounded-md border border-border px-2 py-1 text-xs"
                    >
                      <option value="">Dossier racine</option>
                      {folders
                        .filter((f) => f.parent_id === null)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            Sous-dossier de "{f.name}"
                          </option>
                        ))}
                    </select>
                    <Button type="submit" size="sm" disabled={!newFolderName.trim()}>
                      Créer
                    </Button>
                  </form>
                )}

                {foldersLoading ? (
                  <Skeleton className="h-8" />
                ) : (
                  <div className="space-y-0.5 border-t border-border pt-2">
                    <button
                      type="button"
                      onClick={() => setFilterFolderId("")}
                      className={`block w-full rounded px-1.5 py-1 text-left text-xs ${filterFolderId === "" ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}
                    >
                      Tous les dossiers
                    </button>
                    {folderTree.map((node) => (
                      <div key={node.folder.id}>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => setFilterFolderId(node.folder.id)}
                            className={`flex-1 rounded px-1.5 py-1 text-left text-xs ${filterFolderId === node.folder.id ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}
                          >
                            {node.folder.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFolder(node.folder.id, node.folder.name)}
                            className="px-1 text-xs text-muted-foreground hover:text-destructive"
                          >
                            ×
                          </button>
                        </div>
                        {node.children.map((child) => (
                          <div key={child.id} className="flex items-center pl-3">
                            <button
                              type="button"
                              onClick={() => setFilterFolderId(child.id)}
                              className={`flex-1 rounded px-1.5 py-1 text-left text-xs ${filterFolderId === child.id ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}
                            >
                              {child.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFolder(child.id, child.name)}
                              className="px-1 text-xs text-muted-foreground hover:text-destructive"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                    {folders.length === 0 && <p className="px-1.5 text-xs text-muted-foreground">Aucun dossier pour ce client.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        )}

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-secondary/40 p-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Client DMH</label>
              <select
                value={filterClientId}
                onChange={(e) => {
                  setFilterClientId(e.target.value);
                  setFilterFolderId("");
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
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Type</label>
              <select
                value={filterEntityType}
                onChange={(e) => setFilterEntityType(e.target.value as ListEntityType | "")}
                className="rounded-md border border-border px-2 py-1 text-sm"
              >
                <option value="">Tous</option>
                {(Object.keys(ENTITY_LABELS) as ListEntityType[]).map((t) => (
                  <option key={t} value={t}>
                    {ENTITY_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Mode</label>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as "static" | "dynamic" | "")}
                className="rounded-md border border-border px-2 py-1 text-sm"
              >
                <option value="">Tous</option>
                <option value="static">Statique</option>
                <option value="dynamic">Dynamique</option>
              </select>
            </div>
          </div>

      {trashOpen && (
        <Card>
          <CardContent className="space-y-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Corbeille</span>
              <span className="text-xs text-muted-foreground">Purge automatique après 30 jours</span>
            </div>
            {trashLoading ? (
              <Skeleton className="h-8" />
            ) : deletedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune liste supprimée.</p>
            ) : (
              <div className="space-y-1">
                {deletedRows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between border-t border-border pt-1.5 text-sm first:border-0 first:pt-0">
                    <div>
                      <span className="font-medium text-foreground">{row.name}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        {ENTITY_LABELS[row.entityType]} · {row.clientName} · supprimée le {row.deletedAt.slice(0, 10)}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRestore(row)}>
                      Restaurer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {createOpen && (
        <form onSubmit={handleCreateList} className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              value={newClientId}
              onChange={(e) => {
                setNewClientId(e.target.value);
                setNewFolderId("");
              }}
              className="rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Client DMH…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={newEntityType}
              onChange={(e) => handleEntityTypeChange(e.target.value as ListEntityType)}
              className="rounded-md border border-border px-3 py-2 text-sm"
            >
              {(Object.keys(ENTITY_LABELS) as ListEntityType[]).map((t) => (
                <option key={t} value={t}>
                  {ENTITY_LABELS[t]}
                </option>
              ))}
            </select>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom de la liste"
              className="rounded-md border border-border px-3 py-2 text-sm sm:col-span-2"
            />
            {newClientId && newListFolders.length > 0 && (
              <select
                value={newFolderId}
                onChange={(e) => setNewFolderId(e.target.value)}
                className="rounded-md border border-border px-3 py-2 text-sm sm:col-span-2"
              >
                <option value="">Dossier (optionnel)</option>
                {newListFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.parent_id ? `— ${f.name}` : f.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex w-fit gap-1 rounded-md border border-border p-0.5">
            <button
              type="button"
              onClick={() => setNewMode("static")}
              className={`rounded px-2 py-1 text-xs font-medium ${newMode === "static" ? "bg-secondary" : "text-muted-foreground"}`}
            >
              Statique
            </button>
            <button
              type="button"
              onClick={() => setNewMode("dynamic")}
              className={`rounded px-2 py-1 text-xs font-medium ${newMode === "dynamic" ? "bg-secondary" : "text-muted-foreground"}`}
            >
              Dynamique (critères)
            </button>
          </div>

          {newMode === "dynamic" && newClientId && (
            <RuleGroupsEditor entityType={newEntityType} clientId={newClientId} groups={newGroups} onChange={setNewGroups} />
          )}

          <Button type="submit" size="sm" disabled={!newClientId || !newName.trim() || submitting}>
            {submitting ? "…" : "Créer la liste"}
          </Button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Dossier</TableHead>
                  <TableHead className="text-right">Membres</TableHead>
                  <TableHead className="text-right">Enrichis</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-foreground">
                      {row.name}
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <Badge>{ENTITY_LABELS[row.entityType]}</Badge>
                        {row.mode === "dynamic" && row.criteriaCount != null && (
                          <span className="text-xs font-normal text-muted-foreground">
                            {row.criteriaCount} critère{row.criteriaCount === 1 ? "" : "s"}
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{row.mode === "dynamic" ? "Dynamique" : "Statique"}</TableCell>
                    <TableCell className="text-muted-foreground">{row.clientName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {filterClientId ? (
                        <select
                          value={row.folderId ?? ""}
                          onChange={(e) => handleMoveToFolder(row.id, row.entityType, e.target.value)}
                          className="rounded-md border border-border bg-transparent px-1.5 py-1 text-xs"
                        >
                          <option value="">—</option>
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.parent_id ? `— ${f.name}` : f.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        (row.folderName ?? "—")
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.memberCount}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.enrichmentRate != null ? `${row.enrichmentRate}%` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.createdAt.slice(0, 10)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Link
                          to={`${ENTITY_ROUTES[row.entityType]}?client=${row.clientId}&list=${row.id}`}
                          className="text-sm text-accent hover:underline"
                        >
                          Voir
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id, row.entityType, row.name)}
                          className="text-sm text-muted-foreground hover:text-destructive hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Aucune liste pour l'instant.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
        </div>
      </div>

      <ImportListDialog open={importOpen} onOpenChange={setImportOpen} onImported={reload} />
    </div>
  );
}
