import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { ALL_PROSPECT_STATUSES, getStatusColor, getStatusLabel } from "../lib/status";
import { formatScore, getScoreColor } from "../lib/score";
import type { ProspectStatus } from "@dmh/types";

interface ProspectRow {
  id: string;
  status: ProspectStatus;
  companies: { name: string; ai_score: number | null } | null;
  contacts: { first_name: string; last_name: string } | null;
  dmh_clients: { name: string } | null;
}

export function ProspectsListPage() {
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | "all">("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("prospects")
        .select("id, status, companies(name, ai_score), contacts(first_name, last_name), dmh_clients(name)")
        .order("updated_at", { ascending: false });

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setProspects((data ?? []) as unknown as ProspectRow[]);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => (statusFilter === "all" ? prospects : prospects.filter((p) => p.status === statusFilter)),
    [prospects, statusFilter],
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Prospects</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProspectStatus | "all")}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="all">Tous les statuts</option>
          {ALL_PROSPECT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Chargement…</p>}

      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entreprise</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Client DMH</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((prospect) => (
              <TableRow key={prospect.id}>
                <TableCell>
                  <Link to={`/prospects/${prospect.id}`} className="font-medium text-slate-900 hover:underline">
                    {prospect.companies?.name ?? "—"}
                  </Link>
                </TableCell>
                <TableCell>
                  {prospect.contacts
                    ? `${prospect.contacts.first_name} ${prospect.contacts.last_name}`
                    : "—"}
                </TableCell>
                <TableCell>{prospect.dmh_clients?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={getScoreColor(prospect.companies?.ai_score ?? null)}>
                    {formatScore(prospect.companies?.ai_score ?? null)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(prospect.status)}>{getStatusLabel(prospect.status)}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
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
