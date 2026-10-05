import { AIModel, AIProvider, AIProviderId } from './types';

export const SUPPORTED_MODELS: AIModel[] = [
  // Google Gemini Models
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'gemini',
    description: 'Flagship fast multimodel with balanced speed, intelligence, and native grounding.',
    capabilities: ['text', 'vision', 'audio', 'search', 'tts'],
    contextWindow: '1M tokens',
    isPopular: true,
    isRecommended: true,
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Deep Thinking)',
    provider: 'gemini',
    description: 'Premier complex reasoning model with maximum thinking depth for math, coding, and architecture.',
    capabilities: ['text', 'vision', 'thinking'],
    contextWindow: '2M tokens',
    isPopular: true,
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash (Grounded Search & Maps)',
    provider: 'gemini',
    description: 'Optimized for live Google Search and Google Maps grounded real-time intelligence.',
    capabilities: ['text', 'search', 'maps'],
    contextWindow: '1M tokens',
    isPopular: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'gemini',
    description: 'Ultra-low latency model engineered for instant chat replies and high-throughput tasks.',
    capabilities: ['text'],
    contextWindow: '1M tokens',
  },
  {
    id: 'gemini-3.1-flash-image',
    name: 'Gemini Flash Image (Nano Banana 2)',
    provider: 'gemini',
    description: 'High-fidelity image generation and editing with custom aspect ratios (1:1, 16:9, 9:16).',
    capabilities: ['vision'],
  },
  {
    id: 'veo-3.1-fast-generate-preview',
    name: 'Google Veo 3 Video',
    provider: 'gemini',
    description: 'High-definition video generation from text prompts and initial photo frames.',
    capabilities: ['video'],
  },
  {
    id: 'gemini-3.8-flash-tts',
    name: 'Gemini 3.8 Flash Speech (TTS)',
    provider: 'gemini',
    description: 'Flagship studio voice synthesis with emotive style direction and dual-speaker dialogue.',
    capabilities: ['tts'],
  },

  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Omni)',
    provider: 'openai',
    description: 'OpenAI flagship multi-modal reasoning engine with vision and text intelligence.',
    capabilities: ['text', 'vision'],
    contextWindow: '128K tokens',
    isPopular: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Affordable, fast intelligence for everyday chat and creator scripting.',
    capabilities: ['text', 'vision'],
    contextWindow: '128K tokens',
  },
  {
    id: 'o3-mini',
    name: 'o3-mini (Reasoning)',
    provider: 'openai',
    description: 'OpenAI specialized deep reasoning model for STEM and logical tasks.',
    capabilities: ['text', 'thinking'],
    contextWindow: '200K tokens',
  },

  // Anthropic Claude
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    description: 'Hybrid reasoning and creative writing champion with nuanced style and tone.',
    capabilities: ['text', 'vision', 'thinking'],
    contextWindow: '200K tokens',
    isPopular: true,
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Rapid-fire creative copywriting, titles, and instant micro-scripts.',
    capabilities: ['text'],
    contextWindow: '200K tokens',
  },

  // Groq LPU
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Groq LPU)',
    provider: 'groq',
    description: 'Lightning-fast inference (>500 tokens/sec) on Groq LPUs for rapid brainstorming.',
    capabilities: ['text'],
    contextWindow: '128K tokens',
    isPopular: true,
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 (Groq Speed)',
    provider: 'groq',
    description: 'DeepSeek reasoning distilled on ultra-fast Groq hardware.',
    capabilities: ['text', 'thinking'],
    contextWindow: '128K tokens',
  },

  // OpenRouter Unified
  {
    id: 'openrouter/auto',
    name: 'OpenRouter Auto Router',
    provider: 'openrouter',
    description: 'Dynamic unified routing across hundreds of open-source and proprietary models.',
    capabilities: ['text'],
    contextWindow: 'Dynamic',
  },

  // Mistral AI
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large 2',
    provider: 'mistral',
    description: 'Top-tier European multilingual reasoning and precision code model.',
    capabilities: ['text'],
    contextWindow: '128K tokens',
  },

  // Hugging Face
  {
    id: 'meta-llama/Llama-3-8b-instruct',
    name: 'Hugging Face Inference (Llama 3)',
    provider: 'huggingface',
    description: 'Direct serverless inference API on open Hugging Face Hub checkpoints.',
    capabilities: ['text'],
    contextWindow: '8K tokens',
  },
];

