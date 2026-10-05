import { AIProviderEngine, ProviderChatParams, ProviderChatResponse } from './types';
import { GeminiProviderEngine } from './gemini';
import { AnthropicProviderEngine } from './anthropic';

export class ModelRouter {
  private engines: Map<string, AIProviderEngine> = new Map();

  constructor() {
    this.engines.set('gemini', new GeminiProviderEngine());
    this.engines.set('anthropic', new AnthropicProviderEngine());
  }

  getEngine(providerId: string): AIProviderEngine | undefined {
    return this.engines.get(providerId);
  }

  getAllEngines(): AIProviderEngine[] {
    return Array.from(this.engines.values());
  }

  // Detect which provider should handle this request
  resolveProviderAndModel(
    requestedProvider: string | undefined,
    requestedModel: string | undefined,
    prompt: string,
    hasAttachments: boolean,
    customKey?: string
  ): { providerId: string; modelId: string; reason: string } {
    const p = (requestedProvider || '').toLowerCase();
    const m = (requestedModel || '').toLowerCase();

    // 1. Explicit Anthropic / Claude request
    if (p === 'anthropic' || m.startsWith('claude-') || m.includes('claude')) {
      const anthropicEngine = this.engines.get('anthropic')!;
      if (!anthropicEngine.isConfigured(customKey)) {
        throw new Error(
          'ANTHROPIC_API_KEY is missing. Please configure it in your server environment variables or Settings > AI Providers to use Claude.'
        );
      }
      return {
        providerId: 'anthropic',
        modelId: requestedModel || 'claude-3-7-sonnet-20250219',
        reason: 'Explicitly routed to Anthropic Claude',
      };
    }

    // 2. Explicit Gemini request
    if (p === 'gemini' || m.startsWith('gemini-')) {
      return {
        providerId: 'gemini',
        modelId: requestedModel || 'gemini-3.8-flash',
        reason: 'Explicitly routed to Google Gemini',
      };
    }

    // 3. AUTO Model Mode
    if (p === 'auto' || m === 'auto' || !requestedProvider) {
      const anthropicEngine = this.engines.get('anthropic')!;
      const isAnthropicReady = anthropicEngine.isConfigured(customKey);
      const lower = prompt.toLowerCase();

      // If prompt asks for Claude or creative/prose writing and Anthropic is ready
      if (
        isAnthropicReady &&
        (lower.includes('claude') ||
          lower.includes('write an essay') ||
          lower.includes('novel') ||
          lower.includes('story') ||
          lower.includes('nuanced analysis'))
      ) {
        return {
          providerId: 'anthropic',
          modelId: 'claude-3-7-sonnet-20250219',
          reason: 'Auto Mode selected Claude 3.7 Sonnet for superior creative and nuanced reasoning',
        };
      }

      // Real-time facts / weather / news -> Gemini Search
      if (
        lower.includes('today') ||
        lower.includes('latest news') ||
        lower.includes('weather') ||
        lower.includes('price')
      ) {
        return {
          providerId: 'gemini',
          modelId: 'gemini-3.5-flash',
          reason: 'Auto Mode selected Gemini 3.5 Flash for live Google Search grounding',
        };
      }

      // Complex STEM, math, deep code -> Gemini 3.1 Pro Thinking (or Claude if preferred)
      if (
        lower.includes('code') ||
        lower.includes('algorithm') ||
        lower.includes('math') ||
        lower.includes('refactor')
      ) {
        if (isAnthropicReady && Math.random() > 0.5) {
          return {
            providerId: 'anthropic',
            modelId: 'claude-3-7-sonnet-20250219',
            reason: 'Auto Mode selected Claude 3.7 Sonnet for advanced coding architecture',
          };
        }
        return {
          providerId: 'gemini',
          modelId: 'gemini-3.1-pro-preview',
          reason: 'Auto Mode selected Gemini 3.1 Pro for High Thinking reasoning',
        };
      }

      // Default balanced flagship
      return {
        providerId: 'gemini',
        modelId: 'gemini-3.8-flash',
        reason: 'Auto Mode selected Gemini 3.8 Flash flagship engine',
      };
    }

    // Fallback: check other providers
    const customEngine = this.engines.get(p);
    if (customEngine && customEngine.isConfigured(customKey)) {
      return {
        providerId: p,
        modelId: requestedModel || 'default',
        reason: `Routed to ${p}`,
      };
    }

    throw new Error(
      `Provider '${requestedProvider}' is not configured. Please configure its API key in Settings > AI Providers or switch to Google Gemini or Anthropic Claude.`
    );
  }

