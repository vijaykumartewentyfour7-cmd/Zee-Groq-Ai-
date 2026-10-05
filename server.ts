import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, GenerateVideosOperation } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini Server Client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Human-friendly error formatter
function formatErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  const msg = error.message || String(error);
  try {
    const parsed = JSON.parse(msg);
    if (parsed.error?.message) return parsed.error.message;
    if (parsed.message) return parsed.message;
  } catch {}
  return msg;
}

// Resilient generateContent with automatic retry & fallback for transient 503/429 spikes
async function generateContentWithFallback(params: {
  model: string;
  contents: any;
  config?: any;
}) {
  try {
    return await ai.models.generateContent(params);
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (
      errMsg.includes('503') ||
      errMsg.includes('high demand') ||
      errMsg.includes('UNAVAILABLE') ||
      errMsg.includes('429')
    ) {
      console.warn(`Model ${params.model} experiencing temporary load, routing to backup engine...`);
      const fallbackModel =
        params.model === 'gemini-3.5-flash' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash';
      return await ai.models.generateContent({
        ...params,
        model: fallbackModel,
      });
    }
    throw err;
  }
}

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(apiKey),
    version: '1.0.0',
    app: 'Zee Grok AI',
  });
});

// Providers configuration status
app.get('/api/providers/status', (_req: Request, res: Response) => {
  res.json({
    providers: [
      { id: 'gemini', name: 'Google Gemini', configured: Boolean(apiKey), isNative: true },
      { id: 'openai', name: 'OpenAI', configured: Boolean(process.env.OPENAI_API_KEY) },
      { id: 'anthropic', name: 'Anthropic Claude', configured: Boolean(process.env.ANTHROPIC_API_KEY) },
      { id: 'groq', name: 'Groq Cloud', configured: Boolean(process.env.GROQ_API_KEY) },
      { id: 'openrouter', name: 'OpenRouter', configured: Boolean(process.env.OPENROUTER_API_KEY) },
      { id: 'mistral', name: 'Mistral AI', configured: Boolean(process.env.MISTRAL_API_KEY) },
      { id: 'huggingface', name: 'Hugging Face', configured: Boolean(process.env.HUGGINGFACE_API_KEY) },
    ],
  });
});

// ==========================================
// 1. AI CHAT ENDPOINT (Streaming & Normal)
// ==========================================
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      messages,
      model = 'gemini-3.8-flash',
      provider = 'gemini',
      enableThinking = false,
      enableSearch = false,
      enableMaps = false,
      systemPrompt = '',
      memories = [],
      stream = true,
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    // Check if custom provider with key or fallback
    if (provider !== 'gemini') {
      const customKey = req.headers['x-custom-api-key'] as string;
      const envKey = process.env[`${provider.toUpperCase()}_API_KEY`];
      const activeKey = customKey || envKey;

      if (!activeKey) {
        // Return clear error instructions for connecting external provider
        res.status(400).json({
          error: `Provider '${provider}' requires an API key. Please configure ${provider.toUpperCase()}_API_KEY in your environment or Settings > API Manager, or switch to Google Gemini (which is fully configured and ready).`,
          providerUnavailable: true,
        });
        return;
      }
    }

    // Prepare system instruction with user memories
    let fullSystemInstruction = systemPrompt || 'You are Zee Grok AI, an ultra-intelligent, mobile-first multi-model AI assistant and creator studio companion. You are direct, sharp, witty, exceptionally capable at creative generation, coding, analysis, and YouTube production.';
    if (memories && Array.isArray(memories) && memories.length > 0) {
      const memContext = memories.map((m: any) => `- [${m.category || 'context'}]: ${m.content}`).join('\n');
      fullSystemInstruction += `\n\n[USER CONTEXT & MEMORIES]:\n${memContext}\nAlways adapt to the user's saved preferences and context where relevant.`;
    }

    // Build Gemini contents array
    const contents: any[] = [];
    for (const msg of messages) {
      const parts: any[] = [];

      // Attachments (multimodal: images, audio, video, text/docs)
      if (msg.attachments && Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.data && att.mimeType) {
            // Strip base64 prefix if present
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

    // Select Gemini model
    let targetModel = model;
    if (!targetModel.startsWith('gemini-')) {
      targetModel = 'gemini-3.8-flash';
    }

    // Configure tools & thinking
    const config: any = {
      systemInstruction: fullSystemInstruction,
    };

    // Tools: Maps vs Search (cannot be combined)
    if (enableMaps) {
      targetModel = 'gemini-3.5-flash';
      config.tools = [{ googleMaps: {} }];
    } else if (enableSearch) {
      targetModel = 'gemini-3.5-flash';
      config.tools = [{ googleSearch: {} }];
    }

    // Thinking mode for Gemini 3 series
    if (enableThinking || targetModel === 'gemini-3.1-pro-preview') {
      targetModel = 'gemini-3.1-pro-preview';
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      // Note: do NOT set maxOutputTokens with thinking
    }

    if (stream) {
      // SSE streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const responseStream = await ai.models.generateContentStream({
        model: targetModel,
        contents,
        config,
      });

      let fullText = '';
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          res.write(`data: ${JSON.stringify({ text, model: targetModel })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true, fullText, model: targetModel })}\n\n`);
      res.end();
    } else {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config,
      });

      res.json({
        content: response.text || '',
        modelUsed: targetModel,
        providerUsed: 'gemini',
      });
    }
  } catch (error: any) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Chat generation failed' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
});

