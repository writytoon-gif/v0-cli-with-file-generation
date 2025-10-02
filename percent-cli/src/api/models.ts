export const MODEL_ALIASES: Record<string, string> = {
  // Aliases requested in the spec
  gemini: "google/gemini-1.5-flash-8b",
  chatgpt: "openai/gpt-4o-mini",
  grok: "xai/grok-2",
  claude: "anthropic/claude-3.5-sonnet",
  // Extras
  sonnet: "anthropic/claude-3.5-sonnet",
  haiku: "anthropic/claude-3.5-haiku",
  o3: "openai/o3-mini",
  clude: "anthropic/claude-3.5-sonnet", // tolerate common misspelling
  // Support common grok-4 spellings by mapping to current Grok model
  "grok-4": "xai/grok-2",
  grok4: "xai/grok-2",
}

export function resolveModel(input?: string, fallback?: string): string {
  if (!input) return fallback || MODEL_ALIASES.chatgpt
  const lower = input.toLowerCase()
  return MODEL_ALIASES[lower] || input // allow full "provider/model" strings too
}
