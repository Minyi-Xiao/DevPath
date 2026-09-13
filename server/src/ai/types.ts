export type AiProviderName = 'openai';

export type AiCompletionRequest = {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  abortSignal?: AbortSignal;
};

export type AiCompletionResult = {
  text: string;
};

export type AiProvider = {
  readonly name: AiProviderName;
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
};
