import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTasks } from "../hooks/useTasks";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { useSession } from "../lib/useSession";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { AddTaskDialog } from "../components/AddTaskDialog";
import { EditTaskDialog } from "../components/EditTaskDialog";
import { TaskCalendarView } from "../components/TaskCalendarView";
import { TaskFocusMode } from "../components/TaskFocusMode";
import { SavedViewTabs } from "../components/SavedViewTabs";
import { QuickFilterChips } from "../components/QuickFilterChips";
import { PageHeader } from "../components/ui/page-header";
import { ALL_TASK_STATUSES, getTaskStatusColor, getTaskStatusLabel } from "../lib/taskStatus";
import { taskRelatedLink } from "../lib/taskLinks";
import { EMPTY_TASK_FILTERS, filterTasks } from "../lib/taskFilters";
import type { TaskFilters, TaskPreset } from "../lib/taskFilters";
import {
  createSavedView,
  duplicateSavedView,
  loadSavedViews,
  removeSavedView,
  renameSavedView,
  saveSavedViews,
} from "../lib/savedViews";
import type { SavedView } from "../lib/savedViews";
import type { TaskRow } from "../services/tasks";
import type { TaskStatus, TaskType } from "@dmh/types";
import { useToast } from "../components/ui/toast";

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  call: "Appel",
  email: "Email",
  meeting: "RDV",
  data: "Donnée",
};

const ORIGIN_LABELS: Record<string, string> = {
  manual: "Manuel",
  automation: "Automatisation",
};

const SAVED_VIEWS_STORAGE_KEY = "dmh-crm-saved-views-tasks";

const SYSTEM_TABS: Array<{ id: string; label: string; preset: TaskPreset }> = [
  { id: "all", label: "Toutes", preset: "all" },
  { id: "todo", label: "À faire", preset: "todo" },
  { id: "overdue", label: "En retard", preset: "overdue" },
  { id: "today", label: "Aujourd'hui", preset: "today" },
  { id: "mine", label: "Mes tâches", preset: "mine" },
  { id: "done", label: "Terminées", preset: "done" },
];

