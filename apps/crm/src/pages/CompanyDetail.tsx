import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useCompanyDetail } from "../hooks/useCompanyDetail";
import { useCompanies } from "../hooks/useCompanies";
import { useContacts } from "../hooks/useContacts";
import { useOpportunities } from "../hooks/useOpportunities";
import { useProspects } from "../hooks/useProspects";
import { useTasks } from "../hooks/useTasks";
import { useContactLists } from "../hooks/useContactLists";
import { useMeetings } from "../hooks/useMeetings";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { useCompanyTimeline } from "../hooks/useCompanyTimeline";
import { useCalendarConnections } from "../hooks/useCalendarConnections";
import { useCompanyLayout } from "../hooks/useCompanyLayout";
import { useFieldDefinitions } from "../hooks/useFieldDefinitions";
import { useClients } from "../hooks/useClients";
import { useSession } from "../lib/useSession";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useToast } from "../components/ui/toast";
import { supabase } from "../lib/supabase";
import { CustomFieldsCard } from "../components/CustomFieldsCard";
import { MeetingsCard } from "../components/MeetingsCard";
import { AssignedListCard } from "../components/AssignedListCard";
import { AddTaskDialog } from "../components/AddTaskDialog";
import { QuickMeetingDialog } from "../components/QuickMeetingDialog";
import { CompanyLayoutDialog } from "../components/CompanyLayoutDialog";
import { SearchableSelect } from "../components/ui/searchable-select";
import { PageHeader } from "../components/ui/page-header";
import { formatScore, getScoreColor } from "../lib/score";
import { formatCurrency, getDealDisplayName } from "../lib/deals";
import { getDealStatusColor, getDealStatusLabel } from "../lib/dealStatus";
import { getTaskStatusColor, getTaskStatusLabel } from "../lib/taskStatus";
import { buildCompanyTimeline, filterCompanyTimeline } from "../lib/companyTimeline";
import type { CompanyTimelineKind } from "../lib/companyTimeline";
import { createCallLog, createNote } from "../services/interactions";
import { fieldKeysInCustomBlocks, LAYOUT_COLUMNS } from "../lib/companyLayout";
import type { BuiltinBlockKey, LayoutBlock } from "../lib/companyLayout";

type ComposerKind = "note" | "call" | "email";

const TIMELINE_FILTERS: Array<{ value: CompanyTimelineKind | "all"; label: string }> = [
  { value: "all", label: "Tout" },
  { value: "interaction", label: "Échanges" },
  { value: "status", label: "Statuts" },
  { value: "meeting", label: "Rendez-vous" },
];

/**
 * Fiche entreprise — S38-8 (CR du 17/09, modèle HubSpot) : 3 colonnes.
 * Gauche : informations clés + actions rapides (note, email, appel, tâche,
 * réunion). Centre : historique (échanges et statuts de tous les prospects
 * de l'entreprise, rendez-vous). Droite : connexions (contacts, opportunités,
 * groupe, tâches, liste assignée).
 *
 * S38-9 : chaque client DMH peut masquer/réordonner/déplacer ces blocs et
 * ajouter des blocs de champs qui lui sont propres (`CompanyLayoutDialog`,
 * table `company_layouts`) — l'affichage ci-dessus reste le défaut.
 */