// ==========================================
// 2. IMAGE STUDIO ENDPOINT (Create & Edit)
// ==========================================
app.post('/api/image/generate', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      aspectRatio = '1:1',
      baseImage, // base64 string for image-to-image editing
      mimeType = 'image/png',
      stylePreset,
    } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    let enrichedPrompt = prompt;
    if (stylePreset) {
      enrichedPrompt = `${prompt}, in ${stylePreset} aesthetic, highly detailed, 4k masterpiece`;
    }

    const validAspectRatios = ['1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '3:2', '21:9', '1:4', '1:8', '4:1', '8:1'];
    const chosenAspect = validAspectRatios.includes(aspectRatio) ? aspectRatio : '1:1';

    const parts: any[] = [];

    // Image-to-Image editing support
    if (baseImage) {
      const cleanData = baseImage.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          data: cleanData,
          mimeType,
        },
      });
      parts.push({ text: `Edit instructions: ${enrichedPrompt}` });
    } else {
      parts.push({ text: enrichedPrompt });
    }

    // Call generateContent with gemini-3.1-flash-image
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: chosenAspect as any,
          imageSize: '1K',
        },
      },
    });

    let imageUrl = '';
    let responseText = '';

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        } else if (part.text) {
          responseText = part.text;
        }
      }
    }

    if (!imageUrl) {
      // Fallback: Check if flash-lite-image returns result
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: { parts: [{ text: enrichedPrompt }] },
      });
      const fbCandidate = fallbackResponse.candidates?.[0];
      if (fbCandidate?.content?.parts) {
        for (const p of fbCandidate.content.parts) {
          if (p.inlineData) {
            imageUrl = `data:${p.inlineData.mimeType || 'image/png'};base64,${p.inlineData.data}`;
          }
        }
      }
    }

    if (!imageUrl) {
      res.status(500).json({ error: 'Image generation completed without image data', details: responseText });
      return;
    }

    res.json({
      imageUrl,
      prompt: enrichedPrompt,
      aspectRatio: chosenAspect,
      text: responseText,
    });
  } catch (error: any) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
});

// ==========================================
// 3. VEO VIDEO STUDIO (3-Step Async POST)
// ==========================================
// Step 1: Start Video Generation
app.post('/api/video/generate', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      startingImage, // base64 string for photo-to-video animation
      aspectRatio = '16:9',
      resolution = '720p',
    } = req.body;

    if (!prompt && !startingImage) {
      res.status(400).json({ error: 'Prompt or starting image is required' });
      return;
    }

    const validAspect = aspectRatio === '9:16' ? '9:16' : '16:9';
    const videoConfig: any = {
      numberOfVideos: 1,
      resolution: resolution === '1080p' ? '1080p' : '720p',
      aspectRatio: validAspect,
    };

    let operation;
    if (startingImage) {
      const cleanBytes = startingImage.replace(/^data:[^;]+;base64,/, '');
      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Animate this photo with cinematic camera movement and lifelike motion',
        image: {
          imageBytes: cleanBytes,
          mimeType: 'image/png',
        },
        config: videoConfig,
      });
    } else {
      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: videoConfig,
      });
    }

    res.json({
      operationName: operation.name,
      status: 'started',
      aspectRatio: validAspect,
    });
  } catch (error: any) {
    console.error('Video generation start error:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate video generation' });
  }
});

