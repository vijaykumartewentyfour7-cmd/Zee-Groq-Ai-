import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Zap,
  Brain,
  Eye,
  AudioWaveform,
  Video,
  Key,
  Globe,
  Check,
} from 'lucide-react';
import { SUPPORTED_PROVIDERS, SUPPORTED_MODELS } from '../../lib/providers-config';
import { AIProviderId } from '../../lib/types';

interface ModelManagerViewProps {
  currentModel: string;
  onSelectModel: (modelId: string) => void;
}

export const ModelManagerView: React.FC<ModelManagerViewProps> = ({
  currentModel,
  onSelectModel,
}) => {
  const [providerStatuses, setProviderStatuses] = useState<{ [key: string]: boolean }>({
    gemini: true,
  });

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/providers/status');
        const data = await res.json();
        if (data.providers) {
          const map: { [key: string]: boolean } = {};
          data.providers.forEach((p: any) => {
            map[p.id] = p.configured;
          });
          setProviderStatuses(map);
        }
      } catch (err) {
        console.warn('Status check warning:', err);
      }
    }
    checkStatus();
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white flex items-center gap-1.5">
                Multi-Model AI Engine
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                  7 Providers
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Unified multi-model abstraction connecting Google Gemini, OpenAI, Claude, Groq, Mistral, OpenRouter, and Hugging Face.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* Auto Model Mode Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-blue-950/40 to-slate-900 border border-cyan-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h3 className="font-extrabold text-sm text-white">Auto Model Routing Mode</h3>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                RECOMMENDED
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Dynamically routes queries to the optimal engine: complex STEM/code to Gemini 3.1 Pro (Thinking), real-time search queries to Gemini 3.5 Flash Grounded, rapid tasks to Flash Lite, and visual requests to Imagen & Veo.
            </p>
          </div>

          <button
            onClick={() => onSelectModel('auto')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
              currentModel === 'auto'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            {currentModel === 'auto' ? 'Active Auto Mode' : 'Enable Auto Model'}
          </button>
        </div>

        {/* Providers Overview Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Connected AI Providers ({SUPPORTED_PROVIDERS.length})
          </h3>

          <div className="space-y-4">
            {SUPPORTED_PROVIDERS.map((provider) => {
              const isConfigured = providerStatuses[provider.id] || provider.id === 'gemini';
              return (
                <div
                  key={provider.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800/90 p-4 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-white">{provider.name}</span>
                      {isConfigured ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Configured & Ready
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                          <Key className="w-3 h-3" /> Connect via Settings
                        </span>
                      )}
                    </div>

                    <a
                      href={provider.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <span>Docs</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{provider.description}</p>

                  {/* Models list under this provider */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {provider.models.map((model) => {
                      const isSelected = currentModel === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => onSelectModel(model.id)}
                          className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between ${
                            isSelected
                              ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-sm'
                              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-white">{model.name}</span>
                              {model.isRecommended && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1">{model.description}</p>

                            <div className="flex flex-wrap gap-1 mt-1">
                              {model.capabilities.map((cap) => (
                                <span
                                  key={cap}
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono"
                                >
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </div>

                          {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
