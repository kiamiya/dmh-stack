import { describe, expect, it } from "vitest";
import { BROWSER_ENV_PREFIXES, SERVER_ONLY_ENV, isExposedToBrowser } from "./browserEnv";

describe("variables exposées au navigateur", () => {
  it("aucun secret serveur n'est exposé", () => {
    for (const name of SERVER_ONLY_ENV) expect(isExposedToBrowser(name), name).toBe(false);
  });

  it("les variables lues par le CRM le sont", () => {
    for (const name of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_DEMO_MODE", "MICROSOFT_CLIENT_ID"]) {
      expect(isExposedToBrowser(name), name).toBe(true);
    }
  });

  it("l'ancien préfixe large « SUPABASE_ » aurait exposé la clé service_role", () => {
    expect(isExposedToBrowser("SUPABASE_SERVICE_ROLE_KEY", ["SUPABASE_"])).toBe(true);
    expect(BROWSER_ENV_PREFIXES).not.toContain("SUPABASE_");
  });
});
