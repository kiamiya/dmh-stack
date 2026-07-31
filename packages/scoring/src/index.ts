export { extractScoringSignals } from "./signals.js";
export type { Representative, FinanceYear, ScoringSignals } from "./signals.js";

export { buildScoringPrompt, SYSTEM_PROMPT } from "./prompt.js";
export type { ScoringPromptInput, ScoringPrompt } from "./prompt.js";

export { scoreCompany, ScoringError } from "./client.js";
export type { ScoringResult } from "./client.js";
