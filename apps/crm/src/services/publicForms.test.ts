import { describe, expect, it } from "vitest";
import { validateSubmission } from "@dmh/forms";
import { PublicFormError, submitPublicForm, toValidationInput } from "./publicForms";
import type { PublicFormField } from "./publicForms";

const publicFields: PublicFormField[] = [
  { id: "email", kind: "standard", key: "email", label: "E-mail", required: true },
  { id: "c1", kind: "custom", label: "Secteur", required: true, fieldType: "select", options: ["BTP"] },
];

describe("toValidationInput", () => {
  it("permet de valider dans le navigateur avec la règle du serveur", () => {
    const { fields, specs } = toValidationInput(publicFields);
    expect(validateSubmission(fields, { email: "a@b.fr", c1: "BTP" }, specs).errors).toEqual({});
    expect(validateSubmission(fields, { email: "a@b.fr", c1: "Autre" }, specs).errors).toEqual({ c1: "Choix invalide." });
  });
});

describe("submitPublicForm", () => {
  it("transmet réponses et champ piège ; erreurs par champ remontées", async () => {
    let sent: unknown = null;
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ error: "Formulaire incomplet", fields: { email: "Champ obligatoire." } }), { status: 400 });
    }) as unknown as typeof fetch;
    const err = await submitPublicForm("https://x", "contact", { email: "" }, "", fetchImpl).catch((e) => e);
    expect(sent).toEqual({ action: "submit", slug: "contact", values: { email: "" }, website: "" });
    expect(err).toBeInstanceOf(PublicFormError);
    expect(err.fields).toEqual({ email: "Champ obligatoire." });
  });
});
