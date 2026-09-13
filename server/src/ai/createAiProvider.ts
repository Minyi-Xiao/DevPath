import { createOpenAiProvider } from './openAiProvider';
import type { AiProvider } from './types';

let providerForTests: AiProvider | null = null;

export function setAiProviderForTests(provider: AiProvider | null) {
  providerForTests = provider;
}

export function createAiProvider(): AiProvider {
  return createOpenAiProvider();
}

export function getConfiguredAiProvider(): AiProvider {
  return providerForTests ?? createAiProvider();
}
