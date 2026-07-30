import { describe, expect, it } from "vitest";
import {
  EnvValidationError,
  loadDropcontactFunctionEnv,
  loadGenerateMessagesFunctionEnv,
  loadPappersFunctionEnv,
  loadPharowImportEnv,
  loadPublicEnv,
  loadServerEnv,
  loadWebhookSmartleadFunctionEnv,
} from "./env.js";

const validSource = {
  SUPABASE_URL: "https://hkonylfpcstbvxswyxyh.supabase.co",
  SUPABASE_ANON_KEY: "fake-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
  ANTHROPIC_API_KEY: "fake-anthropic-key",
  PAPPERS_API_KEY: "fake-pappers-key",
  DROPCONTACT_API_KEY: "fake-dropcontact-key",
  SMARTLEAD_API_KEY: "fake-smartlead-key",
  SMARTLEAD_WEBHOOK_SECRET: "fake-smartlead-webhook-secret",
  LEMLIST_API_KEY: "fake-lemlist-key",
  BASE_DOMAIN: "dashboard.dmh.fr",
};

describe("loadServerEnv", () => {
  it("retourne l'environnement typé quand toutes les variables sont présentes", () => {
    const env = loadServerEnv(validSource);
    expect(env.SUPABASE_URL).toBe(validSource.SUPABASE_URL);
    expect(env.ANTHROPIC_API_KEY).toBe("fake-anthropic-key");
    expect(env.LEMLIST_API_KEY).toBe("fake-lemlist-key");
  });

  it("accepte VERCEL_URL absent (non fourni en local)", () => {
    const env = loadServerEnv(validSource);
    expect(env.VERCEL_URL).toBeUndefined();
  });

  it("lève EnvValidationError listant chaque variable manquante", () => {
    const { ANTHROPIC_API_KEY, LEMLIST_API_KEY, ...incomplete } = validSource;

    let caught: unknown;
    try {
      loadServerEnv(incomplete);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(EnvValidationError);
    const error = caught as EnvValidationError;
    expect(error.issues.some((issue) => issue.startsWith("ANTHROPIC_API_KEY"))).toBe(true);
    expect(error.issues.some((issue) => issue.startsWith("LEMLIST_API_KEY"))).toBe(true);
    // Les deux problèmes doivent être rapportés en une seule erreur, pas fail-fast.
    expect(error.issues.length).toBeGreaterThanOrEqual(2);
  });

  it("rejette une SUPABASE_URL invalide avec un message clair", () => {
    let caught: unknown;
    try {
      loadServerEnv({ ...validSource, SUPABASE_URL: "pas-une-url" });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(EnvValidationError);
    expect((caught as EnvValidationError).issues.some((issue) => issue.startsWith("SUPABASE_URL"))).toBe(
      true,
    );
  });

  it("rejette une source complètement vide", () => {
    expect(() => loadServerEnv({})).toThrow(EnvValidationError);
  });
});

describe("loadPublicEnv", () => {
  it("retourne uniquement les champs publics et jamais les secrets", () => {
    const env = loadPublicEnv(validSource);

    expect(env).toEqual({
      SUPABASE_URL: validSource.SUPABASE_URL,
      SUPABASE_ANON_KEY: validSource.SUPABASE_ANON_KEY,
      BASE_DOMAIN: validSource.BASE_DOMAIN,
    });

    // Aucune clé secrète ne doit fuiter dans l'objet retourné, même si elle
    // est présente dans la source d'entrée.
    expect(env).not.toHaveProperty("ANTHROPIC_API_KEY");
    expect(env).not.toHaveProperty("SUPABASE_SERVICE_ROLE_KEY");
    expect(env).not.toHaveProperty("SMARTLEAD_WEBHOOK_SECRET");
    expect(Object.keys(env).sort()).toEqual(["BASE_DOMAIN", "SUPABASE_ANON_KEY", "SUPABASE_URL"]);
  });

  it("lève une erreur si une variable publique manque, même avec tous les secrets présents", () => {
    const { BASE_DOMAIN, ...withoutBaseDomain } = validSource;
    expect(() => loadPublicEnv(withoutBaseDomain)).toThrow(EnvValidationError);
  });
});

describe("loadPappersFunctionEnv", () => {
  it("ne requiert que SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et PAPPERS_API_KEY", () => {
    const env = loadPappersFunctionEnv({
      SUPABASE_URL: validSource.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: validSource.SUPABASE_SERVICE_ROLE_KEY,
      PAPPERS_API_KEY: validSource.PAPPERS_API_KEY,
    });

    expect(env.PAPPERS_API_KEY).toBe("fake-pappers-key");
  });

  it("n'est jamais bloqué par l'absence de clés d'autres intégrations (ex: Smartlead)", () => {
    // Régression : enrich-pappers utilisait auparavant loadServerEnv, qui
    // exigeait SMARTLEAD_WEBHOOK_SECRET sans rapport avec Pappers — trouvé
    // en testant l'Edge Function contre l'API réelle le 2026-07-30.
    expect(() =>
      loadPappersFunctionEnv({
        SUPABASE_URL: validSource.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: validSource.SUPABASE_SERVICE_ROLE_KEY,
        PAPPERS_API_KEY: validSource.PAPPERS_API_KEY,
      }),
    ).not.toThrow();
  });

  it("lève EnvValidationError si PAPPERS_API_KEY manque", () => {
    expect(() =>
      loadPappersFunctionEnv({
        SUPABASE_URL: validSource.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: validSource.SUPABASE_SERVICE_ROLE_KEY,
      }),
    ).toThrow(EnvValidationError);
  });
});

describe("loadPharowImportEnv", () => {
  it("ne requiert que Supabase, pas de clé tierce (Pharow n'a pas d'API en Phase 1)", () => {
    const env = loadPharowImportEnv({
      SUPABASE_URL: validSource.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: validSource.SUPABASE_SERVICE_ROLE_KEY,
    });

    expect(env.SUPABASE_URL).toBe(validSource.SUPABASE_URL);
  });

  it("lève EnvValidationError si une des deux variables Supabase manque", () => {
    expect(() => loadPharowImportEnv({ SUPABASE_URL: validSource.SUPABASE_URL })).toThrow(
      EnvValidationError,
    );
  });
});

describe("loadDropcontactFunctionEnv", () => {
  it("ne requiert que Supabase + DROPCONTACT_API_KEY", () => {
    const env = loadDropcontactFunctionEnv({
      SUPABASE_URL: validSource.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: validSource.SUPABASE_SERVICE_ROLE_KEY,
      DROPCONTACT_API_KEY: validSource.DROPCONTACT_API_KEY,
    });

    expect(env.DROPCONTACT_API_KEY).toBe("fake-dropcontact-key");
  });

  it("n'est pas bloqué par l'absence de clés d'autres intégrations", () => {
    expect(() =>
      loadDropcontactFunctionEnv({
        SUPABASE_URL: validSource.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: validSource.SUPABASE_SERVICE_ROLE_KEY,
        DROPCONTACT_API_KEY: validSource.DROPCONTACT_API_KEY,
      }),
    ).not.toThrow();
  });

  it("lève EnvValidationError si DROPCONTACT_API_KEY manque", () => {
    expect(() =>
      loadDropcontactFunctionEnv({
        SUPABASE_URL: validSource.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: validSource.SUPABASE_SERVICE_ROLE_KEY,
      }),
    ).toThrow(EnvValidationError);
  });
});

describe("loadGenerateMessagesFunctionEnv", () => {
  it("ne requiert que Supabase + ANTHROPIC_API_KEY", () => {
    const env = loadGenerateMessagesFunctionEnv({
      SUPABASE_URL: validSource.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: validSource.SUPABASE_SERVICE_ROLE_KEY,
      ANTHROPIC_API_KEY: validSource.ANTHROPIC_API_KEY,
    });

    expect(env.ANTHROPIC_API_KEY).toBe("fake-anthropic-key");
  });

  it("n'est pas bloqué par l'absence de clés d'autres intégrations", () => {
    expect(() =>
      loadGenerateMessagesFunctionEnv({
        SUPABASE_URL: validSource.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: validSource.SUPABASE_SERVICE_ROLE_KEY,
        ANTHROPIC_API_KEY: validSource.ANTHROPIC_API_KEY,
      }),
    ).not.toThrow();
  });

  it("lève EnvValidationError si ANTHROPIC_API_KEY manque", () => {
    expect(() =>
      loadGenerateMessagesFunctionEnv({
        SUPABASE_URL: validSource.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: validSource.SUPABASE_SERVICE_ROLE_KEY,
      }),
    ).toThrow(EnvValidationError);
  });
});

describe("loadWebhookSmartleadFunctionEnv", () => {
  it("ne requiert que Supabase + SMARTLEAD_WEBHOOK_SECRET", () => {
    const env = loadWebhookSmartleadFunctionEnv({
      SUPABASE_URL: validSource.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: validSource.SUPABASE_SERVICE_ROLE_KEY,
      SMARTLEAD_WEBHOOK_SECRET: validSource.SMARTLEAD_WEBHOOK_SECRET,
    });

    expect(env.SMARTLEAD_WEBHOOK_SECRET).toBe("fake-smartlead-webhook-secret");
  });

  it("n'est pas bloqué par l'absence de SMARTLEAD_API_KEY (pas besoin d'appeler l'API pour recevoir un webhook)", () => {
    expect(() =>
      loadWebhookSmartleadFunctionEnv({
        SUPABASE_URL: validSource.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: validSource.SUPABASE_SERVICE_ROLE_KEY,
        SMARTLEAD_WEBHOOK_SECRET: validSource.SMARTLEAD_WEBHOOK_SECRET,
      }),
    ).not.toThrow();
  });

  it("lève EnvValidationError si SMARTLEAD_WEBHOOK_SECRET manque", () => {
    expect(() =>
      loadWebhookSmartleadFunctionEnv({
        SUPABASE_URL: validSource.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: validSource.SUPABASE_SERVICE_ROLE_KEY,
      }),
    ).toThrow(EnvValidationError);
  });
});
