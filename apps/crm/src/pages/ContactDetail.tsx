import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useContactDetail } from "../hooks/useContactDetail";
import { useCompanies } from "../hooks/useCompanies";
import { useContacts } from "../hooks/useContacts";
import { useProspects } from "../hooks/useProspects";
import { useInteractions } from "../hooks/useInteractions";
import { supabase } from "../lib/supabase";
import { mergeContacts } from "../services/mergeContacts";
import { useOpportunities } from "../hooks/useOpportunities";
import { useTasks } from "../hooks/useTasks";
import { useContactLists } from "../hooks/useContactLists";
import { useCompanyLists } from "../hooks/useCompanyLists";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { AddCompanyDialog } from "../components/AddCompanyDialog";
import { CustomFieldsCard } from "../components/CustomFieldsCard";
import { MeetingsCard } from "../components/MeetingsCard";
import { AssignedListCard } from "../components/AssignedListCard";
import { SearchableSelect } from "../components/ui/searchable-select";
import { PageHeader } from "../components/ui/page-header";
import { useToast } from "../components/ui/toast";
import { formatCurrency } from "../lib/deals";
import { formatRelativeTime } from "../lib/relativeTime";
import { getDealStatusColor, getDealStatusLabel } from "../lib/dealStatus";
import { getTaskStatusColor, getTaskStatusLabel } from "../lib/taskStatus";
import { getInteractionTypeColor, getInteractionTypeLabel } from "../lib/interactionLabels";
import { MASKED_VALUE, useViewMode } from "../lib/viewMode";