// Step 2: Poll Video Status
app.post('/api/video/status', async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      res.status(400).json({ error: 'operationName is required' });
      return;
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    res.json({
      done: updated.done || false,
      error: updated.error || null,
    });
  } catch (error: any) {
    console.error('Video status error:', error);
    res.status(500).json({ error: error.message || 'Failed to check video status' });
  }
});

// Step 3: Download Generated Video
app.post('/api/video/download', async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      res.status(400).json({ error: 'operationName is required' });
      return;
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      res.status(404).json({ error: 'Video URI not found in completed operation' });
      return;
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'inline; filename="zeegrok-video.mp4"');

    const arrayBuffer = await videoRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error('Video download error:', error);
    res.status(500).json({ error: error.message || 'Failed to download generated video' });
  }
});

// ==========================================
// 4. AI VOICE STUDIO (TTS)
// ==========================================
app.post('/api/audio/tts', async (req: Request, res: Response) => {
  try {
    const {
      text,
      voiceName = 'Zephyr',
      style = 'Clear, engaging modern voice',
      model = 'gemini-3.8-flash-tts',
    } = req.body;

    if (!text) {
      res.status(400).json({ error: 'Text is required for speech synthesis' });
      return;
    }

    // Supported voices: Puck, Charon, Kore, Fenrir, Zephyr
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Zephyr';

    const response = await ai.models.generateContent({
      model: model === 'gemini-3.8-flash-lite-tts' ? 'gemini-3.8-flash-lite-tts' : 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    // Unary default returns a complete WAV file in inlineData
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      res.status(500).json({ error: 'Speech generation returned no audio data' });
      return;
    }

    res.json({
      audioUrl: `data:audio/wav;base64,${base64Audio}`,
      base64Audio,
      voice: chosenVoice,
      textLength: text.length,
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error.message || 'Speech synthesis failed' });
  }
});

// ==========================================
// 5. AUDIO TRANSCRIPTION (STT)
// ==========================================
app.post('/api/audio/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;
    if (!audioData) {
      res.status(400).json({ error: 'audioData is required' });
      return;
    }

    const cleanBase64 = audioData.replace(/^data:[^;]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          { text: 'Transcribe this spoken audio accurately. Output only the transcribed text.' },
        ],
      },
    });

    res.json({
      transcript: response.text || '',
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message || 'Transcription failed' });
  }
});

