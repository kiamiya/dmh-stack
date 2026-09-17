import type { ImportColumnPrompt } from "./prompt.js";

/**
 * Dupliqué depuis `@dmh/claude-messages` plutôt qu'importé — même choix
 * assumé que `packages/scoring` : les Edge Functions Deno n'ont pas le
 * mapping bundler `.js -> .ts` nécessaire pour un import cross-package
 * propre, donc chaque package qui appelle Claude redéfinit localement ce
 * dont il a besoin.
 */
export const DEFAULT_MODEL = "claude-sonnet-5";

export type SuggestedAction = "ignore" | "map_existing" | "create_new";

export interface ColumnAnalysisSuggestion {
  column: string;
  suggestedAction: SuggestedAction;
  existingFieldId: string | null;
  suggestedLabel: string | null;
  suggestedType: string | null;
  confidence: number;
  rationale: string;
}

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          column: { type: "string" },
          suggestedAction: { type: "string", enum: ["ignore", "map_existing", "create_new"] },
          existingFieldId: { type: ["string", "null"] },
          suggestedLabel: { type: ["string", "null"] },
          suggestedType: { type: ["string", "null"] },
          confidence: { type: "number" },
          rationale: { type: "string" },
        },
        required: [
          "column",
          "suggestedAction",
          "existingFieldId",
          "suggestedLabel",
          "suggestedType",
          "confidence",
          "rationale",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["suggestions"],
  additionalProperties: false,
} as const;

/**
 * Sous-ensemble du client Anthropic officiel réellement utilisé — voir
 * `packages/claude-messages/src/client.ts` pour la justification complète
 * (permet d'injecter un faux client en test sans dépendre du SDK).
 */
export interface AnthropicMessagesClient {
  messages: {
    create(params: Record<string, unknown>): Promise<{
      content: Array<{ type: string; text?: string }>;
      stop_reason: string;
    }>;
  };
}

export class ImportColumnAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportColumnAnalysisError";
  }
}

/**
 * Appelle Claude avec une sortie structurée (`output_config.format`) pour
 * analyser les colonnes non reconnues d'un import. Le serveur garantit que
 * le texte retourné est un JSON valide contre le schéma ; en cas de nombre
 * de suggestions différent des colonnes envoyées ou de suggestion absente
 * pour une colonne, c'est à l'appelant (le wizard côté CRM) de retomber sur
 * un comportement manuel colonne par colonne — cette fonction se contente
 * de retourner le tableau tel que reçu.
 */
export async function analyzeImportColumns(
  prompt: ImportColumnPrompt,
  options: { client: AnthropicMessagesClient; model?: string },
): Promise<ColumnAnalysisSuggestion[]> {
  const response = await options.client.messages.create({
    model: options.model ?? DEFAULT_MODEL,
    max_tokens: 2048,
    system: prompt.system,
    messages: [{ role: "user", content: prompt.user }],
    output_config: {
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new ImportColumnAnalysisError(
      `Claude n'a pas retourné de contenu texte exploitable (stop_reason: ${response.stop_reason})`,
    );
  }

  let parsed: { suggestions?: ColumnAnalysisSuggestion[] };
  try {
    parsed = JSON.parse(textBlock.text) as { suggestions?: ColumnAnalysisSuggestion[] };
  } catch {
    throw new ImportColumnAnalysisError(
      `Réponse Claude non parsable en JSON malgré output_config.format : ${textBlock.text.slice(0, 200)}`,
    );
  }

  if (!Array.isArray(parsed.suggestions)) {
    throw new ImportColumnAnalysisError(
      "Réponse Claude sans tableau `suggestions` exploitable malgré output_config.format",
    );
  }

  return parsed.suggestions;
}
