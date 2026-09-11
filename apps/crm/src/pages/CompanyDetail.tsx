import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCompanyDetail } from "../hooks/useCompanyDetail";
import { useCompanies } from "../hooks/useCompanies";
import { useContacts } from "../hooks/useContacts";
import { useOpportunities } from "../hooks/useOpportunities";
import { useTasks } from "../hooks/useTasks";
import { useContactLists } from "../hooks/useContactLists";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useToast } from "../components/ui/toast";
import { CustomFieldsCard } from "../components/CustomFieldsCard";
import { MeetingsCard } from "../components/MeetingsCard";
import { AssignedListCard } from "../components/AssignedListCard";
import { SearchableSelect } from "../components/ui/searchable-select";
import { PageHeader } from "../components/ui/page-header";
import { formatScore, getScoreColor } from "../lib/score";
import { formatCurrency, getDealDisplayName } from "../lib/deals";
import { getDealStatusColor, getDealStatusLabel } from "../lib/dealStatus";
import { getTaskStatusColor, getTaskStatusLabel } from "../lib/taskStatus";

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { company, contacts, subsidiaries, loading, error, save, linkContact, unlinkContact } = useCompanyDetail(id!);
  const allContacts = useContacts();
  const { companies: allCompanies } = useCompanies();
  const { deals } = useOpportunities();
  const { tasks } = useTasks();
  const { toast } = useToast();
  const { lists: contactLists, listMemberIds: listContactListMemberIds } = useContactLists(company?.client_id ?? "");
  const [contactListMemberIds, setContactListMemberIds] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [linkContactId, setLinkContactId] = useState("");
  const [parentCompanyId, setParentCompanyId] = useState("");

  useEffect(() => {
    if (!company) return;
    setName(company.name);
    setCity(company.city ?? "");
    setWebsite(company.website ?? "");
  }, [company]);

  useEffect(() => {
    if (!company?.contact_list_id) {
      setContactListMemberIds([]);
      return;
    }
    listContactListMemberIds(company.contact_list_id).then(setContactListMemberIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.contact_list_id]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (error) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!company) return <div className="p-8 text-sm text-muted-foreground">Entreprise introuvable.</div>;

  async function handleAssignContactList(listId: string | null) {
    try {
      await save({ contactListId: listId });
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

  async function handleSetParent(nextParentId: string | null) {
    try {
      await save({ parentCompanyId: nextParentId });
      setParentCompanyId("");
      toast(nextParentId ? "Maison mère mise à jour." : "Maison mère retirée.", "success");
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

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
  const subsidiaryIds = new Set(subsidiaries.map((s) => s.id));
  const linkableParentCompanies = allCompanies.filter(
    (c) => c.client_id === company.client_id && c.id !== company.id && c.id !== company.parent_company_id && !subsidiaryIds.has(c.id),
  );

  return (
    <div className="space-y-4 p-6">
      <Link to="/companies" className="text-sm text-muted-foreground hover:underline">
        ← Retour aux entreprises
      </Link>
      <PageHeader
        kicker="Prospection · fiche entreprise"
        title={company.name}
        actions={<Badge variant={getScoreColor(company.ai_score)}>{formatScore(company.ai_score)}</Badge>}
      />

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

      <Card>
        <CardHeader>
          <CardTitle>Groupe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Maison mère</span>
            {company.parent ? (
              <div className="flex items-center gap-2">
                <Link to={`/companies/${company.parent.id}`} className="font-medium text-foreground hover:underline">
                  {company.parent.name}
                </Link>
                <Button variant="ghost" size="sm" onClick={() => handleSetParent(null)}>
                  Retirer
                </Button>
              </div>
            ) : (
              <span className="text-muted-foreground">Aucune</span>
            )}
          </div>
          <div className="flex gap-2">
            <SearchableSelect
              value={parentCompanyId}
              onChange={setParentCompanyId}
              placeholder="Choisir une maison mère…"
              options={linkableParentCompanies.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Button variant="outline" disabled={!parentCompanyId} onClick={() => handleSetParent(parentCompanyId)}>
              {company.parent ? "Changer" : "Lier"}
            </Button>
          </div>

          <div className="border-t border-border pt-3">
            <span className="text-muted-foreground">Filiales ({subsidiaries.length})</span>
            <div className="mt-2 space-y-1.5">
              {subsidiaries.map((s) => (
                <Link key={s.id} to={`/companies/${s.id}`} className="block font-medium text-foreground hover:underline">
                  {s.name}
                </Link>
              ))}
              {subsidiaries.length === 0 && <p className="text-muted-foreground">Aucune filiale.</p>}
            </div>
          </div>
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
            <SearchableSelect
              value={linkContactId}
              onChange={setLinkContactId}
              placeholder="Lier un contact existant…"
              options={linkableContacts.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))}
            />
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
              <span>{getDealDisplayName(d)}</span>
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

      <AssignedListCard
        title="Liste de contacts assignée"
        lists={contactLists}
        selectedListId={company.contact_list_id ?? ""}
        onAssign={handleAssignContactList}
        memberNames={contactListMemberIds
          .map((cid) => allContacts.contacts.find((c) => c.id === cid))
          .filter((c): c is NonNullable<typeof c> => !!c)
          .map((c) => `${c.first_name} ${c.last_name}`)}
      />

      <MeetingsCard companyId={company.id} />
    </div>
  );
}