// ==========================================
// 6. CREATOR STUDIO GENERATORS
// ==========================================
app.post('/api/creator/generate', async (req: Request, res: Response) => {
  try {
    const { toolType, topic, format, targetAudience, tone, customInputs } = req.body;

    let systemInstruction = 'You are the Elite AI Creator Studio engine for Zee Grok AI. You specialize in viral content creation, high-retention storytelling, click-worthy titles, and high-converting scripts.';
    let prompt = '';

    switch (toolType) {
      case 'script':
        prompt = `Generate a complete production script for:
Format: ${format || 'YouTube long-form'}
Topic: ${topic}
Audience: ${targetAudience || 'General creator audience'}
Tone: ${tone || 'Engaging, fast-paced, high retention'}

Include:
1. Retention-engineered 5-second Hook
2. Pattern Interrupt
3. Core Narrative with Visual B-roll cues in brackets [Visual: ...]
4. Call to Action (CTA)
5. Outro punchline.`;
        break;

      case 'hook':
        prompt = `Generate 7 viral, high-retention hooks for: "${topic}".
Include psychological triggers: Curiosity Gap, Fear of Missing Out, Counter-Intuitive Truth, and Story opener. Rank them by retention score (1-100).`;
        break;

      case 'title':
        prompt = `Generate 10 irresistible, high-CTR YouTube / Social Media titles for: "${topic}".
Target Audience: ${targetAudience || 'YouTube viewers'}
Categorize into: Curiosity-driven, Negative emotion/Urgency, Listicle/Framework, and Bold Claims.`;
        break;

      case 'description_seo':
        prompt = `Write an optimized YouTube video description and SEO package for:
Title/Topic: "${topic}"
Include:
- 2-sentence hook above the "Show More" fold
- Detailed 3-paragraph summary with natural keyword placement
- Timestamps outline placeholder
- 15 high-search-volume keywords
- 10 trending hashtags (#...)`;
        break;

      case 'content_calendar':
        prompt = `Create a 14-day viral content publishing calendar for a creator in the niche: "${topic}".
For each day include: Platform (YouTube / Shorts / TikTok / X), Post Title / Idea, Content Type, and Key Hook.`;
        break;

      default:
        prompt = `Create creative creator content for: ${topic} with focus on ${format || 'viral reach'}.`;
    }

    const response = await generateContentWithFallback({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    res.json({
      content: response.text || '',
      toolType,
    });
  } catch (error: any) {
    console.error('Creator generator error:', error);
    res.status(500).json({ error: formatErrorMessage(error) });
  }
});

// ==========================================
// 7. YOUTUBE CREATOR ENGINE (Full Pipeline)
// ==========================================
app.post('/api/creator/youtube-engine', async (req: Request, res: Response) => {
  try {
    const { idea, format = 'long_form', targetAudience = 'Tech & Creator Enthusiasts', tone = 'Engaging & Direct' } = req.body;

    if (!idea) {
      res.status(400).json({ error: 'Video idea is required' });
      return;
    }

    const prompt = `You are the Master YouTube Production Architect. Build a comprehensive end-to-end production package for the following idea:
IDEA: "${idea}"
FORMAT: ${format === 'shorts' ? 'YouTube Shorts (< 60s)' : 'Long-Form YouTube Video (8-12 min)'}
TARGET AUDIENCE: ${targetAudience}
TONE: ${tone}

Respond in clean, highly structured Markdown with these exact sections:

# 1. RESEARCH BRIEF & POSITIONING
- The Big Idea & Value Proposition
- Target Viewer Persona & Pain Points
- The Core Conflict / Mystery

# 2. THE RETENTION HOOK (First 0-10 seconds)
- Spoken Hook Line
- Visual Opening Frame Action

# 3. FULL PRODUCTION SCRIPT
- Comprehensive spoken narration with embedded camera/scene directions like [SCENE 1: Close-up facecam], [B-ROLL: Cyber UI animation].

# 4. SCENE-BY-SCENE PRODUCTION BREAKDOWN
| Scene # | Visual Direction | Spoken Audio | Estimated Duration |
(Include 6-10 clear scenes)

# 5. VOICE-OVER SCRIPT
(Pure spoken dialogue ready to copy-paste directly into AI Voice Studio)

# 6. CLICKABLE TITLE OPTIONS (5 High CTR Variants)
1.
2.
3.
4.
5.

# 7. SEO VIDEO DESCRIPTION
(Optimized for YouTube search algorithm)

# 8. TARGET KEYWORDS & HASHTAGS
- Keywords:
- Hashtags:

# 9. AI THUMBNAIL GENERATION PROMPT
(A detailed prompt ready to be pasted directly into Image Studio to generate the video thumbnail)

# 10. SHORTS / REELS ADAPTATION (60-second micro-cut)
(High-energy 60-second script version tailored for vertical format)`;

    const response = await generateContentWithFallback({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction: 'You are an award-winning YouTube strategist and creative director with over 100M views generated. Your scripts maximize retention, storytelling velocity, and click-through rates.',
      },
    });

    res.json({
      idea,
      format,
      package: response.text || '',
    });
  } catch (error: any) {
    console.error('YouTube engine error:', error);
    res.status(500).json({ error: formatErrorMessage(error) });
  }
});

// ==========================================
// 8. AI AGENT / AUTOMATION ENGINE
// ==========================================
app.post('/api/agent/run', async (req: Request, res: Response) => {
  try {
    const { task, permittedTools = ['search', 'analysis', 'code', 'synthesis'] } = req.body;

    if (!task) {
      res.status(400).json({ error: 'Task description is required' });
      return;
    }

    const agentPrompt = `You are the Zee Grok Autonomous Agent.
Execute the following user goal:
GOAL: "${task}"

Permitted Tools: ${permittedTools.join(', ')}

First create an execution plan with 3-5 distinct steps.
Execute each step with detailed reasoning and intermediate tool output.
Finally provide a consolidated result and executive summary.

Format your output clearly with:
### [PLAN]
1. ...
2. ...

### [EXECUTION TRACE]
Step 1: ...
Step 2: ...

### [FINAL DELIVERABLE]
...

### [AGENT SUMMARY]
...`;

    const response = await generateContentWithFallback({
      model: 'gemini-3.1-pro-preview',
      contents: agentPrompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        tools: [{ googleSearch: {} }],
      },
    });

    res.json({
      task,
      result: response.text || '',
    });
  } catch (error: any) {
    console.error('Agent execution error:', error);
    res.status(500).json({ error: formatErrorMessage(error) });
  }
});

