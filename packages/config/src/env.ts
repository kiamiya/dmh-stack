import { z } from "zod";

const requiredString = z.string().min(1, { message: "requis" });

const supabaseUrl = z.string().url({ message: "doit être une URL Supabase valide" });
const supabaseAnonKey = requiredString;
const supabaseServiceRoleKey = requiredString;
const anthropicApiKey = requiredString;
const pappersApiKey = requiredString;
const dropcontactApiKey = requiredString;
const smartleadApiKey = requiredString;
const smartleadWebhookSecret = requiredString;
const lemlistApiKey = requiredString;
const baseDomain = requiredString;

// Variables sûres pour un bundle frontend (dashboard client) : jamais de secret ici.
const publicEnvSchema = z.object({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: supabaseAnonKey,
  BASE_DOMAIN: baseDomain,
});

// Toutes les clés secrètes : utile pour un contexte qui a besoin de tout
// (scripts d'admin, tests d'intégration globaux). Pour une Edge Function
// qui n'a besoin que d'un sous-ensemble, préférer un loader scopé
// (ex. `loadPappersFunctionEnv`) plutôt que celui-ci — sinon une fonction
// sans rapport avec Smartlead se retrouve bloquée par l'absence de
// `SMARTLEAD_WEBHOOK_SECRET` (bug trouvé en testant `enrich-pappers`).
const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey,
  ANTHROPIC_API_KEY: anthropicApiKey,
  PAPPERS_API_KEY: pappersApiKey,
  DROPCONTACT_API_KEY: dropcontactApiKey,
  SMARTLEAD_API_KEY: smartleadApiKey,
  SMARTLEAD_WEBHOOK_SECRET: smartleadWebhookSecret,
  LEMLIST_API_KEY: lemlistApiKey,
  // Injecté automatiquement par Vercel en production, absent en local.
  VERCEL_URL: z.string().optional(),
});

// Ce dont l'Edge Function enrich-pappers a réellement besoin, rien de plus.
const pappersFunctionEnvSchema = z.object({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey,
  PAPPERS_API_KEY: pappersApiKey,
});

// Ce dont le script d'import CSV Pharow a besoin : Supabase uniquement,
// Pharow n'a pas d'API en Phase 1 (export CSV manuel, cf. brief §1.2.1).
const pharowImportEnvSchema = z.object({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey,
});

// Ce dont l'Edge Function enrich-dropcontact a réellement besoin.
const dropcontactFunctionEnvSchema = z.object({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey,
  DROPCONTACT_API_KEY: dropcontactApiKey,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PappersFunctionEnv = z.infer<typeof pappersFunctionEnvSchema>;
export type PharowImportEnv = z.infer<typeof pharowImportEnvSchema>;
export type DropcontactFunctionEnv = z.infer<typeof dropcontactFunctionEnvSchema>;

export type EnvSource = Record<string, string | undefined>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(
      `Variables d'environnement invalides ou manquantes :\n${issues
        .map((issue) => `  - ${issue}`)
        .join("\n")}`,
    );
    this.name = "EnvValidationError";
  }
}

function parseOrThrow<T>(schema: z.ZodType<T>, source: EnvSource): T {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join(".") || "(racine)"}: ${issue.message}`,
    );
    throw new EnvValidationError(issues);
  }
  return result.data;
}

/**
 * Valide et retourne les variables d'environnement sûres pour un bundle
 * frontend. Les champs non déclarés (secrets inclus) sont ignorés, jamais
 * exposés dans la valeur retournée, même s'ils sont présents dans `source`.
 */
export function loadPublicEnv(source: EnvSource): PublicEnv {
  return parseOrThrow(publicEnvSchema, source);
}

/**
 * Valide et retourne l'ensemble des variables d'environnement, y compris
 * les clés secrètes. Réservé aux Edge Functions, scripts et code serveur —
 * ne jamais appeler côté navigateur.
 *
 * `source` est injecté par l'appelant (`process.env` côté Node/Vite,
 * `Deno.env.toObject()` côté Edge Function Supabase) pour que cette
 * fonction reste pure et testable dans les deux runtimes.
 */
export function loadServerEnv(source: EnvSource): ServerEnv {
  return parseOrThrow(serverEnvSchema, source);
}

/**
 * Variante scopée pour l'Edge Function `enrich-pappers` : ne valide que ce
 * dont elle a besoin (Supabase + Pappers), pas les clés des autres
 * intégrations (Smartlead, Lemlist, etc.) qui lui sont sans rapport.
 */
export function loadPappersFunctionEnv(source: EnvSource): PappersFunctionEnv {
  return parseOrThrow(pappersFunctionEnvSchema, source);
}

/**
 * Variante scopée pour le script d'import CSV Pharow : Supabase uniquement.
 */
export function loadPharowImportEnv(source: EnvSource): PharowImportEnv {
  return parseOrThrow(pharowImportEnvSchema, source);
}

/**
 * Variante scopée pour l'Edge Function `enrich-dropcontact` : Supabase +
 * Dropcontact uniquement.
 */
export function loadDropcontactFunctionEnv(source: EnvSource): DropcontactFunctionEnv {
  return parseOrThrow(dropcontactFunctionEnvSchema, source);
}
