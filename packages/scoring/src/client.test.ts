import { describe, expect, it, vi } from "vitest";
import { ScoringError, scoreCompany } from "./client.js";
import type { ScoringResult } from "./client.js";
import type { AnthropicMessagesClient } from "@dmh/claude-messages";
import type { ScoringPrompt } from "./prompt.js";

const prompt: ScoringPrompt = { system: "system prompt", user: "user prompt" };

const validOutput: ScoringResult = { score: 8, justification: "Dirigeant récent, effectif dans la cible." };

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

describe("scoreCompany", () => {
  it("parse le texte JSON retourné par Claude en ScoringResult", async () => {
    const client = fakeClient({
      content: [{ type: "text", text: JSON.stringify(validOutput) }],
      stop_reason: "end_turn",
    });

    const result = await scoreCompany(prompt, { client });

    expect(result).toEqual(validOutput);
  });

  it("appelle messages.create avec le modèle par défaut et le schéma structuré", async () => {
    const client = fakeClient({
      content: [{ type: "text", text: JSON.stringify(validOutput) }],
      stop_reason: "end_turn",
    });

    await scoreCompany(prompt, { client });

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

    await scoreCompany(prompt, { client, model: "claude-opus-5" });

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-opus-5" }),
    );
  });

  it("lève ScoringError si aucun bloc texte n'est présent", async () => {
    const client = fakeClient({ content: [], stop_reason: "refusal" });

    await expect(scoreCompany(prompt, { client })).rejects.toBeInstanceOf(ScoringError);
    await expect(scoreCompany(prompt, { client })).rejects.toThrow(/refusal/);
  });

  it("lève ScoringError si le texte n'est pas un JSON valide", async () => {
    const client = fakeClient({
      content: [{ type: "text", text: "pas du json" }],
      stop_reason: "end_turn",
    });

    await expect(scoreCompany(prompt, { client })).rejects.toBeInstanceOf(ScoringError);
  });
});