  async chat(params: ProviderChatParams): Promise<ProviderChatResponse> {
    const latestUserPrompt =
      params.messages.filter((m) => m.role === 'user').pop()?.content || '';
    const hasAttachments = params.messages.some((m) => m.attachments && m.attachments.length > 0);

    const { providerId, modelId, reason } = this.resolveProviderAndModel(
      params.provider,
      params.model,
      latestUserPrompt,
      hasAttachments,
      params.customApiKey
    );

    const engine = this.engines.get(providerId);
    if (!engine) {
      throw new Error(`Engine for provider '${providerId}' not found.`);
    }

    try {
      const response = await engine.chat({
        ...params,
        model: modelId,
      });
      return {
        ...response,
        reason: response.reason || reason,
      };
    } catch (err: any) {
      // In AUTO mode, if Anthropic had an unexpected failure, gracefully fall back to Gemini
      const isAuto = !params.provider || params.provider === 'auto';
      if (isAuto && providerId !== 'gemini') {
        console.warn(`[ModelRouter] Provider ${providerId} failed in Auto mode (${err.message}), falling back to Gemini...`);
        const geminiEngine = this.engines.get('gemini')!;
        const fallbackModel = 'gemini-3.8-flash';
        const fallbackRes = await geminiEngine.chat({
          ...params,
          model: fallbackModel,
        });
        return {
          ...fallbackRes,
          reason: `Auto fallback from ${providerId} to Gemini: ${err.message}`,
        };
      }
      throw err;
    }
  }

  async stream(
    params: ProviderChatParams,
    onChunk: (chunk: { text: string; model: string; provider: string }) => void
  ): Promise<ProviderChatResponse> {
    const latestUserPrompt =
      params.messages.filter((m) => m.role === 'user').pop()?.content || '';
    const hasAttachments = params.messages.some((m) => m.attachments && m.attachments.length > 0);

    const { providerId, modelId, reason } = this.resolveProviderAndModel(
      params.provider,
      params.model,
      latestUserPrompt,
      hasAttachments,
      params.customApiKey
    );

    const engine = this.engines.get(providerId);
    if (!engine) {
      throw new Error(`Engine for provider '${providerId}' not found.`);
    }

    try {
      const response = await engine.stream(
        {
          ...params,
          model: modelId,
        },
        onChunk
      );
      return {
        ...response,
        reason: response.reason || reason,
      };
    } catch (err: any) {
      // In AUTO mode, if Anthropic failed before streaming began, fall back to Gemini
      const isAuto = !params.provider || params.provider === 'auto';
      if (isAuto && providerId !== 'gemini') {
        console.warn(`[ModelRouter] Provider ${providerId} stream error in Auto mode (${err.message}), falling back to Gemini...`);
        const geminiEngine = this.engines.get('gemini')!;
        const fallbackModel = 'gemini-3.8-flash';
        const fallbackRes = await geminiEngine.stream(
          {
            ...params,
            model: fallbackModel,
          },
          onChunk
        );
        return {
          ...fallbackRes,
          reason: `Auto fallback from ${providerId} to Gemini: ${err.message}`,
        };
      }
      throw err;
    }
  }
}

export const globalModelRouter = new ModelRouter();
