import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useCompanies } from "../hooks/useCompanies";
import { useClients } from "../hooks/useClients";
import { useCompanyLists } from "../hooks/useCompanyLists";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { formatScore, getScoreColor } from "../lib/score";
import { AddCompanyDialog } from "../components/AddCompanyDialog";
import { useToast } from "../components/ui/toast";

export function CompaniesPage() {
  const { companies, loading, error, reload } = useCompanies();
  const clients = useClients();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [clientId, setClientId] = useState("");

  const { lists, create: createList, remove: removeList, addCompanies: addCompaniesToList, listMemberIds } = useCompanyLists(clientId);
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
    listMemberIds(listId).then((ids) => setListMemberIdSet(new Set(ids)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  const filtered = useMemo(() => {
    let rows = companies;
    if (clientId) rows = rows.filter((c) => c.client_id === clientId);
    if (listMemberIdSet) rows = rows.filter((c) => listMemberIdSet.has(c.id));
    return rows;
  }, [companies, clientId, listMemberIdSet]);

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

  async function handleCreateList(e: FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    await createList({ clientId, name: newListName.trim() });
    toast(`Liste "${newListName.trim()}" créée.`, "success");
    setNewListName("");
    setNewListOpen(false);
  }

  async function handleAddSelectedToList() {
    if (!bulkListId || selectedIds.size === 0) return;
    await addCompaniesToList(bulkListId, Array.from(selectedIds));
    toast(`${selectedIds.size} entreprise(s) ajoutée(s) à la liste.`, "success");
    setSelectedIds(new Set());
    setBulkListId("");
    if (bulkListId === listId) {
      listMemberIds(listId).then((ids) => setListMemberIdSet(new Set(ids)));
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-3 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Entreprises</h1>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          + Entreprise
        </Button>
      </div>

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
                <option value="">Toutes les listes</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              {listId && (
                <Button variant="ghost" size="sm" onClick={() => { removeList(listId); setListId(""); }}>
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

      {newListOpen && clientId && (
        <form onSubmit={handleCreateList} className="flex items-end gap-2 rounded-md border border-border p-3">
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

      {selectedIds.size > 0 && clientId && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 p-3 text-sm">
          <span className="font-medium text-foreground">{selectedIds.size} sélectionné(s)</span>
          <select
            value={bulkListId}
            onChange={(e) => setBulkListId(e.target.value)}
            className="rounded-md border border-border px-2 py-1 text-sm"
          >
            <option value="">Choisir une liste…</option>
            {lists.map((l) => (
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
              <TableHead>Nom</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Secteur</TableHead>
              <TableHead>Score IA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelected(c.id)} />
                </TableCell>
                <TableCell>
                  <Link to={`/companies/${c.id}`} className="font-medium text-foreground hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.city ?? "—"}</TableCell>
                <TableCell>{c.naf_label ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={getScoreColor(c.ai_score)}>{formatScore(c.ai_score)}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucune entreprise.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <AddCompanyDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => reload()} />
    </div>
  );
}
