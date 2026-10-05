export type AIProviderId =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'openrouter'
  | 'mistral'
  | 'huggingface';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProviderId;
  description: string;
  capabilities: ('text' | 'vision' | 'audio' | 'video' | 'thinking' | 'search' | 'maps' | 'tts')[];
  contextWindow?: string;
  isPopular?: boolean;
  isRecommended?: boolean;
}

export interface AIProvider {
  id: AIProviderId;
  name: string;
  description: string;
  isConfigured: boolean;
  models: AIModel[];
  envKeyName: string;
  websiteUrl: string;
}

export interface ChatMessageAttachment {
  name: string;
  mimeType: string;
  data: string; // base64
  size?: number;
  content?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelUsed?: string;
  providerUsed?: string;
  attachments?: ChatMessageAttachment[];
  reasoning?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  provider: AIProviderId;
  systemPrompt?: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIMemory {
  id: string;
  userId: string;
  category: 'preference' | 'project' | 'fact' | 'custom';
  content: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatorArtifact {
  id: string;
  userId: string;
  type: 'script' | 'youtube' | 'image' | 'video' | 'voice' | 'agent_task';
  title: string;
  prompt?: string;
  content: string;
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface UploadedFileItem {
  id: string;
  userId: string;
  name: string;
  size: number;
  mimeType: string;
  extractedText?: string;
  projectId?: string;
  dataUrl?: string;
  createdAt: string;
}

export interface YouTubePipelineResult {
  idea: string;
  format: 'shorts' | 'long_form';
  researchBrief: string;
  hook: string;
  fullScript: string;
  sceneBreakdown: { sceneNumber: number; visual: string; audio: string; duration: string }[];
  voiceScript: string;
  titleOptions: string[];
  description: string;
  keywords: string[];
  hashtags: string[];
  thumbnailPrompt: string;
  shortsVersion?: string;
}

export interface AgentTaskStep {
  step: number;
  tool: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
}

export interface AgentExecutionResult {
  task: string;
  plan: string[];
  steps: AgentTaskStep[];
  finalOutput: string;
  summary: string;
}

export interface UserSettings {
  defaultModel: string;
  defaultProvider: AIProviderId;
  enableThinking: boolean;
  enableGrounding: boolean;
  enableMemory: boolean;
  voiceName: string;
  voiceSpeed: number;
  theme: 'cyber-dark' | 'slate-dark' | 'midnight-blue';
}