const DATA_SOURCE_LABELS: Record<string, string> = {
  pharow: "Pharow",
  dropcontact: "Dropcontact",
  linkedin: "LinkedIn",
  manual: "Manuel",
};

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contact, companies, loading, error, save, linkCompany, unlinkCompany } = useContactDetail(id!);
  const { viewMode } = useViewMode();
  const masked = viewMode === "client_portal";
  const allCompanies = useCompanies();
  const allContacts = useContacts();
  const { prospects } = useProspects();
  const linkedProspect = prospects.find((p) => p.contact_id === contact?.id);
  const { interactions: history } = useInteractions(linkedProspect?.id, contact?.client_id);
  const { deals } = useOpportunities();
  const { tasks } = useTasks();
  const { toast } = useToast();
  const { lists, addContacts: addContactToList } = useContactLists(contact?.client_id ?? "");
  const [addToListId, setAddToListId] = useState("");
  const [addingToList, setAddingToList] = useState(false);
  const { lists: companyLists, listMemberIds: listCompanyListMemberIds } = useCompanyLists(contact?.client_id ?? "");
  const [companyListMemberIds, setCompanyListMemberIds] = useState<string[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeConfirming, setMergeConfirming] = useState(false);
  const [merging, setMerging] = useState(false);

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

  useEffect(() => {
    if (!contact?.company_list_id) {
      setCompanyListMemberIds([]);
      return;
    }
    listCompanyListMemberIds(contact.company_list_id).then(setCompanyListMemberIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.company_list_id]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (error) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!contact) return <div className="p-8 text-sm text-muted-foreground">Contact introuvable.</div>;

  async function handleAssignCompanyList(listId: string | null) {
    try {
      await save({ companyListId: listId });
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

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
  const primaryCompanyId = (companies.find((rel) => rel.is_primary) ?? companies[0])?.company_id;
  const primaryCompany = allCompanies.companies.find((c) => c.id === primaryCompanyId);
  const relatedDeals = deals.filter((d) => d.contact_id === contact.id);
  const relatedTasks = tasks.filter((t) => t.contact_id === contact.id);
  const mergeCandidates = allContacts.contacts.filter(
    (c) => c.id !== contact.id && c.client_id === contact.client_id,
  );

  async function handleAddToList() {
    if (!addToListId || !contact) return;
    setAddingToList(true);
    try {
      await addContactToList(addToListId, [contact.id]);
      toast("Contact ajouté à la liste.", "success");
      setAddToListId("");
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    } finally {
      setAddingToList(false);
    }
  }

  async function handleMerge() {
    if (!mergeTargetId) return;
    setMerging(true);
    try {
      await mergeContacts(supabase, contact!.id, mergeTargetId);
      toast("Contacts fusionnés.", "success");
      navigate("/contacts");
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    } finally {
      setMerging(false);
      setMergeConfirming(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Link to="/contacts" className="text-sm text-muted-foreground hover:underline">
        ← Retour aux contacts
      </Link>
      <PageHeader
        kicker="Prospection · fiche contact"
        title={`${contact.first_name} ${contact.last_name}`}
        actions={
          !masked && contact.phone ? (
            <Button size="sm" blueprint onClick={() => (window.location.href = `tel:${contact.phone}`)}>
              Appeler
            </Button>
          ) : undefined
        }
      />

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
          <div className="flex flex-col gap-1">
            {masked ? (
              <span className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
                {MASKED_VALUE}
              </span>
            ) : (
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="rounded-md border border-border px-3 py-2 text-sm"
              />
            )}
            {!masked && contact.email_confidence && (
              <span className="text-xs text-muted-foreground">
                Confiance email (Dropcontact) : {contact.email_confidence}
              </span>
            )}
          </div>
          {masked ? (
            <span className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
              {MASKED_VALUE}
            </span>
          ) : (
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Téléphone"
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
          )}
          <input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="URL LinkedIn"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          {contact.data_source && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Source des données : {DATA_SOURCE_LABELS[contact.data_source] ?? contact.data_source}
            </p>
          )}
          <Button onClick={handleSave} disabled={saving} className="w-fit sm:col-span-2">
            {saving ? "…" : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      {primaryCompany && (
        <Card>
          <CardHeader>
            <CardTitle>Société</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <div>SIREN : {primaryCompany.siren ?? "—"}</div>
            <div>Secteur : {primaryCompany.naf_label ?? "—"}</div>
            <div>Effectif : {primaryCompany.employee_range ?? "—"}</div>
            <div>CA : {primaryCompany.revenue ? formatCurrency(primaryCompany.revenue) : "—"}</div>
            <div>Ville : {primaryCompany.city ?? "—"}</div>
          </CardContent>
        </Card>
      )}

      <CustomFieldsCard entityType="contact" entityId={contact.id} clientId={contact.client_id} />

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
            <SearchableSelect
              value={linkCompanyId}
              onChange={setLinkCompanyId}
              placeholder="Lier une entreprise existante…"
              options={linkableCompanies.map((c) => ({ value: c.id, label: c.name }))}
            />
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

      <Card>
        <CardHeader>
          <CardTitle>Ajouter à une liste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <SearchableSelect
              value={addToListId}
              onChange={setAddToListId}
              placeholder="Choisir une liste…"
              options={lists.map((l) => ({ value: l.id, label: l.name }))}
            />
            <Button variant="outline" disabled={!addToListId || addingToList} onClick={handleAddToList} className="shrink-0">
              {addingToList ? "…" : "Ajouter"}
            </Button>
          </div>
          {lists.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Aucune liste pour ce client — crée-en une depuis la page Contacts.
            </p>
          )}
        </CardContent>
      </Card>

      <AssignedListCard
        title="Liste d'entreprises assignée"
        lists={companyLists}
        selectedListId={contact.company_list_id ?? ""}
        onAssign={handleAssignCompanyList}
        memberNames={companyListMemberIds
          .map((cid) => allCompanies.companies.find((c) => c.id === cid))
          .filter((c): c is NonNullable<typeof c> => !!c)
          .map((c) => c.name)}
      />

      <MeetingsCard contactId={contact.id} />

      {linkedProspect && (
        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="border-t border-border pt-2 text-sm first:border-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <Badge variant={getInteractionTypeColor(h.type)}>{getInteractionTypeLabel(h.type)}</Badge>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(h.occurred_at)}</span>
                </div>
                {h.content && <p className="mt-1 text-muted-foreground">{h.content}</p>}
              </div>
            ))}
            {history.length === 0 && <p className="text-sm text-muted-foreground">Aucun historique.</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fusionner avec un autre contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Le contact sélectionné sera supprimé, ses entreprises/opportunités/tâches liées seront réassignées
            à celui-ci.
          </p>
          <div className="flex gap-2">
            <SearchableSelect
              value={mergeTargetId}
              onChange={(v) => {
                setMergeTargetId(v);
                setMergeConfirming(false);
              }}
              placeholder="Choisir un contact en double…"
              options={mergeCandidates.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))}
            />
            {!mergeConfirming ? (
              <Button
                type="button"
                variant="outline"
                disabled={!mergeTargetId}
                onClick={() => setMergeConfirming(true)}
                className="shrink-0"
              >
                Fusionner
              </Button>
            ) : (
              <Button
                type="button"
                disabled={merging}
                onClick={handleMerge}
                className="shrink-0 bg-red-600 text-white hover:bg-red-700"
              >
                {merging ? "…" : "Confirmer la fusion"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