// ==========================================
// 9. AI AGENT BATCH PROCESSING ENDPOINT
// ==========================================
app.post('/api/agent/batch', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      items, // array of { id, name, content, mimeType, dataUrl }
      model = 'gemini-3.8-flash',
      systemInstruction = 'You are the Zee Grok Agent Batch Processing Engine. Execute the provided instruction on the input document or data source and output a concise, high-value, and accurate deliverable.',
    } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Instruction prompt is required' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one item or file is required for batch processing' });
      return;
    }

    const startTime = Date.now();

    // Select appropriate Gemini model
    let targetModel = model;
    if (!targetModel.startsWith('gemini-')) {
      targetModel = 'gemini-3.8-flash';
    }

    // Process all items concurrently with Promise.all
    const itemPromises = items.map(async (item: any) => {
      const itemStart = Date.now();
      try {
        const parts: any[] = [];

        // If file has inline data (image, PDF, audio, video)
        if (item.dataUrl && item.mimeType) {
          const cleanBase64 = item.dataUrl.replace(/^data:[^;]+;base64,/, '');
          parts.push({
            inlineData: {
              mimeType: item.mimeType,
              data: cleanBase64,
            },
          });
        }

        let fullPrompt = `INSTRUCTION / GOAL: "${prompt}"\n\nTARGET ITEM: "${item.name}"\n`;
        if (item.content) {
          fullPrompt += `\n[CONTENT / EXTRACTED TEXT]:\n${item.content}\n`;
        }
        parts.push({ text: fullPrompt });

        const config: any = {
          systemInstruction,
        };

        if (targetModel === 'gemini-3.1-pro-preview') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
        }

        const response = await ai.models.generateContent({
          model: targetModel,
          contents: { parts },
          config,
        });

        return {
          id: item.id,
          name: item.name,
          status: 'completed' as const,
          output: response.text || 'Completed with empty response',
          durationMs: Date.now() - itemStart,
        };
      } catch (err: any) {
        console.error(`Batch item error for ${item.name}:`, err);
        return {
          id: item.id,
          name: item.name,
          status: 'failed' as const,
          output: `Error: ${err.message || 'Generation failed'}`,
          durationMs: Date.now() - itemStart,
          error: err.message,
        };
      }
    });

    const settledResults = await Promise.all(itemPromises);
    const totalDuration = Date.now() - startTime;
    const completedCount = settledResults.filter((r) => r.status === 'completed').length;

    res.json({
      prompt,
      modelUsed: targetModel,
      totalItems: items.length,
      completedItems: completedCount,
      failedItems: items.length - completedCount,
      executionTimeMs: totalDuration,
      results: settledResults,
    });
  } catch (error: any) {
    console.error('Batch agent error:', error);
    res.status(500).json({ error: error.message || 'Batch execution failed' });
  }
});

// ==========================================
// VITE SPA & STATIC SERVING SETUP
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Zee Grok AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server boot failed:', err);
  process.exit(1);
});