export const SUPPORTED_PROVIDERS: AIProvider[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Built-in full-spectrum multimodal engine: Pro thinking, Flash speed, Search/Maps grounding, Imagen & Veo.',
    isConfigured: true, // Native server-side integration via GEMINI_API_KEY
    models: SUPPORTED_MODELS.filter((m) => m.provider === 'gemini'),
    envKeyName: 'GEMINI_API_KEY',
    websiteUrl: 'https://ai.google.dev',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4o Mini, and o3-mini reasoning engines.',
    isConfigured: false,
    models: SUPPORTED_MODELS.filter((m) => m.provider === 'openai'),
    envKeyName: 'OPENAI_API_KEY',
    websiteUrl: 'https://platform.openai.com',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude 3.7 Sonnet & 3.5 Haiku for advanced reasoning and creative literature.',
    isConfigured: false,
    models: SUPPORTED_MODELS.filter((m) => m.provider === 'anthropic'),
    envKeyName: 'ANTHROPIC_API_KEY',
    websiteUrl: 'https://anthropic.com',
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    description: 'Ultra-low latency LPU engine running open-weights Llama 3.3 and DeepSeek R1.',
    isConfigured: false,
    models: SUPPORTED_MODELS.filter((m) => m.provider === 'groq'),
    envKeyName: 'GROQ_API_KEY',
    websiteUrl: 'https://groq.com',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Unified multi-provider gateway with single-key access to 200+ models.',
    isConfigured: false,
    models: SUPPORTED_MODELS.filter((m) => m.provider === 'openrouter'),
    envKeyName: 'OPENROUTER_API_KEY',
    websiteUrl: 'https://openrouter.ai',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Mistral Large and Pixtral vision models with European privacy standards.',
    isConfigured: false,
    models: SUPPORTED_MODELS.filter((m) => m.provider === 'mistral'),
    envKeyName: 'MISTRAL_API_KEY',
    websiteUrl: 'https://mistral.ai',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Open-source model repository with serverless inference endpoints.',
    isConfigured: false,
    models: SUPPORTED_MODELS.filter((m) => m.provider === 'huggingface'),
    envKeyName: 'HUGGINGFACE_API_KEY',
    websiteUrl: 'https://huggingface.co',
  },
];

/**
 * Auto-Model Selector: evaluates prompt characteristics to select the most capable model
 */
export function resolveAutoModel(prompt: string, hasAttachments = false): { modelId: string; reason: string } {
  const lower = prompt.toLowerCase();

  // 1. Image generation intent
  if (lower.startsWith('/image') || lower.includes('generate an image') || lower.includes('draw a picture') || lower.includes('create an image')) {
    return { modelId: 'gemini-3.1-flash-image', reason: 'High-res image generation request detected' };
  }

  // 2. Video generation intent
  if (lower.startsWith('/video') || lower.includes('generate a video') || lower.includes('animate this') || lower.includes('create a video')) {
    return { modelId: 'veo-3.1-fast-generate-preview', reason: 'Veo video generation task detected' };
  }

  // 3. Multimodal with attachments (images, video, documents)
  if (hasAttachments) {
    return { modelId: 'gemini-3.1-pro-preview', reason: 'Multimodal document/visual analysis optimal with Gemini Pro' };
  }

  // 4. Current events / real-time / web facts -> Search Grounded
  if (
    lower.includes('today') ||
    lower.includes('latest news') ||
    lower.includes('current price') ||
    lower.includes('who won') ||
    lower.includes('release date') ||
    lower.includes('weather in') ||
    lower.includes('what happened')
  ) {
    return { modelId: 'gemini-3.5-flash', reason: 'Live real-time search grounding needed' };
  }

  // 5. Geographic / location / places -> Maps Grounded
  if (lower.includes('nearby') || lower.includes('directions to') || lower.includes('restaurants in') || lower.includes('best coffee in')) {
    return { modelId: 'gemini-3.5-flash', reason: 'Google Maps place grounding optimal' };
  }

  // 6. Deep reasoning, coding, math, architecture, complex planning
  if (
    lower.includes('code') ||
    lower.includes('algorithm') ||
    lower.includes('debug') ||
    lower.includes('refactor') ||
    lower.includes('math') ||
    lower.includes('derive') ||
    lower.includes('proof') ||
    lower.includes('architect') ||
    lower.includes('compare thoroughly')
  ) {
    return { modelId: 'gemini-3.1-pro-preview', reason: 'Complex STEM/Coding reasoning requires High Thinking mode' };
  }

  // 7. Ultra quick / short answers
  if (prompt.length < 40 && (lower.startsWith('hi') || lower.startsWith('hello') || lower.includes('quick question'))) {
    return { modelId: 'gemini-3.1-flash-lite', reason: 'Instant low-latency model for rapid interaction' };
  }

  // Default balanced
  return { modelId: 'gemini-3.8-flash', reason: 'Balanced flagship model for general assistance' };
}