export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { company, contacts, subsidiaries, loading, error, save, linkContact, unlinkContact, reload } = useCompanyDetail(id!);
  const allContacts = useContacts();
  const { companies: allCompanies } = useCompanies();
  const { deals } = useOpportunities();
  const { tasks, create: createTaskFromDialog } = useTasks();
  const { prospects } = useProspects();
  const { meetings } = useMeetings();
  const staff = useStaffMembers();
  const { session } = useSession();
  const { connections } = useCalendarConnections();
  const clients = useClients();
  const { toast } = useToast();
  const { lists: contactLists, listMemberIds: listContactListMemberIds } = useContactLists(company?.client_id ?? "");
  const [contactListMemberIds, setContactListMemberIds] = useState<string[]>([]);

  const companyProspects = useMemo(() => prospects.filter((p) => p.company_id === company?.id), [prospects, company?.id]);
  const linkedProspect = companyProspects[0];
  const timeline = useCompanyTimeline(companyProspects.map((p) => p.id));

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [linkContactId, setLinkContactId] = useState("");
  const [parentCompanyId, setParentCompanyId] = useState("");

  const [composer, setComposer] = useState<ComposerKind | null>(null);
  const [composerProspectId, setComposerProspectId] = useState("");
  const [composerContent, setComposerContent] = useState("");
  const [composerSaving, setComposerSaving] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<CompanyTimelineKind | "all">("all");
  const [taskOpen, setTaskOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  // S38-9 : composition de la fiche propre au client de cette entreprise.
  const { layout, isCustom: layoutIsCustom, save: saveLayout, reset: resetLayout } = useCompanyLayout(company?.client_id);
  const { definitions: companyFieldDefinitions } = useFieldDefinitions("company", company?.client_id ?? null);

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

  const timelineEvents = useMemo(
    () =>
      buildCompanyTimeline({
        interactions: timeline.interactions,
        statusHistory: timeline.statusHistory,
        meetings: meetings.filter((m) => m.company_id === company?.id),
        contactNameByProspectId: new Map(
          companyProspects.map((p) => [p.id, p.contacts ? `${p.contacts.first_name} ${p.contacts.last_name}` : "—"]),
        ),
        staffNameById: new Map(staff.map((s) => [s.id, s.name])),
      }),
    [timeline.interactions, timeline.statusHistory, meetings, company?.id, companyProspects, staff],
  );

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

  /** Enrichissement à la demande (CR du 11/09/2026) : rafraîchit les données Pappers sans attendre le pipeline automatique — nécessite un prospect lié (voir enrich-pappers/index.ts, mode "manual"). */
  async function handleEnrich() {
    if (!linkedProspect) return;
    setEnriching(true);
    try {
      const { error: invokeError } = await supabase.functions.invoke("enrich-pappers", {
        body: { prospect_id: linkedProspect.id, manual: true },
      });
      if (invokeError) throw invokeError;
      toast("Entreprise enrichie (Pappers).", "success");
      await reload();
    } catch (err) {
      toast(`Échec de l'enrichissement : ${(err as Error).message}`, "destructive");
    } finally {
      setEnriching(false);
    }
  }

  function openComposer(kind: ComposerKind) {
    setComposer((current) => (current === kind ? null : kind));
    setComposerProspectId(companyProspects[0]?.id ?? "");
    setComposerContent("");
  }

  async function handleComposerSubmit() {
    if (!company || !composerProspectId || !composerContent.trim()) return;
    setComposerSaving(true);
    try {
      const input = {
        prospectId: composerProspectId,
        clientId: company.client_id,
        content: composerContent.trim(),
        createdBy: session?.user.id && staff.some((s) => s.id === session.user.id) ? session.user.id : null,
      };
      if (composer === "call") await createCallLog(supabase, input);
      else await createNote(supabase, input);
      toast(composer === "call" ? "Appel journalisé." : "Note ajoutée.", "success");
      setComposer(null);
      setComposerContent("");
      await timeline.reload();
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    } finally {
      setComposerSaving(false);
    }
  }

  const linkedContactIds = new Set(contacts.map((rel) => rel.contact_id));
  const linkableContacts = allContacts.contacts.filter((c) => !linkedContactIds.has(c.id));
  const contactsWithEmail = allContacts.contacts.filter((c) => linkedContactIds.has(c.id) && c.email);
  const relatedDeals = deals.filter((d) => d.company_id === company.id);
  const relatedTasks = tasks.filter((t) => t.company_id === company.id);
  const subsidiaryIds = new Set(subsidiaries.map((s) => s.id));
  const linkableParentCompanies = allCompanies.filter(
    (c) => c.client_id === company.client_id && c.id !== company.id && c.id !== company.parent_company_id && !subsidiaryIds.has(c.id),
  );
  const noProspect = companyProspects.length === 0;
  const visibleEvents = filterCompanyTimeline(timelineEvents, timelineFilter);

  const quickActions: Array<{ key: string; label: string; onClick: () => void; disabled: boolean; title?: string }> = [
    {
      key: "note",
      label: "Note",
      onClick: () => openComposer("note"),
      disabled: noProspect,
      title: noProspect ? "Une note se rattache à un contact prospect de l'entreprise — aucun pour l'instant." : undefined,
    },
    {
      key: "email",
      label: "Email",
      onClick: () => openComposer("email"),
      disabled: contactsWithEmail.length === 0,
      title: contactsWithEmail.length === 0 ? "Aucun contact lié n'a d'email." : undefined,
    },
    {
      key: "call",
      label: "Appel",
      onClick: () => openComposer("call"),
      disabled: noProspect,
      title: noProspect ? "Un appel se rattache à un contact prospect de l'entreprise — aucun pour l'instant." : undefined,
    },
    { key: "task", label: "Tâche", onClick: () => setTaskOpen(true), disabled: false },
    {
      key: "meeting",
      label: "Réunion",
      onClick: () => setMeetingOpen(true),
      disabled: connections.length === 0,
      title: connections.length === 0 ? "Connecte un calendrier (Paramètres › Calendrier) pour planifier une réunion." : undefined,
    },
  ];

  const composerCard = composer && (
    <Card>
      <CardHeader>
        <CardTitle>{composer === "note" ? "Nouvelle note" : composer === "call" ? "Journaliser un appel" : "Écrire un email"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {composer === "email" ? (
          <ul className="space-y-1 text-sm">
            {contactsWithEmail.map((c) => (
              <li key={c.id}>
                <a href={`mailto:${c.email}`} className="text-foreground hover:underline">
                  {c.first_name} {c.last_name} — {c.email}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <>
            {companyProspects.length > 1 && (
              <select
                aria-label="Contact concerné"
                value={composerProspectId}
                onChange={(e) => setComposerProspectId(e.target.value)}
                className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
              >
                {companyProspects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.contacts ? `${p.contacts.first_name} ${p.contacts.last_name}` : p.id}
                  </option>
                ))}
              </select>
            )}
            <textarea
              value={composerContent}
              onChange={(e) => setComposerContent(e.target.value)}
              placeholder={composer === "call" ? "Compte rendu de l'appel…" : "Note…"}
              rows={3}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setComposer(null)}>
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleComposerSubmit}
                disabled={composerSaving || !composerContent.trim() || !composerProspectId}
              >
                {composerSaving ? "…" : "Enregistrer"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  // S38-9 : le compositeur (note/appel/email) s'affiche au-dessus de l'historique ; si ce client a masqué
  // l'historique, il s'affiche sous les actions rapides pour rester utilisable.
  const timelineVisible = LAYOUT_COLUMNS.some((c) => layout.columns[c].some((b) => b.id === "timeline" && b.visible));
  const customBlockFieldKeys = fieldKeysInCustomBlocks(layout);

  const blocks: Record<BuiltinBlockKey, ReactNode> = {
    summary: (
      <>
        <Card>
          <CardHeader>
            <CardTitle>En bref</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1 text-muted-foreground">
              <div>Secteur : {company.naf_label ?? "—"}</div>
              <div>Effectif : {company.employee_range ?? "—"}</div>
              <div>CA : {company.revenue ? `${Math.round(company.revenue / 1000)} k€` : "—"}</div>
              <div>Ville : {company.city ?? "—"}</div>
              {company.website && (
                <div>
                  Site :{" "}
                  <a href={company.website} target="_blank" rel="noreferrer" className="text-foreground hover:underline">
                    {company.website}
                  </a>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
              {quickActions.map((a) => (
                <Button
                  key={a.key}
                  type="button"
                  size="sm"
                  variant={composer === a.key ? "default" : "outline"}
                  onClick={a.onClick}
                  disabled={a.disabled}
                  title={a.title}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        {!timelineVisible && composerCard}
      </>
    ),
    info: (
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
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
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <Button onClick={handleSave} disabled={saving} className="w-fit">
            {saving ? "…" : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>
    ),
    pappers: (
      <Card>
        <CardHeader>
          <CardTitle>Données Pappers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <div>SIREN : {company.siren ?? "—"}</div>
          <div>Forme juridique : {company.legal_form ?? "—"}</div>
          {company.ai_score_reason && <div>Justification score : {company.ai_score_reason}</div>}
        </CardContent>
      </Card>
    ),
    prospecting_fields: (
      <CustomFieldsCard
        entityType="company"
        entityId={company.id}
        clientId={company.client_id}
        section="system"
        excludeFieldKeys={customBlockFieldKeys}
      />
    ),
    custom_fields: (
      <CustomFieldsCard
        entityType="company"
        entityId={company.id}
        clientId={company.client_id}
        section="custom"
        excludeFieldKeys={customBlockFieldKeys}
      />
    ),
    timeline: (
      <>
        {composerCard}
        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {TIMELINE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setTimelineFilter(f.value)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${
                    timelineFilter === f.value ? "border-accent text-foreground" : "border-border text-muted-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {timeline.loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : timeline.error ? (
              <p className="text-sm text-destructive">{timeline.error}</p>
            ) : visibleEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun événement pour l'instant.</p>
            ) : (
              <ol className="space-y-2">
                {visibleEvents.map((e) => (
                  <li key={e.id} className="rounded-md border border-border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{e.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(e.at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    {e.detail && <p className="mt-0.5 text-muted-foreground">{e.detail}</p>}
                    {(e.contactName || e.authorName) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[e.contactName, e.authorName && `par ${e.authorName}`].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </>
    ),
    contacts: (
      <Card>
        <CardHeader>
          <CardTitle>Contacts ({contacts.length})</CardTitle>
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
    ),
    deals: (
      <Card>
        <CardHeader>
          <CardTitle>Opportunités ({relatedDeals.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {relatedDeals.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <Link to={`/opportunities/${d.id}`} className="hover:underline">
                {getDealDisplayName(d)}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{formatCurrency(d.deal_value)}</span>
                <Badge variant={getDealStatusColor(d.status)}>{getDealStatusLabel(d.status)}</Badge>
              </div>
            </div>
          ))}
          {relatedDeals.length === 0 && <p className="text-sm text-muted-foreground">Aucune opportunité liée.</p>}
        </CardContent>
      </Card>
    ),
    group: (
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
    ),
    tasks: (
      <Card>
        <CardHeader>
          <CardTitle>Tâches ({relatedTasks.length})</CardTitle>
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
    ),
    assigned_list: (
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
    ),
    meetings: <MeetingsCard companyId={company.id} />,
  };

  function renderBlock(block: LayoutBlock) {
    if (!company) return null;
    if (block.type === "builtin") return <Fragment key={block.id}>{blocks[block.key]}</Fragment>;
    return (
      <CustomFieldsCard
        key={block.id}
        entityType="company"
        entityId={company.id}
        clientId={company.client_id}
        onlyFieldKeys={block.fieldKeys}
        title={block.title}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      <Link to="/companies" className="text-sm text-muted-foreground hover:underline">
        ← Retour aux entreprises
      </Link>
      <PageHeader
        kicker="Prospection · fiche entreprise"
        title={company.name}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setLayoutOpen(true)} title="Blocs affichés pour ce client">
              Personnaliser la fiche
            </Button>
            {linkedProspect && (
              <Button size="sm" variant="outline" onClick={handleEnrich} disabled={enriching} title="Rafraîchir les données via Pappers">
                {enriching ? "…" : "Enrichir"}
              </Button>
            )}
            <Badge variant={getScoreColor(company.ai_score)}>{formatScore(company.ai_score)}</Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)]">
        {LAYOUT_COLUMNS.map((column) => (
          <div key={column} className="space-y-4">
            {layout.columns[column].filter((b) => b.visible).map(renderBlock)}
          </div>
        ))}
      </div>

      <AddTaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        onCreated={createTaskFromDialog}
        defaults={{ clientId: company.client_id, companyId: company.id }}
      />
      {meetingOpen && (
        <QuickMeetingDialog
          onClose={() => setMeetingOpen(false)}
          connections={connections}
          defaults={{ clientId: company.client_id, companyId: company.id }}
        />
      )}
      <CompanyLayoutDialog
        open={layoutOpen}
        clientName={clients.find((c) => c.id === company.client_id)?.name ?? "ce client"}
        layout={layout}
        isCustom={layoutIsCustom}
        fieldOptions={companyFieldDefinitions.map((d) => ({ key: d.field_key, label: d.label }))}
        onClose={() => setLayoutOpen(false)}
        onSave={async (next) => {
          await saveLayout(next, session?.user.id && staff.some((s) => s.id === session.user.id) ? session.user.id : null);
          toast("Composition de la fiche enregistrée pour ce client.", "success");
        }}
        onReset={async () => {
          await resetLayout();
          toast("Affichage par défaut rétabli pour ce client.", "success");
        }}
      />
    </div>
  );
}