export function TasksPage() {
  const { tasks, loading, error, create, changeStatus, update } = useTasks();
  const staff = useStaffMembers();
  const { session } = useSession();
  const currentStaffId = session?.user.id && staff.some((s) => s.id === session.user.id) ? session.user.id : null;
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [focusOpen, setFocusOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [filters, setFilters] = useState<TaskFilters>(EMPTY_TASK_FILTERS);
  const [savedViews, setSavedViews] = useState<SavedView<TaskFilters>[]>([]);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null);
  const [newViewName, setNewViewName] = useState("");

  useEffect(() => {
    setSavedViews(loadSavedViews(localStorage, SAVED_VIEWS_STORAGE_KEY));
  }, []);

  const now = useMemo(() => new Date(), []);

  const systemTabCounts = useMemo(
    () => Object.fromEntries(SYSTEM_TABS.map((t) => [t.id, filterTasks(tasks, { ...EMPTY_TASK_FILTERS, preset: t.preset }, currentStaffId, now).length])),
    [tasks, currentStaffId, now],
  );

  const activeSystemTabId = useMemo(() => {
    if (savedViews.some((v) => JSON.stringify(v.filters) === JSON.stringify(filters))) return null;
    return SYSTEM_TABS.find((t) => JSON.stringify({ ...EMPTY_TASK_FILTERS, preset: t.preset }) === JSON.stringify(filters))?.id ?? null;
  }, [filters, savedViews]);
  const activeViewId = useMemo(() => {
    const match = savedViews.find((v) => JSON.stringify(v.filters) === JSON.stringify(filters));
    return match?.id ?? null;
  }, [savedViews, filters]);
  const activeSavedView = savedViews.find((v) => v.id === activeViewId) ?? null;

  const chipCounts = useMemo(
    () => ({
      call: tasks.filter((t) => t.task_type === "call").length,
      email: tasks.filter((t) => t.task_type === "email").length,
      meeting: tasks.filter((t) => t.task_type === "meeting").length,
      data: tasks.filter((t) => t.task_type === "data").length,
      highPriority: tasks.filter((t) => t.priority === "high").length,
      automationOnly: tasks.filter((t) => t.origin === "automation").length,
    }),
    [tasks],
  );

  const filteredTasks = useMemo(() => filterTasks(tasks, filters, currentStaffId, now), [tasks, filters, currentStaffId, now]);

  /** File "à dépiler" (CR du 11/09/2026) : tâches non terminées de la vue active, échéance la plus proche d'abord (celles sans échéance en dernier). */
  const focusQueue = useMemo(
    () =>
      filteredTasks
        .filter((t) => t.status !== "done")
        .sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        }),
    [filteredTasks],
  );

  const staffLoad = useMemo(
    () =>
      staff.map((s) => ({
        id: s.id,
        name: s.name,
        active: tasks.filter((t) => t.assigned_to === s.id && t.status !== "done").length,
        overdue: tasks.filter((t) => t.assigned_to === s.id && t.status !== "done" && t.due_date && new Date(t.due_date) < now).length,
      })),
    [staff, tasks, now],
  );

  async function handleStatusChange(id: string, status: TaskStatus) {
    try {
      await changeStatus(id, status);
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
  }

  function openCreateView() {
    setRenamingViewId(null);
    setNewViewName("");
    setSaveViewOpen(true);
  }

  function handleSubmitView() {
    if (!newViewName.trim()) return;
    if (renamingViewId) {
      const next = renameSavedView(savedViews, renamingViewId, newViewName);
      setSavedViews(next);
      saveSavedViews(localStorage, SAVED_VIEWS_STORAGE_KEY, next);
      toast(`Vue renommée "${newViewName.trim()}".`, "success");
    } else {
      const view = createSavedView(crypto.randomUUID(), newViewName, filters, new Date().toISOString());
      const next = [...savedViews, view];
      setSavedViews(next);
      saveSavedViews(localStorage, SAVED_VIEWS_STORAGE_KEY, next);
      toast(`Vue "${view.name}" enregistrée.`, "success");
    }
    setSaveViewOpen(false);
    setRenamingViewId(null);
    setNewViewName("");
  }

  async function handleCopyViewLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Lien copié.", "success");
    } catch {
      toast("Impossible de copier le lien.", "destructive");
    }
  }

  function toggleTypeChip(type: TaskType) {
    setFilters((f) => ({ ...f, types: f.types.includes(type) ? f.types.filter((t) => t !== type) : [...f.types, type] }));
  }

  const viewMenuActions = [
    { label: "Partager le lien de la vue", onClick: handleCopyViewLink },
    ...(activeSavedView
      ? [
          {
            label: "Dupliquer la vue",
            onClick: () => {
              const next = duplicateSavedView(savedViews, activeSavedView.id, crypto.randomUUID(), new Date().toISOString());
              setSavedViews(next);
              saveSavedViews(localStorage, SAVED_VIEWS_STORAGE_KEY, next);
              toast("Vue dupliquée.", "success");
            },
          },
          {
            label: "Renommer la vue",
            onClick: () => {
              setRenamingViewId(activeSavedView.id);
              setNewViewName(activeSavedView.name);
              setSaveViewOpen(true);
            },
          },
          {
            label: "Supprimer la vue",
            onClick: () => {
              const next = removeSavedView(savedViews, activeSavedView.id);
              setSavedViews(next);
              saveSavedViews(localStorage, SAVED_VIEWS_STORAGE_KEY, next);
              setFilters(EMPTY_TASK_FILTERS);
            },
            danger: true,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-3 p-6">
      <PageHeader
        kicker="Prospection · suivi des relances"
        title="Tâches"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setFocusOpen(true)} disabled={focusQueue.length === 0}>
              Dépiler ({focusQueue.length})
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              + Tâche
            </Button>
          </>
        }
      />

      <SavedViewTabs
        tabs={[
          ...SYSTEM_TABS.map((t) => ({ id: t.id, label: t.label, count: systemTabCounts[t.id] })),
          ...savedViews.map((v) => ({ id: v.id, label: v.name })),
        ]}
        activeId={activeSystemTabId ?? activeViewId ?? "all"}
        onSelect={(id) => {
          const systemTab = SYSTEM_TABS.find((t) => t.id === id);
          if (systemTab) {
            setFilters({ ...EMPTY_TASK_FILTERS, preset: systemTab.preset });
            return;
          }
          const target = savedViews.find((v) => v.id === id);
          if (target) setFilters(target.filters);
        }}
        onCreate={openCreateView}
        menuActions={viewMenuActions}
        extra={
          <div className="flex rounded-md border border-border p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded px-2 py-1 text-xs font-medium ${view === "list" ? "bg-secondary" : "text-muted-foreground"}`}
            >
              Liste
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`rounded px-2 py-1 text-xs font-medium ${view === "calendar" ? "bg-secondary" : "text-muted-foreground"}`}
            >
              Calendrier
            </button>
          </div>
        }
      />

      <Dialog open={saveViewOpen} onOpenChange={setSaveViewOpen}>
        <DialogHeader>
          <DialogTitle>{renamingViewId ? "Renommer la vue" : "Enregistrer la vue actuelle"}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <input
            autoFocus
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            placeholder="Nom de la vue…"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSaveViewOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmitView} disabled={!newViewName.trim()}>
            {renamingViewId ? "Renommer" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </Dialog>

      <QuickFilterChips
        chips={[
          { key: "call", label: "Appels", count: chipCounts.call, active: filters.types.includes("call") },
          { key: "email", label: "Emails", count: chipCounts.email, active: filters.types.includes("email") },
          { key: "meeting", label: "RDV", count: chipCounts.meeting, active: filters.types.includes("meeting") },
          { key: "data", label: "Données", count: chipCounts.data, active: filters.types.includes("data") },
          { key: "highPriority", label: "Priorité haute", count: chipCounts.highPriority, active: filters.highPriority },
          { key: "automationOnly", label: "Générées automatiquement", count: chipCounts.automationOnly, active: filters.automationOnly },
        ]}
        onToggle={(key) => {
          if (key === "call" || key === "email" || key === "meeting" || key === "data") toggleTypeChip(key);
          else if (key === "highPriority") setFilters((f) => ({ ...f, highPriority: !f.highPriority }));
          else if (key === "automationOnly") setFilters((f) => ({ ...f, automationOnly: !f.automationOnly }));
        }}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced((v) => !v)}
        hasActiveFilters={filters.types.length > 0 || filters.highPriority || filters.automationOnly}
        onReset={() => setFilters((f) => ({ ...f, types: [], highPriority: false, automationOnly: false }))}
      >
        <p className="text-xs text-muted-foreground">Pas de filtre avancé supplémentaire pour l'instant — les onglets et chips ci-dessus couvrent les critères réels disponibles.</p>
      </QuickFilterChips>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Charge de l'équipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {staffLoad.length === 0 && <p className="text-sm text-muted-foreground">Aucun membre du staff.</p>}
            {staffLoad.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-t border-border pt-2 text-sm first:border-0 first:pt-0">
                <span className="text-foreground">{s.name}</span>
                <span className="flex items-center gap-2">
                  <Badge variant="blue">{s.active} active(s)</Badge>
                  {s.overdue > 0 && <Badge variant="red">{s.overdue} en retard</Badge>}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Génération automatique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Des tâches peuvent être créées automatiquement par une automatisation (action "Créer une tâche"), visibles ici avec l'origine "Automatisation".
            </p>
            <Link to="/automations" className="text-sm text-accent hover:underline">
              Voir les règles dans Automatisations
            </Link>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!loading && !error && view === "calendar" && (
        <TaskCalendarView tasks={filteredTasks} onSelectTask={setEditingTask} />
      )}

      {!loading && !error && view === "list" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Assigné à</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Lié à</TableHead>
              <TableHead>Origine</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium text-foreground">
                  <button type="button" onClick={() => setEditingTask(t)} className="hover:underline">
                    {t.title}
                  </button>
                </TableCell>
                <TableCell>{t.task_type ? TASK_TYPE_LABELS[t.task_type] : "—"}</TableCell>
                <TableCell>{t.due_date ? new Date(t.due_date).toLocaleDateString("fr-FR") : "—"}</TableCell>
                <TableCell>{staff.find((s) => s.id === t.assigned_to)?.name ?? "—"}</TableCell>
                <TableCell>
                  {t.priority === "high" ? <Badge variant="red">Haute</Badge> : t.priority === "low" ? "Basse" : "Normale"}
                </TableCell>
                <TableCell>
                  {(() => {
                    const link = taskRelatedLink(t);
                    return link ? (
                      <Link to={link.to} className="hover:underline">
                        {link.label}
                      </Link>
                    ) : (
                      "—"
                    );
                  })()}
                </TableCell>
                <TableCell className="text-muted-foreground">{ORIGIN_LABELS[t.origin] ?? t.origin}</TableCell>
                <TableCell>
                  <select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}
                    className="rounded-md border border-border px-2 py-1 text-sm"
                  >
                    {ALL_TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {getTaskStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                  <Badge variant={getTaskStatusColor(t.status)} className="ml-2">
                    {getTaskStatusLabel(t.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filteredTasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Aucune tâche.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <AddTaskDialog open={addOpen} onOpenChange={setAddOpen} onCreated={create} />
      <EditTaskDialog
        task={editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        onUpdated={update}
      />
      <TaskFocusMode
        open={focusOpen}
        onOpenChange={setFocusOpen}
        tasks={focusQueue}
        onComplete={(id) => changeStatus(id, "done")}
        onReschedule={(id, dueDate) => update(id, { dueDate })}
      />
    </div>
  );
}
