import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCompanyDetail } from "../hooks/useCompanyDetail";
import { useContacts } from "../hooks/useContacts";
import { useOpportunities } from "../hooks/useOpportunities";
import { useTasks } from "../hooks/useTasks";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useToast } from "../components/ui/toast";
import { CustomFieldsCard } from "../components/CustomFieldsCard";
import { formatScore, getScoreColor } from "../lib/score";
import { formatCurrency } from "../lib/deals";
import { getDealStatusColor, getDealStatusLabel } from "../lib/dealStatus";
import { getTaskStatusColor, getTaskStatusLabel } from "../lib/taskStatus";

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { company, contacts, loading, error, save, linkContact, unlinkContact } = useCompanyDetail(id!);
  const allContacts = useContacts();
  const { deals } = useOpportunities();
  const { tasks } = useTasks();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [linkContactId, setLinkContactId] = useState("");

  useEffect(() => {
    if (!company) return;
    setName(company.name);
    setCity(company.city ?? "");
    setWebsite(company.website ?? "");
  }, [company]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (error) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!company) return <div className="p-8 text-sm text-muted-foreground">Entreprise introuvable.</div>;

  async function handleSave() {
    setSaving(true);
    try {
      await save({ name, city: city.trim() || null, website: website.trim() || null });
      toast("Entreprise mise à jour.", "success");
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    } finally {
      setSaving(false);
    }
  }

  const linkedContactIds = new Set(contacts.map((rel) => rel.contact_id));
  const linkableContacts = allContacts.contacts.filter((c) => !linkedContactIds.has(c.id));
  const relatedDeals = deals.filter((d) => d.company_id === company.id);
  const relatedTasks = tasks.filter((t) => t.company_id === company.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Link to="/companies" className="text-sm text-muted-foreground hover:underline">
        ← Retour aux entreprises
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground">{company.name}</h1>
        <Badge variant={getScoreColor(company.ai_score)}>{formatScore(company.ai_score)}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ville"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="Site web"
            className="rounded-md border border-border px-3 py-2 text-sm sm:col-span-2"
          />
          <Button onClick={handleSave} disabled={saving} className="w-fit sm:col-span-2">
            {saving ? "…" : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Données Pappers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <div>SIREN : {company.siren ?? "—"}</div>
          <div>Forme juridique : {company.legal_form ?? "—"}</div>
          <div>Secteur : {company.naf_label ?? "—"}</div>
          <div>Effectif : {company.employee_range ?? "—"}</div>
          <div>CA : {company.revenue ? `${Math.round(company.revenue / 1000)} k€` : "—"}</div>
          {company.ai_score_reason && <div>Justification score : {company.ai_score_reason}</div>}
        </CardContent>
      </Card>

      <CustomFieldsCard entityType="company" entityId={company.id} clientId={company.client_id} />

      <Card>
        <CardHeader>
          <CardTitle>Contacts liés ({contacts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {contacts.map((rel) => (
            <div key={rel.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <Link to={`/contacts/${rel.contact_id}`} className="font-medium text-foreground hover:underline">
                {rel.contacts ? `${rel.contacts.first_name} ${rel.contacts.last_name}` : "—"}
              </Link>
              <div className="flex items-center gap-2">
                {rel.is_primary && <Badge variant="green">Principale</Badge>}
                <Button variant="ghost" size="sm" onClick={() => unlinkContact(rel.id)}>
                  Retirer
                </Button>
              </div>
            </div>
          ))}
          {contacts.length === 0 && <p className="text-sm text-muted-foreground">Aucun contact lié.</p>}

          <div className="flex gap-2 pt-2">
            <select
              value={linkContactId}
              onChange={(e) => setLinkContactId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Lier un contact existant…</option>
              {linkableContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              disabled={!linkContactId}
              onClick={() => {
                linkContact(linkContactId);
                setLinkContactId("");
              }}
            >
              Lier
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opportunités liées ({relatedDeals.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {relatedDeals.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span>{d.company_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{formatCurrency(d.deal_value)}</span>
                <Badge variant={getDealStatusColor(d.status)}>{getDealStatusLabel(d.status)}</Badge>
              </div>
            </div>
          ))}
          {relatedDeals.length === 0 && <p className="text-sm text-muted-foreground">Aucune opportunité liée.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tâches liées ({relatedTasks.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {relatedTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span>{t.title}</span>
              <Badge variant={getTaskStatusColor(t.status)}>{getTaskStatusLabel(t.status)}</Badge>
            </div>
          ))}
          {relatedTasks.length === 0 && <p className="text-sm text-muted-foreground">Aucune tâche liée.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
