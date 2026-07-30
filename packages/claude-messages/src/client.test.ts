import { describe, expect, it, vi } from "vitest";
import { MessageGenerationError, generateMessages } from "./client.js";
import type { AnthropicMessagesClient, GeneratedMessages } from "./client.js";
import type { MessagePrompt } from "./prompt.js";

const prompt: MessagePrompt = { system: "system prompt", user: "user prompt" };

const validOutput: GeneratedMessages = {
  email_subject: "Objet",
  email_body: "Corps de l'email.",
  linkedin_message: "Message LinkedIn court.",
  followup_email: "Relance J+7.",
};

function fakeClient(response: {
  content: Array<{ type: string; text?: string }>;
  stop_reason: string;
}): AnthropicMessagesClient {
  return {
    messages: {
      create: vi.fn(async () => response),
    },
  };
}

describe("generateMessages", () => {
  it("parse le texte JSON retourné par Claude en GeneratedMessages", async () => {
    const client = fakeClient({
      content: [{ type: "text", text: JSON.stringify(validOutput) }],
      stop_reason: "end_turn",
    });

    const result = await generateMessages(prompt, { client });

    expect(result).toEqual(validOutput);
  });

  it("appelle messages.create avec le modèle par défaut et le schéma structuré", async () => {
    const client = fakeClient({
      content: [{ type: "text", text: JSON.stringify(validOutput) }],
      stop_reason: "end_turn",
    });

    await generateMessages(prompt, { client });

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-5",
        system: "system prompt",
        messages: [{ role: "user", content: "user prompt" }],
        output_config: expect.objectContaining({
          format: expect.objectContaining({ type: "json_schema" }),
        }),
      }),
    );
  });

  it("utilise le modèle explicite si fourni", async () => {
    const client = fakeClient({
      content: [{ type: "text", text: JSON.stringify(validOutput) }],
      stop_reason: "end_turn",
    });

    await generateMessages(prompt, { client, model: "claude-opus-5" });

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-opus-5" }),
    );
  });

  it("lève MessageGenerationError si aucun bloc texte n'est présent", async () => {
    const client = fakeClient({ content: [], stop_reason: "refusal" });

    await expect(generateMessages(prompt, { client })).rejects.toBeInstanceOf(
      MessageGenerationError,
    );
    await expect(generateMessages(prompt, { client })).rejects.toThrow(/refusal/);
  });

  it("lève MessageGenerationError si le texte n'est pas un JSON valide", async () => {
    const client = fakeClient({
      content: [{ type: "text", text: "pas du json" }],
      stop_reason: "end_turn",
    });

    await expect(generateMessages(prompt, { client })).rejects.toBeInstanceOf(
      MessageGenerationError,
    );
  });
});
