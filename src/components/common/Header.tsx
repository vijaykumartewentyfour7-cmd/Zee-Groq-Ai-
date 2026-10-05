import React, { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Brain,
  Search,
  Zap,
  Check,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';
import { SUPPORTED_MODELS } from '../../lib/providers-config';
import { AIModel } from '../../lib/types';

interface HeaderProps {
  currentModel: string;
  onModelChange: (modelId: string) => void;
  currentUser: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  enableThinking: boolean;
  onToggleThinking: () => void;
  enableSearch: boolean;
  onToggleSearch: () => void;
  activeTabTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentModel,
  onModelChange,
  currentUser,
  onSignIn,
  onSignOut,
  enableThinking,
  onToggleThinking,
  enableSearch,
  onToggleSearch,
  activeTabTitle,
}) => {
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const selectedModelObj: AIModel =
    SUPPORTED_MODELS.find((m) => m.id === currentModel) || {
      id: currentModel,
      name: currentModel.replace('gemini-', '').toUpperCase(),
      provider: 'gemini',
      description: 'Active AI Model',
      capabilities: ['text'],
    };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-3 py-2.5 flex items-center justify-between select-none">
      {/* Left: App Logo or Tab Title */}
      <div className="flex items-center gap-2">
        <div className="md:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-sm text-white shadow-md shadow-cyan-500/20">
            Z
          </div>
          <div>
            <h1 className="font-extrabold text-sm leading-tight text-white tracking-tight flex items-center gap-1">
              Zee Grok
              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">AI</span>
            </h1>
            <p className="text-[10px] text-slate-400 leading-none">{activeTabTitle}</p>
          </div>
        </div>

        <div className="hidden md:block">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>{activeTabTitle}</span>
          </h2>
        </div>
      </div>

      {/* Middle/Center: Model Selector Trigger */}
      <div className="relative">
        <button
          onClick={() => setShowModelPicker(!showModelPicker)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/80 hover:border-cyan-500/50 text-xs font-medium text-slate-200 shadow-sm transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="truncate max-w-[120px] sm:max-w-[160px] font-semibold">
            {selectedModelObj.name}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* Model Picker Dropdown */}
        {showModelPicker && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-4 text-slate-100 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-sm">Select AI Model Engine</h3>
                </div>
                <button
                  onClick={() => setShowModelPicker(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-md bg-slate-800"
                >
                  Close
                </button>
              </div>

              {/* Quick Feature Toggles */}
              <div className="grid grid-cols-2 gap-2 my-3">
                <button
                  onClick={onToggleThinking}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs border transition-all ${
                    enableThinking
                      ? 'bg-purple-950/50 border-purple-500/50 text-purple-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400'
                  }`}
                >
                  <Brain className="w-4 h-4 text-purple-400" />
                  <div className="text-left">
                    <p className="font-semibold leading-tight">Deep Thinking</p>
                    <p className="text-[10px] text-slate-400">Gemini 3.1 Pro</p>
                  </div>
                </button>

                <button
                  onClick={onToggleSearch}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs border transition-all ${
                    enableSearch
                      ? 'bg-blue-950/50 border-blue-500/50 text-blue-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400'
                  }`}
                >
                  <Search className="w-4 h-4 text-blue-400" />
                  <div className="text-left">
                    <p className="font-semibold leading-tight">Live Grounding</p>
                    <p className="text-[10px] text-slate-400">Google Search</p>
                  </div>
                </button>
              </div>

              {/* Model Lists by Provider */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-2">
                    Native Google Gemini (Server Configured)
                  </h4>
                  <div className="space-y-1.5">
                    {SUPPORTED_MODELS.filter((m) => m.provider === 'gemini').map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onModelChange(m.id);
                          setShowModelPicker(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start justify-between ${
                          currentModel === m.id
                            ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                            : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white">{m.name}</span>
                            {m.isPopular && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                Popular
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{m.description}</p>
                        </div>
                        {currentModel === m.id && <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    External Multi-Model Support (OpenAI, Claude, Groq)
                  </h4>
                  <div className="space-y-1.5">
                    {SUPPORTED_MODELS.filter((m) => m.provider !== 'gemini')
                      .slice(0, 5)
                      .map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            onModelChange(m.id);
                            setShowModelPicker(false);
                          }}
                          className={`w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between ${
                            currentModel === m.id
                              ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                              : 'bg-slate-800/20 border-slate-800 hover:border-slate-700 text-slate-400'
                          }`}
                        >
                          <div>
                            <span className="font-medium text-xs text-slate-200">{m.name}</span>
                            <span className="text-[10px] text-slate-400 ml-2">({m.provider})</span>
                          </div>
                          {currentModel === m.id && <Check className="w-4 h-4 text-cyan-400" />}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: PWA Install Button + User Profile */}
      <div className="flex items-center gap-2">
        <PWAInstallButton />

        {/* User Account / Google Sign-In */}
        <div className="relative">
          {currentUser ? (
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all"
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-7 h-7 rounded-full object-cover border border-cyan-500/40"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-cyan-600/30 text-cyan-300 flex items-center justify-center font-bold text-xs">
                  {currentUser.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:border-cyan-500 hover:text-white transition-all shadow-sm"
            >
              <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {/* User Popover Menu */}
          {showUserMenu && currentUser && (
            <div className="absolute right-0 top-10 z-50 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-3 text-slate-200">
              <div className="pb-2 border-b border-slate-800">
                <p className="font-bold text-xs text-white truncate">{currentUser.displayName || 'Grok Creator'}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
              </div>

              <div className="py-2 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Firebase Sync</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Connected
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  onSignOut();
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2 mt-2 pt-2 border-t border-slate-800 text-xs font-semibold text-rose-400 hover:text-rose-300"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
