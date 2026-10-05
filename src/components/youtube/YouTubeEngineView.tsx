import React, { useState } from 'react';
import {
  Youtube,
  Sparkles,
  Copy,
  Check,
  Save,
  ArrowRight,
  Image as ImageIcon,
  AudioWaveform,
  Film,
  Zap,
  ListOrdered,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { saveCreatorArtifact } from '../../lib/firebase';
import { CreatorArtifact } from '../../lib/types';

interface YouTubeEngineViewProps {
  currentUser: User | null;
  onSendToImageStudio?: (prompt: string) => void;
  onSendToVoiceStudio?: (script: string) => void;
}

export const YouTubeEngineView: React.FC<YouTubeEngineViewProps> = ({
  currentUser,
  onSendToImageStudio,
  onSendToVoiceStudio,
}) => {
  const [idea, setIdea] = useState('');
  const [format, setFormat] = useState<'long_form' | 'shorts'>('long_form');
  const [targetAudience, setTargetAudience] = useState('Tech, AI & Future Enthusiasts');
  const [tone, setTone] = useState('Fascinating, fast-paced, high retention');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPackage, setGeneratedPackage] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleRunPipeline = async () => {
    if (!idea.trim()) return;
    setIsGenerating(true);
    setCopied(false);
    setSaved(false);

    try {
      const res = await fetch('/api/creator/youtube-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          format,
          targetAudience,
          tone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pipeline execution failed');
      setGeneratedPackage(data.package || '');
    } catch (err: any) {
      console.error('YouTube pipeline error:', err);
      setGeneratedPackage(`⚠️ Error: ${err.message || 'Generation failed'}.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPackage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToArtifacts = async () => {
    if (!generatedPackage) return;
    const uid = currentUser?.uid || 'guest_user';
    const artifact: CreatorArtifact = {
      id: `yt_${Date.now()}`,
      userId: uid,
      type: 'youtube',
      title: `YT ${format.toUpperCase()}: ${idea.slice(0, 30)}`,
      prompt: idea,
      content: generatedPackage,
      createdAt: new Date().toISOString(),
    };
    try {
      await saveCreatorArtifact(artifact);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.warn('Sync note:', err);
      setSaved(true);
    }
  };

  // Helper to extract thumbnail prompt if present in text
  const extractThumbnailPrompt = (): string => {
    const match = generatedPackage.match(/# 9\. AI THUMBNAIL GENERATION PROMPT[\s\S]*?(?=# 10|\n\n\n|$)/i);
    if (match) {
      return match[0].replace(/# 9\. AI THUMBNAIL GENERATION PROMPT/i, '').trim();
    }
    return `YouTube thumbnail for video: ${idea}, hyper-realistic, dramatic high-contrast lighting, 4k cinematic`;
  };

  // Helper to extract voice script if present
  const extractVoiceScript = (): string => {
    const match = generatedPackage.match(/# 5\. VOICE-OVER SCRIPT[\s\S]*?(?=# 6|\n\n\n|$)/i);
    if (match) {
      return match[0].replace(/# 5\. VOICE-OVER SCRIPT/i, '').trim();
    }
    return generatedPackage.slice(0, 500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white flex items-center gap-1.5">
                YouTube Creator Engine
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                  Full Pipeline
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Transform a single concept into a complete production package: Brief → Hook → Script → Scenes → Voice → Titles → SEO → Thumbnail Prompt.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* Pipeline Input Card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800/80 p-5 space-y-4 shadow-xl">
          {/* Format Toggle */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Select YouTube Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('long_form')}
                className={`p-3 rounded-xl text-left border transition-all ${
                  format === 'long_form'
                    ? 'bg-rose-950/40 border-rose-500 text-rose-200 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-rose-400" />
                  <p className="font-bold text-xs text-white">Long-Form Video</p>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">8–15 min narrative pacing, b-roll cues, multi-act story</p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('shorts')}
                className={`p-3 rounded-xl text-left border transition-all ${
                  format === 'shorts'
                    ? 'bg-rose-950/40 border-rose-500 text-rose-200 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <p className="font-bold text-xs text-white">YouTube Shorts</p>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">&lt; 60s viral retention loop, instant 2s hook</p>
              </button>
            </div>
          </div>

          {/* Idea Input */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Video Concept or Core Idea <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. A deep dive exposing the secret math behind algorithmic stock trading bots, and how retail investors get front-run..."
              rows={3}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-rose-500 resize-none"
            />
          </div>

          {/* Configuration options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Target Audience</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Tone & Voice</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
              />
            </div>
          </div>

          <button
            onClick={handleRunPipeline}
            disabled={!idea.trim() || isGenerating}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-red-500 to-orange-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/25 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-white" />
                <span>Running 10-Phase Production Engine...</span>
              </>
            ) : (
              <>
                <Youtube className="w-4 h-4 text-white" />
                <span>Generate Complete YouTube Package</span>
              </>
            )}
          </button>
        </div>

        {/* Results Stream */}
        {generatedPackage && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Full Production Blueprint Ready
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy All'}</span>
                </button>

                <button
                  onClick={handleSaveToArtifacts}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                >
                  {saved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{saved ? 'Saved' : 'Save'}</span>
                </button>

                {onSendToImageStudio && (
                  <button
                    onClick={() => onSendToImageStudio(extractThumbnailPrompt())}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-semibold"
                    title="Send generated prompt to Image Studio for thumbnail creation"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Create Thumbnail</span>
                  </button>
                )}

                {onSendToVoiceStudio && (
                  <button
                    onClick={() => onSendToVoiceStudio(extractVoiceScript())}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-xs font-semibold"
                    title="Send voiceover dialogue to AI Voice Studio"
                  >
                    <AudioWaveform className="w-3.5 h-3.5" />
                    <span>Generate Voiceover</span>
                  </button>
                )}
              </div>
            </div>

            {/* Rendered Package */}
            <div className="prose prose-invert max-w-none text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 font-mono">
              {generatedPackage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
