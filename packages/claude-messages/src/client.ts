/**
 * Modèle utilisé pour la génération. Le brief (§1.3.1 étape 4) cite
 * "claude-sonnet-4-6" — un identifiant qui n'existe plus (voir la
 * documentation Claude API à jour). Le tiers Sonnet reste le bon choix
 * (le brief justifie ce choix par le coût à ce volume, ~0,003-0,005 €/msg),
 * seul l'identifiant change. Tracé comme écart au brief dans PROGRESS.md,
 * même principe que Waalaxy → Lemlist.
 */
export const DEFAULT_MODEL = "claude-sonnet-5";

export interface GeneratedMessages {
  email_subject: string;
  email_body: string;
  linkedin_message: string;
  followup_email: string;
}

const GENERATED_MESSAGES_SCHEMA = {
  type: "object",
  properties: {
    email_subject: { type: "string" },
    email_body: { type: "string" },
    linkedin_message: { type: "string" },
    followup_email: { type: "string" },
  },
  required: ["email_subject", "email_body", "linkedin_message", "followup_email"],
  additionalProperties: false,
} as const;

/**
 * Sous-ensemble du client Anthropic officiel réellement utilisé ici —
 * juste `messages.create`, la méthode la plus stable de l'API (contrairement
 * à `messages.parse()`, absente de certaines versions du SDK). Permet
 * d'injecter un client réel (`new Anthropic({ apiKey })`) en production et
 * un faux client en test, sans dépendre du SDK dans les tests unitaires.
 * La validation de forme vient de `output_config.format` côté serveur ;
 * on se contente ici de parser le JSON retourné.
 */
export interface AnthropicMessagesClient {
  messages: {
    create(params: Record<string, unknown>): Promise<{
      content: Array<{ type: string; text?: string }>;
      stop_reason: string;
    }>;
  };
}

export class MessageGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessageGenerationError";
  }
}

/**
 * Appelle Claude avec une sortie structurée (`output_config.format`, cf.
 * skill claude-api) : le serveur garantit que le texte retourné est un JSON
 * valide contre le schéma, il ne reste qu'à le parser.
 */
export async function generateMessages(
  prompt: { system: string; user: string },
  options: { client: AnthropicMessagesClient; model?: string },
): Promise<GeneratedMessages> {
  const response = await options.client.messages.create({
    model: options.model ?? DEFAULT_MODEL,
    max_tokens: 1024,
    system: prompt.system,
    messages: [{ role: "user", content: prompt.user }],
    output_config: {
      format: { type: "json_schema", schema: GENERATED_MESSAGES_SCHEMA },
    },
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new MessageGenerationError(
      `Claude n'a pas retourné de contenu texte exploitable (stop_reason: ${response.stop_reason})`,
    );
  }

  try {
    return JSON.parse(textBlock.text) as GeneratedMessages;
  } catch {
    throw new MessageGenerationError(
      `Réponse Claude non parsable en JSON malgré output_config.format : ${textBlock.text.slice(0, 200)}`,
    );
  }
}
