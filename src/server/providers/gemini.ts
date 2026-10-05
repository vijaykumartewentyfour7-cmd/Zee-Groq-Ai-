import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  AIProviderEngine,
  ProviderChatParams,
  ProviderChatResponse,
  ProviderHealthResult,
  ProviderModelInfo,
} from './types';

export const GEMINI_MODELS: ProviderModelInfo[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    description: 'Flagship fast multimodel with balanced speed, intelligence, and native grounding.',
    contextWindow: '1M tokens',
    capabilities: ['text', 'vision'],
    isRecommended: true,
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Deep Thinking)',
    description: 'Premier complex reasoning model with maximum thinking depth for math, coding, and architecture.',
    contextWindow: '2M tokens',
    capabilities: ['text', 'vision', 'thinking'],
    isRecommended: true,
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash (Grounded Search & Maps)',
    description: 'Optimized for live Google Search and Google Maps grounded real-time intelligence.',
    contextWindow: '1M tokens',
    capabilities: ['text'],
    isRecommended: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    description: 'Ultra-low latency model engineered for instant chat replies and high-throughput tasks.',
    contextWindow: '1M tokens',
    capabilities: ['text'],
  },
];

export class GeminiProviderEngine implements AIProviderEngine {
  id = 'gemini';
  name = 'Google Gemini';

  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  isConfigured(_customKey?: string): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  async models(): Promise<ProviderModelInfo[]> {
    return this.getModels();
  }

  capabilities(): ('text' | 'vision' | 'thinking' | 'audio' | 'video' | 'search' | 'maps' | 'tts')[] {
    return ['text', 'vision', 'thinking', 'audio', 'video', 'search', 'maps', 'tts'];
  }

  async getModels(): Promise<ProviderModelInfo[]> {
    return GEMINI_MODELS;
  }

  private formatContentsAndConfig(params: ProviderChatParams): {
    targetModel: string;
    contents: any[];
    config: any;
  } {
    let fullSystemInstruction =
      params.systemPrompt ||
      'You are Zee Grok AI, an ultra-intelligent, mobile-first multi-model AI assistant and creator studio companion.';
    if (params.memories && Array.isArray(params.memories) && params.memories.length > 0) {
      const memContext = params.memories.map((m) => `- [${m.category || 'context'}]: ${m.content}`).join('\n');
      fullSystemInstruction += `\n\n[USER CONTEXT & MEMORIES]:\n${memContext}`;
    }

    const contents: any[] = [];
    for (const msg of params.messages) {
      const parts: any[] = [];

      if (msg.attachments && Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.data && att.mimeType) {
            const cleanBase64 = att.data.replace(/^data:[^;]+;base64,/, '');
            parts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: cleanBase64,
              },
            });
          }
        }
      }

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }

    let targetModel = params.model || 'gemini-3.8-flash';
    if (!targetModel.startsWith('gemini-')) {
      targetModel = 'gemini-3.8-flash';
    }

    const config: any = {
      systemInstruction: fullSystemInstruction,
    };

    if (params.enableMaps) {
      targetModel = 'gemini-3.5-flash';
      config.tools = [{ googleMaps: {} }];
    } else if (params.enableSearch) {
      targetModel = 'gemini-3.5-flash';
      config.tools = [{ googleSearch: {} }];
    }

    if (params.enableThinking || targetModel === 'gemini-3.1-pro-preview') {
      targetModel = 'gemini-3.1-pro-preview';
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    return { targetModel, contents, config };
  }

  async chat(params: ProviderChatParams): Promise<ProviderChatResponse> {
    const { targetModel, contents, config } = this.formatContentsAndConfig(params);

    try {
      const response = await this.ai.models.generateContent({
        model: targetModel,
        contents,
        config,
      });

      return {
        content: response.text || '',
        modelUsed: targetModel,
        providerUsed: 'gemini',
      };
    } catch (err: any) {
      // Fallback for transient 503/429
      const errMsg = err?.message || String(err);
      if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
        const fallback = targetModel === 'gemini-3.5-flash' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash';
        const response = await this.ai.models.generateContent({
          model: fallback,
          contents,
          config,
        });
        return {
          content: response.text || '',
          modelUsed: fallback,
          providerUsed: 'gemini',
        };
      }
      throw err;
    }
  }

  async stream(
    params: ProviderChatParams,
    onChunk: (chunk: { text: string; model: string; provider: string }) => void
  ): Promise<ProviderChatResponse> {
    const { targetModel, contents, config } = this.formatContentsAndConfig(params);

    const stream = await this.ai.models.generateContentStream({
      model: targetModel,
      contents,
      config,
    });

    let fullText = '';
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk({ text, model: targetModel, provider: 'gemini' });
      }
    }

    return {
      content: fullText,
      modelUsed: targetModel,
      providerUsed: 'gemini',
    };
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const start = Date.now();
    try {
      const res = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: 'ping',
      });
      const latencyMs = Date.now() - start;
      return {
        ok: true,
        status: 'CONNECTED',
        message: `Successfully connected to Google Gemini (${latencyMs}ms)`,
        latencyMs,
        models: GEMINI_MODELS.map((m) => m.name),
      };
    } catch (err: any) {
      return {
        ok: false,
        status: 'FAILED',
        message: err?.message || 'Gemini probe request failed',
      };
    }
  }
}
