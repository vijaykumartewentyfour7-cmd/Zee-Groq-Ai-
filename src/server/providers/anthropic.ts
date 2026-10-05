import Anthropic from '@anthropic-ai/sdk';
import {
  AIProviderEngine,
  ProviderChatParams,
  ProviderChatResponse,
  ProviderHealthResult,
  ProviderModelInfo,
} from './types';

// Canonical active Claude models
export const CLAUDE_MODELS: ProviderModelInfo[] = [
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    description: 'Anthropic flagship hybrid model for advanced reasoning, code, and creative writing.',
    contextWindow: '200K tokens',
    capabilities: ['text', 'vision', 'thinking'],
    isRecommended: true,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'High-performance industry leader for coding, visual document processing, and nuanced prose.',
    contextWindow: '200K tokens',
    capabilities: ['text', 'vision'],
    isRecommended: true,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Fast, cost-efficient model for rapid chat, title generation, and quick scripting.',
    contextWindow: '200K tokens',
    capabilities: ['text', 'vision'],
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    description: 'Deep analytical model for complex academic synthesis and long-form analysis.',
    contextWindow: '200K tokens',
    capabilities: ['text', 'vision'],
  },
];

// Map common aliases to full versioned model IDs
function resolveClaudeModelId(model: string): string {
  const normalized = model.toLowerCase();
  if (normalized.includes('3-7-sonnet') || normalized.includes('3.7-sonnet')) {
    return 'claude-3-7-sonnet-20250219';
  }
  if (normalized.includes('3-5-sonnet') || normalized.includes('3.5-sonnet')) {
    return 'claude-3-5-sonnet-20241022';
  }
  if (normalized.includes('3-5-haiku') || normalized.includes('3.5-haiku') || normalized.includes('haiku')) {
    return 'claude-3-5-haiku-20241022';
  }
  if (normalized.includes('opus')) {
    return 'claude-3-opus-20240229';
  }
  // Check if it already matches a known full ID
  const found = CLAUDE_MODELS.find((m) => m.id === model);
  return found ? found.id : 'claude-3-7-sonnet-20250219';
}

export class AnthropicProviderEngine implements AIProviderEngine {
  id = 'anthropic';
  name = 'Anthropic Claude';

