import { z } from "zod";

// Variables sûres pour un bundle frontend (dashboard client) : jamais de secret ici.
const publicEnvSchema = z.object({
  SUPABASE_URL: z.string().url({ message: "doit être une URL Supabase valide" }),
  SUPABASE_ANON_KEY: z.string().min(1, { message: "requis" }),
  BASE_DOMAIN: z.string().min(1, { message: "requis" }),
});

// Toutes les clés secrètes : Edge Functions, scripts, backend uniquement.
const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, { message: "requis" }),
  ANTHROPIC_API_KEY: z.string().min(1, { message: "requis" }),
  PAPPERS_API_KEY: z.string().min(1, { message: "requis" }),
  DROPCONTACT_API_KEY: z.string().min(1, { message: "requis" }),
  SMARTLEAD_API_KEY: z.string().min(1, { message: "requis" }),
  SMARTLEAD_WEBHOOK_SECRET: z.string().min(1, { message: "requis" }),
  WAALAXY_API_KEY: z.string().min(1, { message: "requis" }),
  // Injecté automatiquement par Vercel en production, absent en local.
  VERCEL_URL: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

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
