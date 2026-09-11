import { describe, expect, it } from "vitest";
import { taskRelatedLink } from "./taskLinks";
import type { TaskRow } from "../services/tasks";

function baseTask(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: "t1",
    title: "Relancer",
    description: null,
    due_date: null,
    status: "to_do",
    assigned_to: null,
    contact_id: null,
    company_id: null,
    deal_id: null,
    task_type: null,
    priority: "normal",
    origin: "manual",
    contacts: null,
    companies: null,
    deals: null,
    ...overrides,
  };
}

describe("taskRelatedLink", () => {
  it("retourne le lien contact en priorité", () => {
    const task = baseTask({ contact_id: "c1", contacts: { first_name: "Alice", last_name: "Fictive" } });
    expect(taskRelatedLink(task)).toEqual({ label: "Alice Fictive", to: "/contacts/c1" });
  });

  it("retourne le lien entreprise si pas de contact", () => {
    const task = baseTask({ company_id: "co1", companies: { name: "ACME" } });
    expect(taskRelatedLink(task)).toEqual({ label: "ACME", to: "/companies/co1" });
  });

  it("retourne le lien opportunité si pas de contact ni d'entreprise", () => {
    const task = baseTask({ deal_id: "d1", deals: { company_name: "ACME", name: "Renouvellement" } });
    expect(taskRelatedLink(task)).toEqual({ label: "Renouvellement", to: "/opportunities/d1" });
  });

  it("retourne null si rien n'est lié", () => {
    expect(taskRelatedLink(baseTask())).toBeNull();
  });
});
