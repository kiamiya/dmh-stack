import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useOpportunityDetail } from "../hooks/useOpportunityDetail";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { CustomFieldsCard } from "../components/CustomFieldsCard";
import { MeetingsCard } from "../components/MeetingsCard";
import { useToast } from "../components/ui/toast";
import { formatCurrency } from "../lib/deals";
import { getDealStatusColor, getDealStatusLabel } from "../lib/dealStatus";

export function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { deal, stages, loading, error, changeStage, save } = useOpportunityDetail(id!);
  const { toast } = useToast();

  const [dealValue, setDealValue] = useState("");
  const [probability, setProbability] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!deal) return;
    setDealValue(String(deal.deal_value));
    setProbability(deal.probability !== null ? String(deal.probability) : "");
    setExpectedCloseDate(deal.expected_close_date ?? "");
  }, [deal]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (error) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!deal) return <div className="p-8 text-sm text-muted-foreground">Opportunité introuvable.</div>;

  async function handleSave() {
    setSaving(true);
    try {
      await save({
        dealValue: Number(dealValue),
        probability: probability ? Number(probability) : null,
        expectedCloseDate: expectedCloseDate || null,
      });
      toast("Opportunité mise à jour.", "success");
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    } finally {
      setSaving(false);
    }
  }

  async function handleStageChange(stageId: string) {
    try {
      await changeStage(stageId);
      toast("Étape mise à jour.", "success");
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Link to="/opportunities" className="text-sm text-muted-foreground hover:underline">
        ← Retour aux opportunités
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground">{deal.company_name}</h1>
        <Badge variant={getDealStatusColor(deal.status)}>{getDealStatusLabel(deal.status)}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Étape</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={deal.stage_id ?? ""}
            onChange={(e) => handleStageChange(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Sélectionner…
            </option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Montant (€)</label>
            <input
              type="number"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Probabilité (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={probability}
              onChange={(e) => setProbability(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Date de clôture prévue</label>
            <input
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-fit sm:col-span-2">
            {saving ? "…" : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      {deal.status === "won" && (
        <Card>
          <CardHeader>
            <CardTitle>Attribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <div>
              Attribuée à DMH :{" "}
              <Badge variant={deal.attributed_to_dmh ? "green" : "default"}>
                {deal.attributed_to_dmh ? "Oui" : "Non"}
              </Badge>
            </div>
            <div>Commission : {formatCurrency(deal.commission_amount)}</div>
          </CardContent>
        </Card>
      )}

      <CustomFieldsCard entityType="opportunity" entityId={deal.id} clientId={deal.client_id} />

      <Card>
        <CardHeader>
          <CardTitle>Contact / Entreprise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <div>
            Entreprise :{" "}
            {deal.company_id ? (
              <Link to={`/companies/${deal.company_id}`} className="text-foreground hover:underline">
                {deal.companies?.name ?? deal.company_name}
              </Link>
            ) : (
              deal.company_name
            )}
          </div>
          <div>
            Contact :{" "}
            {deal.contact_id && deal.contacts ? (
              <Link to={`/contacts/${deal.contact_id}`} className="text-foreground hover:underline">
                {deal.contacts.first_name} {deal.contacts.last_name}
              </Link>
            ) : (
              "—"
            )}
          </div>
        </CardContent>
      </Card>

      <MeetingsCard dealId={deal.id} />
    </div>
  );
}
