import { useState } from "react";
import type { FormEvent } from "react";
import type { AutomationConditionOperator, AutomationEntityType, AutomationTriggerType } from "@dmh/types";
import { useClients } from "../hooks/useClients";
import { useAutomationRules } from "../hooks/useAutomationRules";
import { usePipelineStages } from "../hooks/usePipelineStages";
import { useStaffMembers } from "../hooks/useStaffMembers";
import { supabase } from "../lib/supabase";
import { addAction, addCondition } from "../services/automations";
import { validateAutomationRuleForm } from "../lib/automationForm";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useToast } from "../components/ui/toast";

const ENTITY_LABELS: Record<AutomationEntityType, string> = {
  contact: "Contact",
  company: "Entreprise",
  opportunity: "Opportunité",
  task: "Tâche",
};

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  record_created: "À la création",
  stage_changed: "Au changement d'étape",
};

const OPERATOR_LABELS: Record<AutomationConditionOperator, string> = {
  eq: "égal à",
  neq: "différent de",
  gt: "supérieur à",
  lt: "inférieur à",
  contains: "contient",
  is_set: "est renseigné",
};

interface ConditionDraft {
  field: string;
  operator: AutomationConditionOperator;
  value: string;
}

export function AutomationsPage() {
  const clients = useClients();
  const [clientId, setClientId] = useState("");
  const { rules, loading, create, toggle, remove } = useAutomationRules(clientId);
  const { stages } = usePipelineStages(clientId);
  const staff = useStaffMembers();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState<AutomationEntityType>("opportunity");
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>("stage_changed");
  const [toStageId, setToStageId] = useState("");
  const [conditions, setConditions] = useState<ConditionDraft[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [dueInDays, setDueInDays] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setConditions([]);
    setTaskTitle("");
    setDueInDays("");
    setAssignedTo("");
    setToStageId("");
  }

  function addConditionRow() {
    setConditions((prev) => [...prev, { field: "", operator: "eq", value: "" }]);
  }

  function updateConditionRow(index: number, patch: Partial<ConditionDraft>) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeConditionRow(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validateAutomationRuleForm({ name, entityType, triggerType });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!clientId) {
      setError("Le client DMH est requis.");
      return;
    }
    if (!taskTitle.trim()) {
      setError("Le titre de la tâche à créer est requis.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const rule = await create({
        clientId,
        name: name.trim(),
        entityType,
        triggerType,
        triggerConfig: triggerType === "stage_changed" && toStageId ? { to_stage_id: toStageId } : {},
      });

      for (const cond of conditions) {
        if (!cond.field.trim()) continue;
        await addCondition(supabase, {
          clientId,
          ruleId: rule.id,
          field: cond.field.trim(),
          operator: cond.operator,
          value: cond.operator === "is_set" ? true : cond.value,
        });
      }

      await addAction(supabase, {
        clientId,
        ruleId: rule.id,
        position: 1,
        actionType: "create_task",
        actionConfig: {
          title: taskTitle.trim(),
          ...(dueInDays.trim() && { due_in_days: Number(dueInDays) }),
          ...(assignedTo && { assigned_to: assignedTo }),
        },
      });

      toast(`Règle "${name.trim()}" créée.`, "success");
      reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-lg font-semibold text-foreground">Automatisations</h1>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Client DMH</label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="rounded-md border border-border px-3 py-2 text-sm"
        >
          <option value="">Choisir un client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {clientId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une règle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom de la règle"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value as AutomationEntityType)}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  >
                    {(Object.keys(ENTITY_LABELS) as AutomationEntityType[]).map((t) => (
                      <option key={t} value={t}>
                        {ENTITY_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <option value="record_created">{TRIGGER_LABELS.record_created}</option>
                    <option value="stage_changed" disabled={entityType !== "opportunity"}>
                      {TRIGGER_LABELS.stage_changed}
                    </option>
                  </select>
                </div>

                {triggerType === "stage_changed" && entityType === "opportunity" && (
                  <select
                    value={toStageId}
                    onChange={(e) => setToStageId(e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <option value="">Vers n'importe quelle étape</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        Vers "{s.name}"
                      </option>
                    ))}
                  </select>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Conditions (optionnel, toutes doivent être vraies)
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={addConditionRow}>
                      + Condition
                    </Button>
                  </div>
                  {conditions.map((cond, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={cond.field}
                        onChange={(e) => updateConditionRow(i, { field: e.target.value })}
                        placeholder="Champ (ex. deal_value, job_title)"
                        className="flex-1 rounded-md border border-border px-2 py-1.5 text-sm"
                      />
                      <select
                        value={cond.operator}
                        onChange={(e) => updateConditionRow(i, { operator: e.target.value as AutomationConditionOperator })}
                        className="rounded-md border border-border px-2 py-1.5 text-sm"
                      >
                        {(Object.keys(OPERATOR_LABELS) as AutomationConditionOperator[]).map((op) => (
                          <option key={op} value={op}>
                            {OPERATOR_LABELS[op]}
                          </option>
                        ))}
                      </select>
                      {cond.operator !== "is_set" && (
                        <input
                          value={cond.value}
                          onChange={(e) => updateConditionRow(i, { value: e.target.value })}
                          placeholder="Valeur"
                          className="flex-1 rounded-md border border-border px-2 py-1.5 text-sm"
                        />
                      )}
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeConditionRow(i)}>
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 rounded-md border border-border p-3">
                  <span className="text-xs font-medium text-muted-foreground">Action : créer une tâche</span>
                  <input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Titre de la tâche"
                    className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={dueInDays}
                      onChange={(e) => setDueInDays(e.target.value)}
                      placeholder="Échéance (jours, optionnel)"
                      className="rounded-md border border-border px-2 py-1.5 text-sm"
                    />
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="rounded-md border border-border px-2 py-1.5 text-sm"
                    >
                      <option value="">Non assignée</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={submitting}>
                  {submitting ? "…" : "Créer la règle"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Objet</TableHead>
                <TableHead>Déclencheur</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading &&
                rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-foreground">{r.name}</TableCell>
                    <TableCell>
                      <Badge>{ENTITY_LABELS[r.entity_type]}</Badge>
                    </TableCell>
                    <TableCell>{TRIGGER_LABELS[r.trigger_type]}</TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        onChange={(e) => toggle(r.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Aucune règle pour ce client.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
