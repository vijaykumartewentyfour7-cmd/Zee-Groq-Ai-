import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Settings,
  Sparkles,
  Bot,
  User as UserIcon,
  RotateCcw,
} from 'lucide-react';
import { AIMemory } from '../../lib/types';

interface VoiceAssistantViewProps {
  userMemories: AIMemory[];
  enableThinking: boolean;
}

export const VoiceAssistantView: React.FC<VoiceAssistantViewProps> = ({
  userMemories,
  enableThinking,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPushToTalk, setIsPushToTalk] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'push' | 'continuous'>('push');
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [transcript, setTranscript] = useState('');
  const [voiceLogs, setVoiceLogs] = useState<{ role: 'user' | 'assistant'; text: string; time: string }[]>([
    {
      role: 'assistant',
      text: 'Zee Grok Voice Engine online. Tap the glowing mic or hold push-to-talk to begin voice interaction.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [currentAssistantResponse, setCurrentAssistantResponse] = useState('');
  const [statusMessage, setStatusMessage] = useState('Ready for voice command');

  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Web Speech Recognition if available in browser
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = voiceMode === 'continuous';
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('Listening to your voice...');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        if (event.results[event.results.length - 1].isFinal) {
          handleVoiceCommand(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setStatusMessage(`Speech error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (voiceMode === 'continuous' && !isSpeaking) {
          // Re-arm in continuous mode
          try {
            recognition.start();
          } catch {
            // ignore
          }
        }
      };

      recognitionRef.current = recognition;
    } else {
      setStatusMessage('Web Speech API not supported on this browser. Voice recording uses server transcribe.');
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [voiceMode, isSpeaking]);

  const startListening = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsSpeaking(false);
    }
    setTranscript('');
    try {
      recognitionRef.current?.start();
    } catch {
      // already active
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
    setStatusMessage('Processing your speech...');
  };

  // Process Voice Query with Gemini + TTS
  const handleVoiceCommand = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setVoiceLogs((prev) => [...prev, { role: 'user', text: userPrompt, time: timeStr }]);
    setStatusMessage('Grok thinking and generating audio response...');

    try {
      // 1. Get concise spoken answer from Gemini
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userPrompt }],
          model: 'gemini-3.8-flash',
          stream: false,
          systemPrompt:
            'You are Zee Grok in Voice Mode. Provide concise, conversational, spoken-friendly responses (maximum 2 to 3 sentences). Avoid bullet points, code blocks, or formatting because your answer will be read directly by TTS.',
          memories: userMemories,
        }),
      });

      const chatData = await chatRes.json();
      const assistantText = chatData.content || 'I processed your command.';
      setCurrentAssistantResponse(assistantText);

      setVoiceLogs((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: assistantText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // 2. Synthesize with Gemini 3.8 Flash TTS
      setStatusMessage('Synthesizing speech via Gemini 3.8 Flash TTS...');
      const ttsRes = await fetch('/api/audio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: assistantText,
          voiceName: selectedVoice,
          style: 'Direct, clear, natural speaking assistant',
          model: 'gemini-3.8-flash-tts',
        }),
      });

      const ttsData = await ttsRes.json();
      if (ttsData.audioUrl) {
        setIsSpeaking(true);
        setStatusMessage(`Speaking (${selectedVoice})...`);

        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = ttsData.audioUrl;
          audioPlayerRef.current.play();
          audioPlayerRef.current.onended = () => {
            setIsSpeaking(false);
            setStatusMessage('Ready for next voice command');
            if (voiceMode === 'continuous') {
              startListening();
            }
          };
        }
      } else {
        setStatusMessage('Speech response ready (text-only)');
      }
    } catch (err: any) {
      console.error('Voice processing error:', err);
      setStatusMessage(`Voice processing error: ${err.message || 'Check connection'}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden relative">
      <audio ref={audioPlayerRef} className="hidden" />

      {/* Voice Header Settings */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-bold text-slate-200">Grok Voice Assistant</span>
        </div>

        {/* Voice Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-cyan-300 text-xs rounded-lg px-2 py-1 focus:outline-hidden"
          >
            {['Zephyr', 'Kore', 'Puck', 'Fenrir', 'Charon'].map((v) => (
              <option key={v} value={v}>
                Voice: {v}
              </option>
            ))}
          </select>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[11px]">
            <button
              onClick={() => setVoiceMode('push')}
              className={`px-2 py-0.5 rounded-md font-semibold ${
                voiceMode === 'push' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              Push-to-Talk
            </button>
            <button
              onClick={() => setVoiceMode('continuous')}
              className={`px-2 py-0.5 rounded-md font-semibold ${
                voiceMode === 'continuous' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              Continuous
            </button>
          </div>
        </div>
      </div>

      {/* Central Visualizer Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Pulsing Ambient Background Glow */}
        <div
          className={`absolute w-72 h-72 rounded-full blur-3xl opacity-30 transition-all duration-700 pointer-events-none ${
            isListening
              ? 'bg-cyan-500 scale-125'
              : isSpeaking
              ? 'bg-purple-500 scale-125 animate-pulse'
              : 'bg-blue-600/30 scale-90'
          }`}
        />

        {/* The Grok Visualizer Orb */}
        <div className="relative flex items-center justify-center mb-8">
          {/* Animated Concentric Rings */}
          <div
            className={`absolute w-48 h-48 rounded-full border border-cyan-500/20 transition-transform duration-500 ${
              isListening || isSpeaking ? 'scale-125 animate-ping opacity-30' : 'scale-100 opacity-10'
            }`}
          />
          <div
            className={`absolute w-40 h-40 rounded-full border-2 border-cyan-400/40 transition-transform duration-300 ${
              isListening ? 'scale-110' : isSpeaking ? 'scale-115' : 'scale-100'
            }`}
          />

          {/* Core Interactive Button */}
          {voiceMode === 'push' ? (
            <button
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onTouchStart={startListening}
              onTouchEnd={stopListening}
              className={`w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all active:scale-90 select-none ${
                isListening
                  ? 'bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-rose-500/40 scale-105'
                  : isSpeaking
                  ? 'bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-purple-500/40'
                  : 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-500/30 hover:scale-105'
              }`}
            >
              {isListening ? (
                <>
                  <Mic className="w-10 h-10 animate-bounce" />
                  <span className="text-[10px] font-bold mt-1 tracking-tight">Listening</span>
                </>
              ) : isSpeaking ? (
                <>
                  <Volume2 className="w-10 h-10 animate-pulse" />
                  <span className="text-[10px] font-bold mt-1 tracking-tight">Speaking</span>
                </>
              ) : (
                <>
                  <Mic className="w-10 h-10" />
                  <span className="text-[10px] font-bold mt-1 tracking-tight">Hold to Talk</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                if (isListening) stopListening();
                else startListening();
              }}
              className={`w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all active:scale-95 ${
                isListening
                  ? 'bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 shadow-emerald-500/40 animate-pulse'
                  : 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-500/30'
              }`}
            >
              {isListening ? <Mic className="w-10 h-10" /> : <MicOff className="w-10 h-10" />}
              <span className="text-[10px] font-bold mt-1 tracking-tight">
                {isListening ? 'Mute' : 'Start Voice'}
              </span>
            </button>
          )}
        </div>

        {/* Live Status indicator */}
        <p className="text-sm font-semibold text-cyan-300 tracking-wide">{statusMessage}</p>

        {/* Live speech preview */}
        {transcript && (
          <div className="mt-3 max-w-md p-3 rounded-xl bg-slate-900/80 border border-cyan-500/40 text-xs text-cyan-200">
            <span className="font-bold text-cyan-400">You: </span>
            {transcript}
          </div>
        )}
      </div>

      {/* Voice Transcript History Drawer */}
      <div className="h-44 border-t border-slate-800 bg-slate-900/60 p-3 overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-[11px] text-slate-400">
          <span className="font-bold uppercase tracking-wider">Voice Dialogue Stream</span>
          <button
            onClick={() => setVoiceLogs([])}
            className="hover:text-white flex items-center gap-1 text-[10px]"
          >
            <RotateCcw className="w-3 h-3" /> Clear
          </button>
        </div>

        <div className="space-y-2 mt-2">
          {voiceLogs.map((log, idx) => (
            <div key={idx} className="text-xs flex items-start gap-2">
              <span
                className={`font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0 ${
                  log.role === 'user' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-purple-500/20 text-purple-300'
                }`}
              >
                {log.role === 'user' ? 'You' : 'Grok'}
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">{log.text}</p>
              <span className="text-[9px] text-slate-400 ml-auto shrink-0">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
