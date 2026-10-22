/** Modelos oferecidos. O padrão é o primeiro; a troca por um mais barato é escolha da pessoa. */
export const AI_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'] as const;
export type AiModel = (typeof AI_MODELS)[number];
export const isAiModel = (v: unknown): v is AiModel => typeof v === 'string' && (AI_MODELS as readonly string[]).includes(v);
