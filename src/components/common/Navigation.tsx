import React from 'react';
import {
  MessageSquare,
  Mic,
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
  Grid,
} from 'lucide-react';

export type NavTab =
  | 'chat'
  | 'voice'
  | 'creator'
  | 'youtube'
  | 'image'
  | 'video'
  | 'voice_studio'
  | 'files'
  | 'memory'
  | 'agent'
  | 'models'
  | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  openHubModal: () => void;
  unreadCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  openHubModal,
}) => {
  const primaryMobileTabs: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'creator', label: 'Creator', icon: Sparkles },
    { id: 'youtube', label: 'YouTube', icon: Youtube },
  ];

  const allNavItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; category?: string }[] = [
    { id: 'chat', label: 'AI Chat', icon: MessageSquare, category: 'Core' },
    { id: 'voice', label: 'Voice Assistant', icon: Mic, category: 'Core' },
    { id: 'models', label: 'Multi-Model Engine', icon: Cpu, category: 'Core' },

    { id: 'creator', label: 'Creator Studio', icon: Sparkles, category: 'Studio Suite' },
    { id: 'youtube', label: 'YouTube Engine', icon: Youtube, category: 'Studio Suite' },
    { id: 'image', label: 'Image Studio', icon: ImageIcon, category: 'Studio Suite' },
    { id: 'video', label: 'Video Studio (Veo)', icon: VideoIcon, category: 'Studio Suite' },
    { id: 'voice_studio', label: 'Voice Studio (TTS)', icon: AudioWaveform, category: 'Studio Suite' },

    { id: 'agent', label: 'Autonomous Agent', icon: Bot, category: 'Intelligence' },
    { id: 'files', label: 'Files & Documents', icon: FolderOpen, category: 'Intelligence' },
    { id: 'memory', label: 'AI Memory', icon: Brain, category: 'Intelligence' },
    { id: 'settings', label: 'Settings & APIs', icon: Settings, category: 'System' },
  ];

  return (
    <>
      {/* ============================================================== */}
      {/* DESKTOP / TABLET SIDEBAR (md and above) */}
      {/* ============================================================== */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950/80 border-r border-slate-800/80 backdrop-blur-xl shrink-0 h-screen sticky top-0 overflow-y-auto select-none">
        {/* App Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 font-black text-xl text-white tracking-wider border border-cyan-400/30">
              Z
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">Zee Grok</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AI OS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Multi-Model Studio</p>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 px-3 py-4 space-y-6">
          {['Core', 'Studio Suite', 'Intelligence', 'System'].map((cat) => (
            <div key={cat} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {cat}
              </div>
              {allNavItems
                .filter((item) => item.category === cat)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                      {item.id === 'video' && (
                        <span className="ml-auto text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                          Veo 3
                        </span>
                      )}
                      {item.id === 'models' && (
                        <span className="ml-auto text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                          7 APIs
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer Status */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Engine Online
            </span>
            <span className="text-slate-400">PWA Ready</span>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (md:hidden) */}
      {/* ============================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2 pt-1 shadow-2xl">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {primaryMobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative ${
                  isActive
                    ? 'text-cyan-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              </button>
            );
          })}

          {/* More / Studio Hub Drawer Trigger */}
          <button
            onClick={openHubModal}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              ['image', 'video', 'voice_studio', 'files', 'memory', 'agent', 'models', 'settings'].includes(
                currentTab
              )
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Grid className="w-5 h-5" />
              {['image', 'video', 'voice_studio', 'files', 'memory', 'agent', 'models', 'settings'].includes(
                currentTab
              ) && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400" />
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Studio Hub</span>
          </button>
        </div>
      </nav>
    </>
  );
};
