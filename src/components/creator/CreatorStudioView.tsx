import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Save,
  Send,
  FileText,
  Compass,
  Calendar,
  Hash,
  Share2,
  Video,
  AudioWaveform,
  CheckCircle2,
  Film,
  Zap,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { saveCreatorArtifact } from '../../lib/firebase';
import { CreatorArtifact } from '../../lib/types';

interface CreatorStudioViewProps {
  currentUser: User | null;
  onNavigateToVoice?: (text: string) => void;
  onNavigateToImage?: (prompt: string) => void;
}

export const CreatorStudioView: React.FC<CreatorStudioViewProps> = ({
  currentUser,
  onNavigateToVoice,
  onNavigateToImage,
}) => {
  const [activeCategory, setActiveCategory] = useState<'scripts' | 'tools' | 'calendar'>('scripts');
  const [selectedTool, setSelectedTool] = useState<string>('youtube_long');
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('Tech Enthusiasts & Creators');
  const [tone, setTone] = useState('High Retention, Energetic, Direct');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const scriptTypes = [
    { id: 'youtube_long', label: 'YouTube Long-Form', format: 'YouTube long-form (8-12 min)' },
    { id: 'youtube_shorts', label: 'YouTube Shorts', format: 'YouTube Shorts (<60s vertical)' },
    { id: 'tiktok_reels', label: 'TikTok / Reels', format: 'TikTok / Instagram Reels viral pacing' },
    { id: 'story', label: 'Story & Narrative', format: 'Cinematic Storytelling script' },
    { id: 'advertisement', label: 'High-Converting Ad', format: 'Direct response video ad with hook-problem-solution-CTA' },
    { id: 'educational', label: 'Educational Tutorial', format: 'Educational breakdown with visual cues' },
  ];

  const contentTools = [
    { id: 'hook', label: 'Viral 5s Hooks', toolType: 'hook', desc: '7 Retention hooks with psychological triggers' },
    { id: 'title', label: 'Click-Worthy Titles', toolType: 'title', desc: '10 High-CTR curiosity-gap titles' },
    { id: 'description_seo', label: 'SEO Description', toolType: 'description_seo', desc: 'Summary, timestamps, keywords & hashtags' },
    { id: 'content_calendar', label: '14-Day Calendar', toolType: 'content_calendar', desc: 'Cross-platform content roadmap' },
  ];

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setCopied(false);
    setSaved(false);

    let format = '';
    let toolType = 'script';

    if (activeCategory === 'scripts') {
      const match = scriptTypes.find((s) => s.id === selectedTool);
      format = match ? match.format : 'YouTube script';
      toolType = 'script';
    } else {
      const match = contentTools.find((t) => t.id === selectedTool);
      toolType = match ? match.toolType : selectedTool;
    }

    try {
      const res = await fetch('/api/creator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolType,
          topic,
          format,
          targetAudience,
          tone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setGeneratedOutput(data.content || '');
    } catch (err: any) {
      console.error('Creator generation failed:', err);
      setGeneratedOutput(`⚠️ Error: ${err.message || 'Generation failed'}.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToArtifacts = async () => {
    if (!generatedOutput) return;
    const uid = currentUser?.uid || 'guest_user';
    const artifact: CreatorArtifact = {
      id: `art_${Date.now()}`,
      userId: uid,
      type: 'script',
      title: `${selectedTool.toUpperCase()}: ${topic.slice(0, 30)}`,
      prompt: topic,
      content: generatedOutput,
      createdAt: new Date().toISOString(),
    };
    try {
      await saveCreatorArtifact(artifact);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.warn('Artifact save note:', err);
      setSaved(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Top Banner */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="font-extrabold text-base text-white">AI Creator Studio</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PRO ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Produce viral YouTube long-form, Shorts, TikTok scripts, high-CTR hooks, and content schedules.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/60 text-xs">
            <button
              onClick={() => {
                setActiveCategory('scripts');
                setSelectedTool('youtube_long');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeCategory === 'scripts' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Scripts
            </button>
            <button
              onClick={() => {
                setActiveCategory('tools');
                setSelectedTool('hook');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeCategory === 'tools' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Content Tools
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* Sub-Tool Selector Cards */}
        <div>
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
            Select Generator Format
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activeCategory === 'scripts'
              ? scriptTypes.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      selectedTool === tool.id
                        ? 'bg-amber-950/40 border-amber-500 text-amber-200 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <p className="font-bold text-xs">{tool.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{tool.format}</p>
                  </button>
                ))
              : contentTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      selectedTool === tool.id
                        ? 'bg-amber-950/40 border-amber-500 text-amber-200 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <p className="font-bold text-xs">{tool.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{tool.desc}</p>
                  </button>
                ))}
          </div>
        </div>

        {/* Input Parameters Form */}
        <div className="space-y-4 p-4 rounded-2xl bg-slate-900 border border-slate-800/80">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Topic, Video Idea, or Niche Concept <span className="text-amber-400">*</span>
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Why Quantum Computing Will Break Cryptography in 5 Years, or 7 productivity habits of top founders..."
              rows={2}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Target Audience</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Tone & Pacing</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || isGenerating}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
                <span>Crafting Masterpiece...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-slate-950" />
                <span>Generate Creator Package</span>
              </>
            )}
          </button>
        </div>

        {/* Output Section */}
        {generatedOutput && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                Generated Content
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleSaveToArtifacts}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                >
                  {saved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{saved ? 'Saved' : 'Save'}</span>
                </button>

                {onNavigateToVoice && (
                  <button
                    onClick={() => onNavigateToVoice(generatedOutput)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 text-xs font-semibold"
                    title="Send to Voice Studio for speech synthesis"
                  >
                    <AudioWaveform className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Voice Studio</span>
                  </button>
                )}
              </div>
            </div>

            <div className="prose prose-invert max-w-none text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto p-2 bg-slate-950/60 rounded-xl border border-slate-800/60 font-mono">
              {generatedOutput}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