  private getClient(customKey?: string): Anthropic {
    const key = customKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error(
        'ANTHROPIC_API_KEY missing. Please configure it in your server environment variables or Settings > AI Providers.'
      );
    }
    return new Anthropic({
      apiKey: key,
      timeout: 45000,
      maxRetries: 2,
    });
  }

  isConfigured(customKey?: string): boolean {
    return Boolean(customKey || process.env.ANTHROPIC_API_KEY);
  }

  async models(customKey?: string): Promise<ProviderModelInfo[]> {
    return this.getModels(customKey);
  }

  capabilities(): ('text' | 'vision' | 'thinking' | 'audio' | 'video' | 'search' | 'maps' | 'tts')[] {
    return ['text', 'vision', 'thinking'];
  }

  async getModels(customKey?: string): Promise<ProviderModelInfo[]> {
    if (!this.isConfigured(customKey)) {
      return CLAUDE_MODELS;
    }
    try {
      const client = this.getClient(customKey);
      // Attempt dynamic discovery via Anthropic models API
      const response = await client.models.list();
      if (response && response.data && Array.isArray(response.data)) {
        const discovered = response.data
          .filter((m: any) => m.id.startsWith('claude-3'))
          .map((m: any) => {
            const known = CLAUDE_MODELS.find((k) => k.id === m.id);
            return {
              id: m.id,
              name: known ? known.name : m.display_name || m.id,
              description: known ? known.description : 'Official Anthropic Claude Model',
              contextWindow: '200K tokens',
              capabilities: ['text', 'vision'] as ('text' | 'vision')[],
              isRecommended: m.id.includes('3-7-sonnet') || m.id.includes('3-5-sonnet'),
            };
          });
        if (discovered.length > 0) {
          return discovered;
        }
      }
    } catch {
      // Fallback to static catalog if models.list is not available on key tier
    }
    return CLAUDE_MODELS;
  }

  private formatMessages(params: ProviderChatParams): {
    system: string;
    messages: Anthropic.MessageParam[];
  } {
    let system = params.systemPrompt || 'You are Claude, a helpful, honest, and sophisticated AI assistant inside Zee Grok AI.';
    if (params.memories && params.memories.length > 0) {
      const memContext = params.memories.map((m) => `- [${m.category || 'context'}]: ${m.content}`).join('\n');
      system += `\n\n[USER SAVED CONTEXT & MEMORIES]:\n${memContext}`;
    }

    const rawMessages = params.messages || [];
    const formatted: Anthropic.MessageParam[] = [];

    for (const msg of rawMessages) {
      if (msg.role === 'system') {
        system += `\n\n${msg.content}`;
        continue;
      }

      const contentBlocks: Anthropic.ContentBlockParam[] = [];

      // Multimodal image attachments
      if (msg.attachments && Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.data && att.mimeType && att.mimeType.startsWith('image/')) {
            const cleanBase64 = att.data.replace(/^data:[^;]+;base64,/, '');
            const mediaType = att.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
            contentBlocks.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: cleanBase64,
              },
            });
          } else if (att.content || (att.data && att.mimeType.startsWith('text/'))) {
            const txt = att.content || (att.data ? atob(att.data.replace(/^data:[^;]+;base64,/, '')) : '');
            if (txt) {
              contentBlocks.push({
                type: 'text',
                text: `[Attached File: ${att.name}]\n${txt}`,
              });
            }
          }
        }
      }

      if (msg.content) {
        contentBlocks.push({
          type: 'text',
          text: msg.content,
        });
      }

      // Anthropic does not allow empty content blocks
      if (contentBlocks.length === 0) {
        contentBlocks.push({ type: 'text', text: '...' });
      }

      const role = msg.role === 'assistant' ? 'assistant' : 'user';

      // Merge consecutive messages of the same role
      const last = formatted[formatted.length - 1];
      if (last && last.role === role) {
        if (Array.isArray(last.content)) {
          last.content = [...last.content, ...contentBlocks];
        } else {
          last.content = [{ type: 'text', text: last.content as string }, ...contentBlocks];
        }
      } else {
        formatted.push({
          role,
          content: contentBlocks,
        });
      }
    }

    // Ensure first message is user role
    if (formatted.length > 0 && formatted[0].role === 'assistant') {
      formatted.unshift({
        role: 'user',
        content: 'Hello',
      });
    }

    if (formatted.length === 0) {
      formatted.push({
        role: 'user',
        content: 'Hello',
      });
    }

    return { system, messages: formatted };
  }

  private handleError(err: any): Error {
    const status = err?.status || err?.statusCode;
    const msg = err?.message || String(err);

    if (msg.includes('ANTHROPIC_API_KEY missing')) {
      return new Error('ANTHROPIC_API_KEY missing. Please configure it in your server environment variables or Settings > AI Providers.');
    }
    if (status === 401 || msg.includes('401') || msg.includes('authentication') || msg.includes('invalid x-api-key') || msg.includes('api_key')) {
      return new Error('Invalid Anthropic API key. Please check your key in server environment or Settings > AI Providers.');
    }
    if (status === 529 || msg.includes('overloaded') || msg.includes('529') || msg.includes('unavailable')) {
      return new Error('Anthropic provider unavailable: Claude servers are temporarily overloaded (HTTP 529). Please retry.');
    }
    if (status === 404 || msg.includes('not_found_error') || msg.includes('model')) {
      return new Error(`Model unavailable: The requested Claude model could not be found or is not enabled for your account tier.`);
    }
    if (status === 429 || msg.includes('429') || msg.includes('rate_limit')) {
      return new Error('Rate limit reached: Anthropic Claude rate limit exceeded (HTTP 429). Please wait briefly before retrying.');
    }
    if (msg.includes('timeout') || err?.code === 'ETIMEDOUT' || msg.includes('timed out')) {
      return new Error('Request timeout: Anthropic API did not respond in time. Please try again.');
    }
    return new Error(`API request failed: ${msg.replace(/sk-ant-[a-zA-Z0-9_\-]+/g, 'sk-ant-***')}`);
  }

  async chat(params: ProviderChatParams): Promise<ProviderChatResponse> {
    const client = this.getClient(params.customApiKey);
    const model = resolveClaudeModelId(params.model);
    const { system, messages } = this.formatMessages(params);

    try {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system,
        messages,
      });

      let content = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          content += block.text;
        }
      }

      return {
        content,
        modelUsed: model,
        providerUsed: 'anthropic',
        tokens: {
          prompt: response.usage?.input_tokens,
          completion: response.usage?.output_tokens,
        },
      };
    } catch (err: any) {
      throw this.handleError(err);
    }
  }

  async stream(
    params: ProviderChatParams,
    onChunk: (chunk: { text: string; model: string; provider: string }) => void
  ): Promise<ProviderChatResponse> {
    const client = this.getClient(params.customApiKey);
    const model = resolveClaudeModelId(params.model);
    const { system, messages } = this.formatMessages(params);

    try {
      const stream = client.messages.stream({
        model,
        max_tokens: 4096,
        system,
        messages,
      });

      let fullText = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const chunkText = event.delta.text;
          fullText += chunkText;
          onChunk({
            text: chunkText,
            model,
            provider: 'anthropic',
          });
        }
      }

      const finalMessage = await stream.finalMessage();

      return {
        content: fullText,
        modelUsed: model,
        providerUsed: 'anthropic',
        tokens: {
          prompt: finalMessage.usage?.input_tokens,
          completion: finalMessage.usage?.output_tokens,
        },
      };
    } catch (err: any) {
      throw this.handleError(err);
    }
  }

  async healthCheck(customKey?: string): Promise<ProviderHealthResult> {
    if (!this.isConfigured(customKey)) {
      return {
        ok: false,
        status: 'FAILED',
        message: 'ANTHROPIC_API_KEY missing. Please configure it in your server environment variables or Settings > AI Providers.',
      };
    }

    const start = Date.now();
    try {
      const client = this.getClient(customKey);
      // Minimal safe probe request: 5 tokens on Haiku or Sonnet
      const res = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'ping' }],
      });
      const latencyMs = Date.now() - start;

      return {
        ok: true,
        status: 'CONNECTED',
        message: `Successfully connected to Anthropic Claude (${latencyMs}ms)`,
        latencyMs,
        models: CLAUDE_MODELS.map((m) => m.name),
      };
    } catch (err: any) {
      const formatted = this.handleError(err);
      return {
        ok: false,
        status: 'FAILED',
        message: formatted.message,
      };
    }
  }
}
