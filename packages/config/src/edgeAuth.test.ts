import { describe, expect, it, vi } from "vitest";
import { authorizeEnrichmentCaller, bearerToken, constantTimeEqual } from "./edgeAuth.js";

const SERVICE = "eyJservice.role.key";

function deps(overrides: Partial<Parameters<typeof authorizeEnrichmentCaller>[1]> = {}) {
  return {
    serviceRoleKey: SERVICE,
    resolveUserId: vi.fn(async (jwt: string) => (jwt === "staff-jwt" || jwt === "client-jwt" ? `user-${jwt}` : null)),
    isStaff: vi.fn(async (id: string) => id === "user-staff-jwt"),
    isServiceKey: vi.fn(async (token: string) => token === "vault-service-key"),
    ...overrides,
  };
}

describe("authorizeEnrichmentCaller", () => {
  it("refuse sans en-tête Authorization (401)", async () => {
    expect(await authorizeEnrichmentCaller(null, deps())).toEqual({ ok: false, status: 401, error: "Non authentifié" });
    expect((await authorizeEnrichmentCaller("Basic abc", deps())).ok).toBe(false);
  });

  it("accepte la clé service_role (automatisations pg_net) sans interroger l'auth", async () => {
    const d = deps();
    expect(await authorizeEnrichmentCaller(`Bearer ${SERVICE}`, d)).toEqual({ ok: true, caller: { kind: "service" } });
    expect(d.resolveUserId).not.toHaveBeenCalled();
  });

  it("accepte une autre clé service_role valide du projet (clé du Vault ≠ clé injectée)", async () => {
    expect(await authorizeEnrichmentCaller("Bearer vault-service-key", deps())).toEqual({ ok: true, caller: { kind: "service" } });
  });

  it("accepte un membre du staff connecté", async () => {
    expect(await authorizeEnrichmentCaller("Bearer staff-jwt", deps())).toEqual({
      ok: true,
      caller: { kind: "staff", userId: "user-staff-jwt" },
    });
  });

  it("refuse un utilisateur connecté qui n'est pas du staff (403)", async () => {
    expect(await authorizeEnrichmentCaller("Bearer client-jwt", deps())).toMatchObject({ ok: false, status: 403 });
  });

  it("refuse un jeton invalide, dont la clé anon (401)", async () => {
    expect(await authorizeEnrichmentCaller("Bearer anon-key", deps())).toMatchObject({ ok: false, status: 401 });
  });

  it("une clé service_role vide dans l'env ne laisse jamais passer un Bearer vide", async () => {
    expect((await authorizeEnrichmentCaller("Bearer ", deps({ serviceRoleKey: "" }))).ok).toBe(false);
  });
});

describe("helpers", () => {
  it("bearerToken", () => {
    expect(bearerToken("Bearer abc")).toBe("abc");
    expect(bearerToken("bearer  abc ")).toBe("abc");
    expect(bearerToken("Token abc")).toBeNull();
  });

  it("constantTimeEqual", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
  });
});
