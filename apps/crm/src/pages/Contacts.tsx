import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useContacts } from "../hooks/useContacts";
import { useClients } from "../hooks/useClients";
import { useContactLists } from "../hooks/useContactLists";
import { matchesRuleGroups } from "../lib/segmentEvaluator";
import { listValuesByEntityForClient } from "../services/customFields";
import { supabase } from "../lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { RuleGroupsEditor } from "../components/RuleGroupsEditor";
import type { RuleGroupDraft } from "../components/RuleGroupsEditor";
import { AddContactDialog } from "../components/AddContactDialog";
import { PageHeader } from "../components/ui/page-header";
import { useToast } from "../components/ui/toast";

const EMPTY_GROUPS: RuleGroupDraft[] = [{ conditions: [{ field: "job_title", operator: "eq", value: "" }] }];

export function ContactsPage() {
  const { contacts, loading, error, reload } = useContacts();
  const clients = useClients();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [clientId, setClientId] = useState("");

  const { lists, create: createList, remove: removeList, addContacts: addContactsToList, listMemberIds } = useContactLists(clientId);
  const [listId, setListId] = useState("");
  const [listMemberIdSet, setListMemberIdSet] = useState<Set<string> | null>(null);
  const [customFieldValuesById, setCustomFieldValuesById] = useState<Record<string, Record<string, unknown>>>({});
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListMode, setNewListMode] = useState<"static" | "dynamic">("static");
  const [newListGroups, setNewListGroups] = useState<RuleGroupDraft[]>(EMPTY_GROUPS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkListId, setBulkListId] = useState("");

  const activeList = lists.find((l) => l.id === listId) ?? null;

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
    listValuesByEntityForClient(supabase, "contact", clientId)
      .then(setCustomFieldValuesById)
      .catch(() => setCustomFieldValuesById({}));
  }, [clientId]);

  const filtered = useMemo(() => {
    let rows = contacts;
    if (clientId) rows = rows.filter((c) => c.client_id === clientId);
    if (activeList) {
      if (activeList.rules) {
        rows = rows.filter((c) =>
          matchesRuleGroups({ ...c, ...customFieldValuesById[c.id] } as unknown as Record<string, unknown>, activeList.rules!),
        );
      } else if (listMemberIdSet) {
        rows = rows.filter((c) => listMemberIdSet.has(c.id));
      }
    }
    return rows;
  }, [contacts, clientId, activeList, listMemberIdSet, customFieldValuesById]);

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
                .map((c) => ({ field: c.field, operator: c.operator, value: c.operator === "is_set" ? true : c.value })),
            }))
            .filter((g) => g.conditions.length > 0)
        : undefined;
    await createList({ clientId, name: newListName.trim(), rules });
    toast(`Liste "${newListName.trim()}" créée.`, "success");
    resetNewListForm();
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
      <PageHeader
        kicker="Prospection · base de contacts"
        title="Contacts"
        actions={
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            + Nouveau contact
          </Button>
        }
      />

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
                <option value="">Tous les contacts</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.rules ? "(dynamique)" : ""}
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
            <RuleGroupsEditor entityType="contact" clientId={clientId} groups={newListGroups} onChange={setNewListGroups} />
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

      <AddContactDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => reload()} />
    </div>
  );
}
