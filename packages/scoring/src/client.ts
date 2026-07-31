import type { AnthropicMessagesClient } from "@dmh/claude-messages";
import { DEFAULT_MODEL } from "@dmh/claude-messages";

/**
 * Dupliqué structurellement plutôt qu'importé de "./prompt.js" : ce
 * fichier est importé directement par l'Edge Function Deno
 * (score-prospect), qui ne comprend pas le mapping bundler `.js` -> `.ts`
 * pour les imports internes au package (même contournement que
 * `@dmh/claude-messages/src/client.ts` pour `MessagePrompt`).
 */
interface ScoringPrompt {
  system: string;
  user: string;
}

/**
 * `minimum`/`maximum` sur un type "integer" ne sont pas supportés par
 * `output_config.format` (erreur 400 "properties maximum, minimum are not
 * supported" constatée en test réel) — le sous-ensemble de JSON Schema
 * accepté ici est plus restreint que le JSON Schema complet. La fourchette
 * 1-10 reste imposée via le prompt (voir prompt.ts), pas via ce schéma.
 */
const SCORE_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer" },
    justification: { type: "string" },
  },
  required: ["score", "justification"],
  additionalProperties: false,
} as const;

export interface ScoringResult {
  score: number;
  justification: string;
}

export class ScoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScoringError";
  }
}

/**
 * Appelle Claude avec une sortie structurée (`output_config.format`, même
 * pattern que `@dmh/claude-messages`) : le score et la justification sont
 * garantis conformes au schéma par le serveur, il ne reste qu'à parser le
 * JSON retourné.
 */
export async function scoreCompany(
  prompt: ScoringPrompt,
  options: { client: AnthropicMessagesClient; model?: string },
): Promise<ScoringResult> {
  const response = await options.client.messages.create({
    model: options.model ?? DEFAULT_MODEL,
    // Bug réel trouvé sur generate-messages (stop_reason: max_tokens avec
    // une marge trop juste) — même précaution ici par cohérence, même si
    // score+justification est plus court.
    max_tokens: 1024,
    system: prompt.system,
    messages: [{ role: "user", content: prompt.user }],
    output_config: {
      format: { type: "json_schema", schema: SCORE_SCHEMA },
    },
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new ScoringError(
      `Claude n'a pas retourné de contenu texte exploitable (stop_reason: ${response.stop_reason})`,
    );
  }

  try {
    return JSON.parse(textBlock.text) as ScoringResult;
  } catch {
    throw new ScoringError(
      `Réponse Claude non parsable en JSON malgré output_config.format : ${textBlock.text.slice(0, 200)}`,
    );
  }
}
