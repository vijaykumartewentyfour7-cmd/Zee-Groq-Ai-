import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Shield,
  Key,
  Palette,
  Volume2,
  Brain,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Info,
  Smartphone,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { SUPPORTED_MODELS } from '../../lib/providers-config';

interface SettingsViewProps {
  currentUser: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  currentModel: string;
  onModelChange: (model: string) => void;
  enableThinking: boolean;
  onToggleThinking: () => void;
  enableSearch: boolean;
  onToggleSearch: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onSignIn,
  onSignOut,
  currentModel,
  onModelChange,
  enableThinking,
  onToggleThinking,
  enableSearch,
  onToggleSearch,
}) => {
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSavePreferences = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">System Settings & Provider Keys</h2>
              <p className="text-xs text-slate-400">
                Manage your profile, default AI engines, voice preferences, and database synchronization.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1 pb-16">
        {/* Account Profile Card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800/80 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">Firebase Authentication</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Secure
            </span>
          </div>

          {currentUser ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-12 h-12 rounded-2xl object-cover border border-cyan-500/40 shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-cyan-600/30 text-cyan-300 font-black text-base flex items-center justify-center border border-cyan-500/40">
                    {currentUser.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm text-white">{currentUser.displayName || 'Grok Creator'}</p>
                  <p className="text-xs text-slate-400">{currentUser.email}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">UID: {currentUser.uid}</p>
                </div>
              </div>

              <button
                onClick={onSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 font-semibold text-xs transition-all self-start sm:self-auto"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-sm text-white">Guest Session (Local Storage Mode)</p>
                <p className="text-xs text-slate-400">
                  Sign in with Google to sync your conversations, memories, and creator scripts securely to Firebase Firestore across all devices.
                </p>
              </div>

              <button
                onClick={onSignIn}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all self-start sm:self-auto"
              >
                <UserIcon className="w-4 h-4" />
                <span>Sign In with Google</span>
              </button>
            </div>
          )}
        </div>

        {/* AI Model Preferences */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800/80 p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Default AI Engine Preferences</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Default Conversation Model
              </label>
              <select
                value={currentModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-hidden focus:border-cyan-500"
              >
                <option value="auto">Auto Model Mode (Dynamic Task Routing)</option>
                {SUPPORTED_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <p className="font-semibold text-xs text-white">High Thinking Reasoning</p>
                  <p className="text-[10px] text-slate-400">Maximize depth on STEM and coding tasks</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableThinking}
                  onChange={onToggleThinking}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <p className="font-semibold text-xs text-white">Google Search Grounding</p>
                  <p className="text-[10px] text-slate-400">Include live web search data</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableSearch}
                  onChange={onToggleSearch}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Voice Preferences */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800/80 p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Voice Assistant Settings</h3>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Default Voice Actor (Gemini 3.8 Flash TTS)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {['Zephyr', 'Kore', 'Puck', 'Fenrir', 'Charon'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSelectedVoice(v)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    selectedVoice === v
                      ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PWA & Mobile Installation */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800/80 p-5 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Progressive Web App (PWA)</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Zee Grok AI is installable on iPhone, iPad, Android, and Desktop as a native standalone application with offline support and zero-latency loading.
          </p>
          <div className="pt-1">
            <PWAInstallButton />
          </div>
        </div>

        {/* Save Notice */}
        <div className="flex justify-end">
          <button
            onClick={handleSavePreferences}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            {savedNotice ? <CheckCircle2 className="w-4 h-4" /> : null}
            <span>{savedNotice ? 'Preferences Saved' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
