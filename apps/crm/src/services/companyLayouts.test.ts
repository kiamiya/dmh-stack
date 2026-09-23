import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCompanyLayout, saveCompanyLayout } from "./companyLayouts";
import { defaultCompanyLayout } from "../lib/companyLayout";

function stub(row: { layout: unknown } | null, upserts: unknown[] = []) {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: row, error: null }) }) }),
      upsert: (payload: unknown) => {
        upserts.push(payload);
        return Promise.resolve({ error: null });
      },
    }),
  } as unknown as SupabaseClient;
}

describe("companyLayouts", () => {
  it("sans composition enregistrée : défaut, non personnalisée", async () => {
    expect(await getCompanyLayout(stub(null), "c1")).toEqual({ layout: defaultCompanyLayout(), isCustom: false });
  });

  it("composition enregistrée mais corrompue : défaut, sans erreur", async () => {
    const r = await getCompanyLayout(stub({ layout: { version: 99 } }), "c1");
    expect(r.layout).toEqual(defaultCompanyLayout());
    expect(r.isCustom).toBe(true);
  });

  it("enregistre la composition du client", async () => {
    const upserts: unknown[] = [];
    await saveCompanyLayout(stub(null, upserts), "c1", defaultCompanyLayout(), "staff-1");
    expect(upserts[0]).toMatchObject({ client_id: "c1", updated_by: "staff-1", layout: defaultCompanyLayout() });
  });
});
