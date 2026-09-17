import { describe, expect, it, vi } from "vitest";
import { ImportColumnAnalysisError, analyzeImportColumns } from "./client.js";
import type { AnthropicMessagesClient, ColumnAnalysisSuggestion } from "./client.js";
import type { ImportColumnPrompt } from "./prompt.js";

const prompt: ImportColumnPrompt = { system: "system prompt", user: "user prompt" };

const validSuggestions: ColumnAnalysisSuggestion[] = [
  {
    column: "Secteur d'activité",
    suggestedAction: "create_new",
    existingFieldId: null,
    suggestedLabel: "Secteur d'activité",
    suggestedType: "text",
    confidence: 0.8,
    rationale: "Colonne libre décrivant le secteur, aucun champ existant ne correspond.",
  },
];

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

describe("analyzeImportColumns", () => {
  it("parse le tableau de suggestions retourné par Claude", async () => {
    const client = fakeClient({
      content: [{ type: "text", text: JSON.stringify({ suggestions: validSuggestions }) }],
      stop_reason: "end_turn",
    });

    const result = await analyzeImportColumns(prompt, { client });

    expect(result).toEqual(validSuggestions);
  });

  it("appelle messages.create avec le modèle par défaut et le schéma structuré", async () => {
    const client = fakeClient({
      content: [{ type: "text", text: JSON.stringify({ suggestions: validSuggestions }) }],
      stop_reason: "end_turn",
    });

    await analyzeImportColumns(prompt, { client });

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
      content: [{ type: "text", text: JSON.stringify({ suggestions: validSuggestions }) }],
      stop_reason: "end_turn",
    });

    await analyzeImportColumns(prompt, { client, model: "claude-opus-5" });

    expect(client.messages.create).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-opus-5" }));
  });

  it("lève ImportColumnAnalysisError si aucun bloc texte n'est présent", async () => {
    const client = fakeClient({ content: [], stop_reason: "refusal" });

    await expect(analyzeImportColumns(prompt, { client })).rejects.toBeInstanceOf(ImportColumnAnalysisError);
    await expect(analyzeImportColumns(prompt, { client })).rejects.toThrow(/refusal/);
  });

  it("lève ImportColumnAnalysisError si le texte n'est pas un JSON valide", async () => {
    const client = fakeClient({ content: [{ type: "text", text: "pas du json" }], stop_reason: "end_turn" });

    await expect(analyzeImportColumns(prompt, { client })).rejects.toBeInstanceOf(ImportColumnAnalysisError);
  });

  it("lève ImportColumnAnalysisError si `suggestions` n'est pas un tableau", async () => {
    const client = fakeClient({
      content: [{ type: "text", text: JSON.stringify({ suggestions: "pas un tableau" }) }],
      stop_reason: "end_turn",
    });

    await expect(analyzeImportColumns(prompt, { client })).rejects.toBeInstanceOf(ImportColumnAnalysisError);
  });
});
