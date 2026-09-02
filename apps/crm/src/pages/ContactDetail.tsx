import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useContactDetail } from "../hooks/useContactDetail";
import { useCompanies } from "../hooks/useCompanies";
import { useOpportunities } from "../hooks/useOpportunities";
import { useTasks } from "../hooks/useTasks";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { AddCompanyDialog } from "../components/AddCompanyDialog";
import { useToast } from "../components/ui/toast";
import { formatCurrency } from "../lib/deals";
import { getDealStatusColor, getDealStatusLabel } from "../lib/dealStatus";
import { getTaskStatusColor, getTaskStatusLabel } from "../lib/taskStatus";

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { contact, companies, loading, error, save, linkCompany, unlinkCompany } = useContactDetail(id!);
  const allCompanies = useCompanies();
  const { deals } = useOpportunities();
  const { tasks } = useTasks();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [linkCompanyId, setLinkCompanyId] = useState("");
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);

  useEffect(() => {
    if (!contact) return;
    setFirstName(contact.first_name);
    setLastName(contact.last_name);
    setJobTitle(contact.job_title ?? "");
    setEmail(contact.email ?? "");
    setPhone(contact.phone ?? "");
    setLinkedinUrl(contact.linkedin_url ?? "");
  }, [contact]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (error) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!contact) return <div className="p-8 text-sm text-muted-foreground">Contact introuvable.</div>;

  async function handleSave() {
    setSaving(true);
    try {
      await save({
        firstName,
        lastName,
        jobTitle: jobTitle.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
      });
      toast("Contact mis à jour.", "success");
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    } finally {
      setSaving(false);
    }
  }

  const linkedCompanyIds = new Set(companies.map((rel) => rel.company_id));
  const linkableCompanies = allCompanies.companies.filter((c) => !linkedCompanyIds.has(c.id));
  const relatedDeals = deals.filter((d) => d.contact_id === contact.id);
  const relatedTasks = tasks.filter((t) => t.contact_id === contact.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Link to="/contacts" className="text-sm text-muted-foreground hover:underline">
        ← Retour aux contacts
      </Link>
      <h1 className="text-lg font-semibold text-foreground">
        {contact.first_name} {contact.last_name}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Prénom"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Nom"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Poste"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Téléphone"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="URL LinkedIn"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <Button onClick={handleSave} disabled={saving} className="w-fit sm:col-span-2">
            {saving ? "…" : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Entreprises liées ({companies.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {companies.map((rel) => (
            <div key={rel.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <Link to={`/companies/${rel.company_id}`} className="font-medium text-foreground hover:underline">
                {rel.companies?.name ?? "—"}
              </Link>
              <div className="flex items-center gap-2">
                {rel.is_primary && <Badge variant="green">Principale</Badge>}
                <Button variant="ghost" size="sm" onClick={() => unlinkCompany(rel.id)}>
                  Retirer
                </Button>
              </div>
            </div>
          ))}
          {companies.length === 0 && <p className="text-sm text-muted-foreground">Aucune entreprise liée.</p>}

          <div className="flex gap-2 pt-2">
            <select
              value={linkCompanyId}
              onChange={(e) => setLinkCompanyId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Lier une entreprise existante…</option>
              {linkableCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              disabled={!linkCompanyId}
              onClick={() => {
                linkCompany(linkCompanyId);
                setLinkCompanyId("");
              }}
            >
              Lier
            </Button>
            <Button variant="outline" onClick={() => setAddCompanyOpen(true)} className="shrink-0">
              + Nouvelle
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddCompanyDialog
        open={addCompanyOpen}
        onOpenChange={setAddCompanyOpen}
        lockedClientId={contact.client_id}
        onCreated={(company) => linkCompany(company.id)}
      />

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
