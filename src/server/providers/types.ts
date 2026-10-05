export interface ProviderMessageAttachment {
  name: string;
  mimeType: string;
  data: string; // base64
  size?: number;
  content?: string;
}

export interface ProviderMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: ProviderMessageAttachment[];
}

export interface ProviderChatParams {
  messages: ProviderMessage[];
  model: string;
  provider?: string;
  systemPrompt?: string;
  stream?: boolean;
  enableThinking?: boolean;
  enableSearch?: boolean;
  enableMaps?: boolean;
  memories?: { category?: string; content: string }[];
  customApiKey?: string;
}

export interface ProviderChatResponse {
  content: string;
  modelUsed: string;
  providerUsed: string;
  reasoning?: string;
  tokens?: { prompt?: number; completion?: number };
}

export interface ProviderModelInfo {
  id: string;
  name: string;
  description: string;
  contextWindow?: string;
  capabilities: ('text' | 'vision' | 'thinking')[];
  isRecommended?: boolean;
}

export interface ProviderHealthResult {
  ok: boolean;
  status: 'CONNECTED' | 'FAILED' | 'MISSING_KEY';
  message: string;
  latencyMs?: number;
  models?: string[];
}

export interface AIProvider {
  id: string;
  name: string;
  models(customKey?: string): Promise<ProviderModelInfo[]>;
  chat(params: ProviderChatParams): Promise<ProviderChatResponse>;
  stream(
    params: ProviderChatParams,
    onChunk: (chunk: { text: string; model: string; provider: string }) => void
  ): Promise<ProviderChatResponse>;
  capabilities(): ('text' | 'vision' | 'thinking' | 'audio' | 'video' | 'search' | 'maps' | 'tts')[];
  healthCheck(customKey?: string): Promise<ProviderHealthResult>;
  isConfigured(customKey?: string): boolean;
}

export interface AIProviderEngine extends AIProvider {
  getModels(customKey?: string): Promise<ProviderModelInfo[]>;
}
