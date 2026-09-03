import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useContacts } from "../hooks/useContacts";
import { useClients } from "../hooks/useClients";
import { useContactSegments } from "../hooks/useContactSegments";
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

  const activeSegment = segments.find((s) => s.id === segmentId) ?? null;

  const filtered = useMemo(() => {
    let rows = contacts;
    if (clientId) rows = rows.filter((c) => c.client_id === clientId);
    if (activeSegment) rows = rows.filter((c) => matchesSegment(c as unknown as Record<string, unknown>, activeSegment.rules));
    return rows;
  }, [contacts, clientId, activeSegment]);

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

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={4} className="text-center text-muted-foreground">
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
