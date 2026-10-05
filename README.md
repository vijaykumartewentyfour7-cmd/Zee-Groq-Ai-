# Zee Grok AI

> **All-in-One AI Assistant, Multi-Model Engine & Creator Studio**  
> Designed mobile-first as an installable Progressive Web App (PWA) and responsive across all screens.

---

## 🌟 Key Features

### 1. Multi-Model AI Engine
- **Native Google Gemini**: High Thinking reasoning (`gemini-3.1-pro-preview`), Google Search Grounding (`gemini-3.5-flash`), Google Maps Grounding, Ultra low-latency Flash Lite (`gemini-3.1-flash-lite`), and Flagship general assistant (`gemini-3.8-flash`).
- **Auto Model Mode**: Analyzes prompt intent (reasoning, live web facts, location queries, image creation, rapid queries) and dynamically routes to the most capable configured model.
- **Multi-Provider Architecture**: Built-in support and abstraction layer for **OpenAI** (GPT-4o, o3-mini), **Anthropic Claude** (Claude 3.7 Sonnet), **Groq** (Llama 3.3 70B, DeepSeek R1), **OpenRouter**, **Mistral AI**, and **Hugging Face**.
- **Server-Side Security**: All provider keys remain secure on the server without client exposure.

### 2. ChatGPT-Style Multi-Turn Chat
- Real-time streaming responses via Server-Sent Events (SSE).
- Stop generation and regenerate responses.
- Markdown rendering with syntax highlighting and one-click code copy.
- File and photo attachments with multimodal Gemini Pro visual analysis.
- Full conversation history with rename, delete, search, and Firestore cloud synchronization.
- Customizable system prompts and persona directions.

### 3. AI Memory & Context
- Stores user preferences, project context, key facts, and custom instructions.
- Full user control to view, add, edit, and delete memories.
- Automatically injects active context into chat and studio prompts.

### 4. Interactive Voice Assistant
- Real-time speech-to-text input with Push-to-Talk or continuous hands-free voice mode.
- Expressive audio responses generated with **Gemini 3.8 Flash TTS**.
- Prebuilt voices: **Zephyr**, **Kore**, **Puck**, **Fenrir**, and **Charon**.
- Pulsing animated reactive voice visualizer orb.

### 5. AI Creator Studio
- **Script Generator**: YouTube long-form (8-15 min), YouTube Shorts (<60s), TikTok / Reels, Storytelling, Direct-response Advertisements, and Educational tutorials.
- **Viral Content Tools**: 5-second Retention Hooks, 10 High-CTR Titles, SEO Descriptions with Timestamps, Keywords, and 14-Day Content Publishing Calendars.
- Direct bridge to **Voice Studio** for voiceovers and **Image Studio** for thumbnails.

### 6. YouTube Creator Engine
- **End-to-End Pipeline**: Transforms a raw idea into a complete production package:
  `Idea → Research Brief → 5s Hook → Production Script → Scene Breakdown (Visuals + Audio) → Voiceover Dialogue → 5 Clickable Titles → SEO Description → Search Keywords & Hashtags → AI Thumbnail Prompt → 60s Shorts Cut`.

### 7. Image Studio
- High-fidelity image creation and editing with **Gemini Flash Image** (`gemini-3.1-flash-image`).
- Aspect ratio selection: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`.
- Image-to-image photo editing: upload starting images and provide natural language editing commands.
- Visual style presets: Hyper-Realistic, Cinematic Lighting, Cyberpunk, 3D Pixar, Anime, Minimalist.

### 8. Video Studio (Google Veo 3)
- Text-to-video generation and photo-to-video animation using **Google Veo 3** (`veo-3.1-fast-generate-preview`).
- Aspect ratio controls: `16:9` (landscape) and `9:16` (portrait).
- 3-step async polling with live status updates, video player, and MP4 download.
- Pluggable support for Runway Gen-3 and Kling AI adapters.

### 9. AI Voice Studio (TTS)
- Dedicated speech synthesis powered by `gemini-3.8-flash-tts` and `gemini-3.8-flash-lite-tts`.
- Persona direction and style prompts (Podcast host, News anchor, Dramatic movie narrator, Whispering).
- In-browser waveform playback and WAV download.

### 10. Files & Document Intelligence
- Upload PDFs, TXT, DOC, JSON, images, audio, and video files.
- Multimodal document analysis and Q&A using **Gemini 3.1 Pro Preview**.

### 11. Autonomous Agent Studio & Batch Processing Module
- **Batch Processing Engine**: Run identical prompt instructions across multiple files, documents, and data sources simultaneously in parallel.
- **Multimodal Source Support**: Upload multiple PDFs, images, code files, CSVs, TXT files, or paste custom data snippets.
- **Live Progress Matrix**: Real-time progress bar, per-item latency tracker, individual result preview modal, and status indicators.
- **Bulk Export Suite**: One-click export all batch results to Markdown summary report, raw JSON data, or cloud sync to Firestore.
- **Autonomous Planner**: Goal-oriented agent with task decomposition, step planning, tool invocation (Search, Analysis, Code, Synthesis), and reasoning execution traces.

### 12. Mobile-First PWA Experience
- Touch-friendly controls with bottom navigation bar and desktop collapsible sidebar.
- Web App Manifest and service worker offline caching via `vite-plugin-pwa`.
- In-app install button with guided prompts for iOS Safari and Chromium.
- Real-time offline indicator.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **PWA**: `vite-plugin-pwa`, Web App Manifest, CacheFirst service worker
- **Backend**: Node.js, Express, `tsx`
- **AI SDK**: `@google/genai` (v2.4.0) with server-side proxy routes
- **Database & Auth**: Firebase Authentication (Google Sign-In) + Cloud Firestore
- **Security**: ABAC zero-trust `firestore.rules` and intermediate representation `firebase-blueprint.json`

---

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` and verify `GEMINI_API_KEY`:
   ```bash
   GEMINI_API_KEY="your-gemini-api-key"
   ```

3. **Run Full-Stack Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Production Build**:
   ```bash
   npm run build
   npm start
   ```
