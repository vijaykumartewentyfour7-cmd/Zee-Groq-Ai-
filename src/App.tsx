/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser, fetchUserMemories } from './lib/firebase';
import { AIMemory } from './lib/types';
import { Navigation, NavTab } from './components/common/Navigation';
import { Header } from './components/common/Header';
import { StudioHubModal } from './components/common/StudioHubModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';

// Views
import { ChatView } from './components/chat/ChatView';
import { VoiceAssistantView } from './components/voice/VoiceAssistantView';
import { CreatorStudioView } from './components/creator/CreatorStudioView';
import { YouTubeEngineView } from './components/youtube/YouTubeEngineView';
import { ImageStudioView } from './components/image/ImageStudioView';
import { VideoStudioView } from './components/video/VideoStudioView';
import { VoiceStudioView } from './components/voice-studio/VoiceStudioView';
import { FilesView } from './components/files/FilesView';
import { MemoryView } from './components/memory/MemoryView';
import { AgentStudioView } from './components/agent/AgentStudioView';
import { ModelManagerView } from './components/models/ModelManagerView';
import { SettingsView } from './components/settings/SettingsView';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('chat');
  const [currentModel, setCurrentModel] = useState<string>('gemini-3.8-flash');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isHubModalOpen, setIsHubModalOpen] = useState(false);
  const [enableThinking, setEnableThinking] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  const [enableMaps, setEnableMaps] = useState(false);
  const [userMemories, setUserMemories] = useState<AIMemory[]>([]);

  // Workflow bridge states (e.g. sending script from YouTube engine to Voice Studio or prompt to Image Studio)
  const [bridgedVoiceScript, setBridgedVoiceScript] = useState<string>('');
  const [bridgedImagePrompt, setBridgedImagePrompt] = useState<string>('');

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const mems = await fetchUserMemories(user.uid);
          if (mems) setUserMemories(mems);
        } catch (err) {
          console.warn('Memory load note:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign In failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign Out failed:', err);
    }
  };

  // Cross-studio navigation workflows
  const handleNavigateToVoice = (text: string) => {
    setBridgedVoiceScript(text);
    setCurrentTab('voice_studio');
  };

  const handleNavigateToImage = (prompt: string) => {
    setBridgedImagePrompt(prompt);
    setCurrentTab('image');
  };

  const getTabTitle = (tab: NavTab): string => {
    switch (tab) {
      case 'chat':
        return 'AI Chat';
      case 'voice':
        return 'Voice Assistant';
      case 'creator':
        return 'Creator Studio';
      case 'youtube':
        return 'YouTube Creator Engine';
      case 'image':
        return 'Image Studio (Imagen)';
      case 'video':
        return 'Video Studio (Veo 3)';
      case 'voice_studio':
        return 'AI Voice Studio (TTS)';
      case 'files':
        return 'Files & Documents';
      case 'memory':
        return 'AI Memory Context';
      case 'agent':
        return 'Autonomous Agent';
      case 'models':
        return 'Multi-Model Engine';
      case 'settings':
        return 'Settings & Provider APIs';
      default:
        return 'Zee Grok AI';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Offline Toast Indicator */}
      <OfflineIndicator />

      {/* Responsive Navigation: Desktop/Tablet Sidebar + Mobile Bottom Navigation */}
      <Navigation
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        openHubModal={() => setIsHubModalOpen(true)}
      />

      {/* Main Studio Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden pb-14 md:pb-0">
        {/* Top Header */}
        <Header
          currentModel={currentModel}
          onModelChange={(modelId) => setCurrentModel(modelId)}
          currentUser={currentUser}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          enableThinking={enableThinking}
          onToggleThinking={() => setEnableThinking(!enableThinking)}
          enableSearch={enableSearch}
          onToggleSearch={() => setEnableSearch(!enableSearch)}
          activeTabTitle={getTabTitle(currentTab)}
        />

        {/* View Switcher Container */}
        <main className="flex-1 overflow-hidden relative">
          {currentTab === 'chat' && (
            <ChatView
              currentUser={currentUser}
              currentModel={currentModel}
              onModelChange={(m) => setCurrentModel(m)}
              enableThinking={enableThinking}
              enableSearch={enableSearch}
              enableMaps={enableMaps}
              userMemories={userMemories}
            />
          )}

          {currentTab === 'voice' && (
            <VoiceAssistantView
              userMemories={userMemories}
              enableThinking={enableThinking}
            />
          )}

          {currentTab === 'creator' && (
            <CreatorStudioView
              currentUser={currentUser}
              onNavigateToVoice={handleNavigateToVoice}
              onNavigateToImage={handleNavigateToImage}
            />
          )}

          {currentTab === 'youtube' && (
            <YouTubeEngineView
              currentUser={currentUser}
              onSendToImageStudio={handleNavigateToImage}
              onSendToVoiceStudio={handleNavigateToVoice}
            />
          )}

          {currentTab === 'image' && (
            <ImageStudioView
              currentUser={currentUser}
              initialPrompt={bridgedImagePrompt}
            />
          )}

          {currentTab === 'video' && (
            <VideoStudioView currentUser={currentUser} />
          )}

          {currentTab === 'voice_studio' && (
            <VoiceStudioView
              currentUser={currentUser}
              initialText={bridgedVoiceScript}
            />
          )}

          {currentTab === 'files' && (
            <FilesView currentUser={currentUser} />
          )}

          {currentTab === 'memory' && (
            <MemoryView
              currentUser={currentUser}
              memories={userMemories}
              onMemoriesUpdated={(mems) => setUserMemories(mems)}
            />
          )}

          {currentTab === 'agent' && (
            <AgentStudioView currentUser={currentUser} />
          )}

          {currentTab === 'models' && (
            <ModelManagerView
              currentModel={currentModel}
              onSelectModel={(m) => {
                setCurrentModel(m);
                setCurrentTab('chat');
              }}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              currentModel={currentModel}
              onModelChange={(m) => setCurrentModel(m)}
              enableThinking={enableThinking}
              onToggleThinking={() => setEnableThinking(!enableThinking)}
              enableSearch={enableSearch}
              onToggleSearch={() => setEnableSearch(!enableSearch)}
            />
          )}
        </main>
      </div>

      {/* Mobile Studio Hub Drawer */}
      <StudioHubModal
        isOpen={isHubModalOpen}
        onClose={() => setIsHubModalOpen(false)}
        onSelectTab={(tab) => setCurrentTab(tab)}
      />
    </div>
  );
}
