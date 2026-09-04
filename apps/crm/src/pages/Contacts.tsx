import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useContacts } from "../hooks/useContacts";
import { useClients } from "../hooks/useClients";
import { useContactSegments } from "../hooks/useContactSegments";
import { useContactLists } from "../hooks/useContactLists";
import { matchesSegment } from "../lib/segmentEvaluator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { ConditionRowsEditor } from "../components/ConditionRowsEditor";
import type { ConditionDraft } from "../components/ConditionRowsEditor";
import { useToast } from "../components/ui/toast";

export function ContactsPage() {
  const { contacts, loading, error } = useContacts();
  const clients = useClients();
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const { segments, create: createSegment, remove: removeSegment } = useContactSegments(clientId);
  const [segmentId, setSegmentId] = useState("");
  const [newSegmentOpen, setNewSegmentOpen] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState("");
  const [newSegmentRules, setNewSegmentRules] = useState<ConditionDraft[]>([]);

  const { lists, create: createList, remove: removeList, addContacts: addContactsToList, listMemberIds } = useContactLists(clientId);
  const [listId, setListId] = useState("");
  const [listMemberIdSet, setListMemberIdSet] = useState<Set<string> | null>(null);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkListId, setBulkListId] = useState("");

  const activeSegment = segments.find((s) => s.id === segmentId) ?? null;

  useEffect(() => {
    if (!listId) {
      setListMemberIdSet(null);
      return;
    }
    listMemberIds(listId).then((ids) => setListMemberIdSet(new Set(ids)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  const filtered = useMemo(() => {
    let rows = contacts;
    if (clientId) rows = rows.filter((c) => c.client_id === clientId);
    if (activeSegment) rows = rows.filter((c) => matchesSegment(c as unknown as Record<string, unknown>, activeSegment.rules));
    if (listMemberIdSet) rows = rows.filter((c) => listMemberIdSet.has(c.id));
    return rows;
  }, [contacts, clientId, activeSegment, listMemberIdSet]);

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

  async function handleCreateSegment(e: FormEvent) {
    e.preventDefault();
    if (!newSegmentName.trim()) return;
    await createSegment({
      clientId,
      name: newSegmentName.trim(),
      rules: newSegmentRules
        .filter((r) => r.field.trim())
        .map((r) => ({ field: r.field.trim(), operator: r.operator, value: r.operator === "is_set" ? true : r.value })),
    });
    toast(`Segment "${newSegmentName.trim()}" créé.`, "success");
    setNewSegmentName("");
    setNewSegmentRules([]);
    setNewSegmentOpen(false);
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
    await addContactsToList(bulkListId, Array.from(selectedIds));
    toast(`${selectedIds.size} contact(s) ajouté(s) à la liste.`, "success");
    setSelectedIds(new Set());
    setBulkListId("");
    if (bulkListId === listId) {
      listMemberIds(listId).then((ids) => setListMemberIdSet(new Set(ids)));
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-3 p-6">
      <h1 className="text-lg font-semibold text-foreground">Contacts</h1>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-secondary/40 p-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Client DMH</label>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setSegmentId("");
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
          <>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Segment</label>
              <div className="flex gap-2">
                <select
                  value={segmentId}
                  onChange={(e) => setSegmentId(e.target.value)}
                  className="rounded-md border border-border px-2 py-1 text-sm"
                >
                  <option value="">Tous les contacts</option>
                  {segments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {segmentId && (
                  <Button variant="ghost" size="sm" onClick={() => { removeSegment(segmentId); setSegmentId(""); }}>
                    Supprimer le segment
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setNewSegmentOpen((v) => !v)}>
                  + Nouveau segment
                </Button>
              </div>
            </div>
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
          </>
        )}
        {!clientId && (
          <p className="text-xs text-muted-foreground">
            Choisis un client DMH pour créer/filtrer des segments et des listes.
          </p>
        )}
      </div>

      {newSegmentOpen && clientId && (
        <form onSubmit={handleCreateSegment} className="space-y-3 rounded-md border border-border p-3">
          <input
            value={newSegmentName}
            onChange={(e) => setNewSegmentName(e.target.value)}
            placeholder="Nom du segment"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
          <ConditionRowsEditor conditions={newSegmentRules} onChange={setNewSegmentRules} />
          <Button type="submit" size="sm" disabled={!newSegmentName.trim()}>
            Créer le segment
          </Button>
        </form>
      )}

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
              <TableHead>Poste</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Entreprise principale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelected(c.id)} />
                </TableCell>
                <TableCell>
                  <Link to={`/contacts/${c.id}`} className="font-medium text-foreground hover:underline">
                    {c.first_name} {c.last_name}
                  </Link>
                </TableCell>
                <TableCell>{c.job_title ?? "—"}</TableCell>
                <TableCell>{c.email ?? "—"}</TableCell>
                <TableCell>{c.companies?.name ?? "—"}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun contact.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
