import React from 'react';
import {
  X,
  Sparkles,
  Youtube,
  Image as ImageIcon,
  Video as VideoIcon,
  AudioWaveform,
  FolderOpen,
  Brain,
  Cpu,
  Bot,
  Settings,
  MessageSquare,
  Mic,
} from 'lucide-react';
import { NavTab } from './Navigation';

interface StudioHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavTab) => void;
}

export const StudioHubModal: React.FC<StudioHubModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  if (!isOpen) return null;

  const studioTools: {
    id: NavTab;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    tag?: string;
    tagColor?: string;
    color: string;
  }[] = [
    {
      id: 'chat',
      title: 'AI Chat',
      description: 'ChatGPT-style multi-turn chat with code & thinking',
      icon: MessageSquare,
      color: 'from-cyan-500/20 to-blue-500/10 text-cyan-400',
    },
    {
      id: 'voice',
      title: 'Voice Assistant',
      description: 'Interactive push-to-talk & continuous voice conversation',
      icon: Mic,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400',
    },
    {
      id: 'creator',
      title: 'Creator Studio',
      description: 'Viral scripts, hooks, titles & content calendar',
      icon: Sparkles,
      tag: 'Viral AI',
      tagColor: 'bg-amber-500/20 text-amber-300',
      color: 'from-amber-500/20 to-orange-500/10 text-amber-400',
    },
    {
      id: 'youtube',
      title: 'YouTube Engine',
      description: 'Idea to full script, scenes, audio, and SEO tags',
      icon: Youtube,
      tag: 'Pipeline',
      tagColor: 'bg-rose-500/20 text-rose-300',
      color: 'from-rose-500/20 to-red-500/10 text-rose-400',
    },
    {
      id: 'image',
      title: 'Image Studio',
      description: 'Text-to-image & photo editing with aspect ratios',
      icon: ImageIcon,
      tag: 'Nano Banana',
      tagColor: 'bg-purple-500/20 text-purple-300',
      color: 'from-purple-500/20 to-violet-500/10 text-purple-400',
    },
    {
      id: 'video',
      title: 'Video Studio',
      description: 'Veo 3 AI text-to-video and photo animator',
      icon: VideoIcon,
      tag: 'Veo 3',
      tagColor: 'bg-indigo-500/20 text-indigo-300',
      color: 'from-indigo-500/20 to-blue-500/10 text-indigo-400',
    },
    {
      id: 'voice_studio',
      title: 'Voice Studio',
      description: 'Studio TTS speech synthesis & dual-speaker dialogue',
      icon: AudioWaveform,
      tag: 'Flash TTS',
      tagColor: 'bg-cyan-500/20 text-cyan-300',
      color: 'from-cyan-500/20 to-blue-500/10 text-cyan-400',
    },
    {
      id: 'agent',
      title: 'Autonomous Agent',
      description: 'Multi-step planning and tool execution agent',
      icon: Bot,
      color: 'from-blue-500/20 to-cyan-500/10 text-blue-400',
    },
    {
      id: 'files',
      title: 'Files & Documents',
      description: 'Upload PDFs & docs for deep multimodal analysis',
      icon: FolderOpen,
      color: 'from-teal-500/20 to-emerald-500/10 text-teal-400',
    },
    {
      id: 'memory',
      title: 'AI Memory',
      description: 'User context, preferences & project memories',
      icon: Brain,
      color: 'from-pink-500/20 to-rose-500/10 text-pink-400',
    },
    {
      id: 'models',
      title: 'Multi-Model Engine',
      description: 'Manage 7 providers & Auto-Model routing',
      icon: Cpu,
      color: 'from-slate-700/40 to-slate-800/20 text-slate-300',
    },
    {
      id: 'settings',
      title: 'Settings & APIs',
      description: 'Account, appearance, API keys & storage',
      icon: Settings,
      color: 'from-slate-700/40 to-slate-800/20 text-slate-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-md">
      {/* Backdrop tap to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer content */}
      <div className="w-full max-h-[85vh] bg-slate-950 border-t border-slate-800 rounded-t-3xl shadow-2xl p-5 overflow-y-auto animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs">
              Z
            </div>
            <h2 className="font-extrabold text-base text-white">Zee Grok Studio Hub</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-900 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid of Tools */}
        <div className="grid grid-cols-2 gap-3 mt-4 pb-8">
          {studioTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  onSelectTab(tool.id);
                  onClose();
                }}
                className="flex flex-col text-left p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/50 active:scale-[0.98] transition-all group"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${tool.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {tool.tag && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tool.tagColor}`}>
                      {tool.tag}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {tool.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
