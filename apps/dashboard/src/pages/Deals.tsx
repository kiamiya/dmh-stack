import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useClient } from "../lib/useClient";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { formatCurrency, validateDealForm } from "../lib/deals";

interface ProspectOption {
  id: string;
  companies: { name: string } | null;
  contacts: { first_name: string; last_name: string } | null;
}

interface DealRow {
  id: string;
  company_name: string;
  deal_value: number;
  signed_at: string | null;
  attributed_to_dmh: boolean | null;
  commission_amount: number | null;
  commission_paid: boolean;
}

export function DealsPage() {
  const { client } = useClient();
  const [prospects, setProspects] = useState<ProspectOption[]>([]);
  const [deals, setDeals] = useState<DealRow[] | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [signedAt, setSignedAt] = useState("");
  const [prospectId, setProspectId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadDeals() {
    const { data, error } = await supabase
      .from("deals")
      .select("id, company_name, deal_value, signed_at, attributed_to_dmh, commission_amount, commission_paid")
      .order("created_at", { ascending: false });
    if (!error) setDeals((data ?? []) as DealRow[]);
  }

  useEffect(() => {
    async function loadProspects() {
      const { data } = await supabase
        .from("prospects")
        .select("id, companies(name), contacts(first_name, last_name)");
      setProspects((data ?? []) as unknown as ProspectOption[]);
    }
    loadProspects();
    loadDeals();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const error = validateDealForm({ companyName, dealValue, signedAt });
    if (error) {
      setFormError(error);
      return;
    }
    if (!client) return;

    setSubmitting(true);
    setFormError(null);
    const { error: insertError } = await supabase.from("deals").insert({
      client_id: client.id,
      company_name: companyName,
      deal_value: Number(dealValue),
      signed_at: signedAt,
      prospect_id: prospectId || null,
      status: "won",
    });
    setSubmitting(false);

    if (insertError) {
      setFormError(insertError.message);
      return;
    }

    setCompanyName("");
    setDealValue("");
    setSignedAt("");
    setProspectId("");
    await loadDeals();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-lg font-semibold text-slate-900">Deals</h1>

      <Card>
        <CardHeader>
          <CardTitle>Déclarer un deal signé</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              placeholder="Entreprise"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Montant (€)"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={signedAt}
              onChange={(e) => setSignedAt(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={prospectId}
              onChange={(e) => setProspectId(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Prospect lié (optionnel)</option>
              {prospects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.companies?.name ?? "—"}
                  {p.contacts ? ` — ${p.contacts.first_name} ${p.contacts.last_name}` : ""}
                </option>
              ))}
            </select>
            {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}
            <Button type="submit" disabled={submitting} className="w-fit sm:col-span-2">
              {submitting ? "Enregistrement..." : "Déclarer le deal"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entreprise</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead>Date de signature</TableHead>
            <TableHead>Attribué à DMH</TableHead>
            <TableHead>Commission</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(deals ?? []).map((deal) => (
            <TableRow key={deal.id}>
              <TableCell>{deal.company_name}</TableCell>
              <TableCell>{formatCurrency(deal.deal_value)}</TableCell>
              <TableCell>
                {deal.signed_at ? new Date(deal.signed_at).toLocaleDateString("fr-FR") : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={deal.attributed_to_dmh ? "green" : "default"}>
                  {deal.attributed_to_dmh ? "Oui" : "Non"}
                </Badge>
              </TableCell>
              <TableCell>
                {formatCurrency(deal.commission_amount)}
                {deal.attributed_to_dmh && (
                  <span className="ml-1 text-xs text-slate-400">
                    {deal.commission_paid ? "(payée)" : "(à payer)"}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {deals && deals.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-slate-500">
                Aucun deal déclaré.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
