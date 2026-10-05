import React, { useState, useRef } from 'react';
import {
  AudioWaveform,
  Sparkles,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  Sliders,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { saveCreatorArtifact } from '../../lib/firebase';
import { CreatorArtifact } from '../../lib/types';

interface VoiceStudioViewProps {
  currentUser: User | null;
  initialText?: string;
}

interface AudioGeneration {
  id: string;
  text: string;
  voice: string;
  style: string;
  audioUrl: string;
  createdAt: string;
}

export const VoiceStudioView: React.FC<VoiceStudioViewProps> = ({
  currentUser,
  initialText = '',
}) => {
  const [text, setText] = useState(initialText);
  const [voiceName, setVoiceName] = useState('Zephyr');
  const [stylePreset, setStylePreset] = useState('Clear, natural, modern narrator');
  const [modelType, setModelType] = useState<'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts'>('gemini-3.8-flash-tts');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generations, setGenerations] = useState<AudioGeneration[]>([]);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const availableVoices = [
    { id: 'Zephyr', name: 'Zephyr', gender: 'Dynamic', desc: 'Direct, modern, confident digital voice' },
    { id: 'Kore', name: 'Kore', gender: 'Warm', desc: 'Articulate, friendly, educational narrator' },
    { id: 'Puck', name: 'Puck', gender: 'Energetic', desc: 'Playful, lively, YouTube video host' },
    { id: 'Fenrir', name: 'Fenrir', gender: 'Authoritative', desc: 'Deep, cinematic, documentary tone' },
    { id: 'Charon', name: 'Charon', gender: 'Calm', desc: 'Serene, smooth, reflective storytelling' },
  ];

  const speechStyles = [
    'Clear, natural, modern narrator',
    'Enthusiastic, energetic YouTube creator',
    'Dramatic movie trailer narration',
    'Calm, soothing meditation instructor',
    'Fast-paced, urgent breaking tech news',
  ];

  const handleSynthesize = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);

    try {
      const res = await fetch('/api/audio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName,
          style: stylePreset,
          model: modelType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'TTS generation failed');

      if (data.audioUrl) {
        const newGen: AudioGeneration = {
          id: `voice_${Date.now()}`,
          text,
          voice: voiceName,
          style: stylePreset,
          audioUrl: data.audioUrl,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setGenerations((prev) => [newGen, ...prev]);

        // Auto-play newly generated audio
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = data.audioUrl;
          audioPlayerRef.current.play();
          setCurrentlyPlayingId(newGen.id);
          audioPlayerRef.current.onended = () => setCurrentlyPlayingId(null);
        }

        // Save to Firestore
        const uid = currentUser?.uid || 'guest_user';
        const artifact: CreatorArtifact = {
          id: newGen.id,
          userId: uid,
          type: 'voice',
          title: `Voiceover: ${text.slice(0, 30)}`,
          prompt: text,
          mediaUrl: data.audioUrl,
          content: `Voice: ${voiceName}, Style: ${stylePreset}`,
          createdAt: new Date().toISOString(),
        };
        saveCreatorArtifact(artifact).catch(console.warn);
      }
    } catch (err: any) {
      console.error('TTS error:', err);
      alert(`Voice synthesis error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayAudio = (gen: AudioGeneration) => {
    if (!audioPlayerRef.current) return;

    if (currentlyPlayingId === gen.id) {
      audioPlayerRef.current.pause();
      setCurrentlyPlayingId(null);
    } else {
      audioPlayerRef.current.src = gen.audioUrl;
      audioPlayerRef.current.play();
      setCurrentlyPlayingId(gen.id);
      audioPlayerRef.current.onended = () => setCurrentlyPlayingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      <audio ref={audioPlayerRef} className="hidden" />

      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <AudioWaveform className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white flex items-center gap-1.5">
                AI Voice Studio
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                  Gemini 3.8 Flash TTS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Transform script lines into studio-quality vocal speech with persona and style direction.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* Synthesis Form Box */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800/80 p-5 space-y-4 shadow-xl">
          {/* Script Text Input */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Spoken Script or Text to Synthesize <span className="text-cyan-400">*</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Welcome back to Zee Grok AI. Today we are diving deep into multi-modal intelligence and next-gen creator engines..."
              rows={4}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-cyan-500 resize-none leading-relaxed"
            />
          </div>

          {/* Voice Personas Grid */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Select Prebuilt Voice Persona
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {availableVoices.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoiceName(v.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    voiceName === v.id
                      ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="font-bold text-xs text-white">{v.name}</p>
                  <span className="text-[10px] text-cyan-400 font-semibold">{v.gender}</span>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Style Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Voice Style & Atmosphere
            </label>
            <div className="flex flex-wrap gap-1.5">
              {speechStyles.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setStylePreset(style)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    stylePreset === style
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Model selector toggle */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400">TTS Engine Model:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModelType('gemini-3.8-flash-tts')}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                  modelType === 'gemini-3.8-flash-tts'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Flash TTS (Flagship)
              </button>
              <button
                type="button"
                onClick={() => setModelType('gemini-3.8-flash-lite-tts')}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                  modelType === 'gemini-3.8-flash-lite-tts'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Flash Lite TTS (Speed)
              </button>
            </div>
          </div>

          <button
            onClick={handleSynthesize}
            disabled={!text.trim() || isGenerating}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-white" />
                <span>Synthesizing Studio Audio...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-white" />
                <span>Synthesize Speech ({voiceName})</span>
              </>
            )}
          </button>
        </div>

        {/* Audio Generation History */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Generated Studio Audio ({generations.length})
          </h3>

          {generations.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
              <AudioWaveform className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>No audio synthesized yet in this session. Write or paste a script above to generate voiceover.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {generations.map((gen) => (
                <div
                  key={gen.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-lg">
                    <p className="text-xs text-white font-medium line-clamp-2 leading-relaxed">
                      "{gen.text}"
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-cyan-400">
                      <span className="font-bold">Voice: {gen.voice}</span>
                      <span>•</span>
                      <span className="text-slate-400">{gen.style}</span>
                      <span>•</span>
                      <span className="text-slate-400">{gen.createdAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => togglePlayAudio(gen)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        currentlyPlayingId === gen.id
                          ? 'bg-rose-600 text-white'
                          : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                      }`}
                    >
                      {currentlyPlayingId === gen.id ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Play</span>
                        </>
                      )}
                    </button>
                    <a
                      href={gen.audioUrl}
                      download={`zeegrok-${gen.voice.toLowerCase()}.wav`}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
                      title="Download WAV"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
