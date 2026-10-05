import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Square,
  RefreshCw,
  Copy,
  Check,
  Paperclip,
  X,
  Plus,
  Trash2,
  Edit2,
  Search,
  Brain,
  Globe,
  Sliders,
  ChevronRight,
  Clock,
  MessageSquare,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ChatMessage, Conversation, AIMemory } from '../../lib/types';
import { resolveAutoModel, SUPPORTED_MODELS } from '../../lib/providers-config';
import {
  fetchUserConversations,
  saveConversation,
  deleteConversation,
  fetchConversationMessages,
  saveMessage,
} from '../../lib/firebase';

interface ChatViewProps {
  currentUser: User | null;
  currentModel: string;
  onModelChange: (model: string) => void;
  enableThinking: boolean;
  enableSearch: boolean;
  enableMaps: boolean;
  userMemories: AIMemory[];
}

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  currentModel,
  onModelChange,
  enableThinking,
  enableSearch,
  enableMaps,
  userMemories,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; mimeType: string; data: string; size?: number }[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversations on user change
  useEffect(() => {
    async function loadConversations() {
      if (!currentUser) {
        // Guest mode: load strictly from local storage
        const local = localStorage.getItem('zeegrok_conversations');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setConversations(parsed);
              setActiveConversationId(parsed[0].id);
              return;
            }
          } catch {}
        }
        const guestConv: Conversation = {
          id: `conv_${Date.now()}`,
          userId: 'guest_user',
          title: 'New Conversation',
          model: currentModel,
          provider: 'gemini',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('zeegrok_conversations', JSON.stringify([guestConv]));
        setConversations([guestConv]);
        setActiveConversationId(guestConv.id);
        return;
      }

      // Authenticated user: load from Firestore
      try {
        const list = await fetchUserConversations(currentUser.uid);
        if (list && list.length > 0) {
          setConversations(list);
          setActiveConversationId(list[0].id);
        } else {
          // Initialize first conversation for signed in user
          const firstConv: Conversation = {
            id: `conv_${Date.now()}`,
            userId: currentUser.uid,
            title: 'New Conversation',
            model: currentModel,
            provider: 'gemini',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await saveConversation(firstConv);
          setConversations([firstConv]);
          setActiveConversationId(firstConv.id);
        }
      } catch (err) {
        console.warn('Conversations fetch note:', err);
      }
    }
    loadConversations();
  }, [currentUser]);

  // Load messages when active conversation changes
  useEffect(() => {
    async function loadMessages() {
      if (!activeConversationId) return;

      if (!currentUser) {
        // Guest mode: load strictly from local storage
        const local = localStorage.getItem(`zeegrok_msgs_${activeConversationId}`);
        if (local) {
          try {
            setMessages(JSON.parse(local));
            return;
          } catch {}
        }
        setMessages([]);
        return;
      }

      // Authenticated user: load from Firestore
      try {
        const msgs = await fetchConversationMessages(activeConversationId, currentUser.uid);
        setMessages(msgs || []);
      } catch (err) {
        console.warn('Messages fetch note:', err);
      }
    }
    loadMessages();
  }, [activeConversationId, currentUser]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Handle new conversation creation
  const handleNewConversation = async () => {
    const uid = currentUser?.uid || 'guest_user';
    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      userId: uid,
      title: 'New Conversation',
      model: currentModel,
      provider: 'gemini',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveConversation(newConv);
    } catch (err) {
      console.warn(err);
    }
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setMessages([]);
    setShowHistoryDrawer(false);
  };

  // Handle deleting conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(convId);
    } catch (err) {
      console.warn(err);
    }
    const remaining = conversations.filter((c) => c.id !== convId);
    setConversations(remaining);
    if (activeConversationId === convId) {
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
      } else {
        handleNewConversation();
      }
    }
  };

  // Handle renaming conversation
  const handleRenameSubmit = async (convId: string) => {
    if (!newTitle.trim()) {
      setRenamingId(null);
      return;
    }
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      const updated = { ...conv, title: newTitle.trim(), updatedAt: new Date().toISOString() };
      try {
        await saveConversation(updated);
      } catch (err) {
        console.warn(err);
      }
      setConversations((prev) => prev.map((c) => (c.id === convId ? updated : c)));
    }
    setRenamingId(null);
    setNewTitle('');
  };

  // Handle File Upload Attachment
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            mimeType: file.type || 'text/plain',
            data: base64,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Copy text
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Send Message
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if ((!promptToSend.trim() && attachments.length === 0) || isGenerating) return;

    const uid = currentUser?.uid || 'guest_user';
    const convId = activeConversationId || `conv_${Date.now()}`;

    // Auto Model routing if auto mode selected or default
    let effectiveModel = currentModel;
    if (effectiveModel === 'auto' || effectiveModel === 'auto-router') {
      const resolution = resolveAutoModel(promptToSend, attachments.length > 0);
      effectiveModel = resolution.modelId;
    }

    // Build user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId: convId,
      userId: uid,
      role: 'user',
      content: promptToSend.trim(),
      modelUsed: effectiveModel,
      providerUsed: 'gemini',
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      createdAt: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputPrompt('');
    setAttachments([]);
    setIsGenerating(true);

    // Save user message to Firestore
    try {
      await saveMessage(userMsg);
      // Auto-title conversation on first message
      if (messages.length === 0) {
        const truncatedTitle = promptToSend.slice(0, 30) || 'Image Analysis';
        const conv = conversations.find((c) => c.id === convId);
        if (conv) {
          const updated = { ...conv, title: truncatedTitle, updatedAt: new Date().toISOString() };
          await saveConversation(updated);
          setConversations((prev) => prev.map((c) => (c.id === convId ? updated : c)));
        }
      }
    } catch (err) {
      console.warn('Sync notice:', err);
    }

    // Prepare assistant placeholder message
    const assistantMsgId = `msg_${Date.now() + 1}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      conversationId: convId,
      userId: uid,
      role: 'assistant',
      content: '',
      modelUsed: effectiveModel,
      providerUsed: 'gemini',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, assistantPlaceholder]);

    // Setup AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          model: effectiveModel,
          enableThinking,
          enableSearch,
          enableMaps,
          systemPrompt,
          memories: userMemories,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (!dataStr) continue;

              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantMsgId ? { ...m, content: accumulatedText } : m))
                  );
                } else if (parsed.error) {
                  accumulatedText += `\n[Error: ${parsed.error}]`;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantMsgId ? { ...m, content: accumulatedText } : m))
                  );
                }
              } catch {
                // partial chunk ignore
              }
            }
          }
        }
      }

      // Final save of assistant message
      const finalizedAssistantMsg: ChatMessage = {
        ...assistantPlaceholder,
        content: accumulatedText || 'No response generated.',
      };
      await saveMessage(finalizedAssistantMsg);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generation aborted by user');
      } else {
        console.error('Chat error:', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: `⚠️ Generation error: ${err.message || 'Failed to connect to AI server'}. Please check your connection and retry.`,
                }
              : m
          )
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Stop Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  // Regenerate Response
  const handleRegenerate = () => {
    if (messages.length === 0) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      // Remove last assistant message
      setMessages((prev) => {
        const withoutLast = [...prev];
        if (withoutLast[withoutLast.length - 1]?.role === 'assistant') {
          withoutLast.pop();
        }
        return withoutLast;
      });
      handleSendMessage(lastUserMsg.content);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950 text-slate-100 relative">
      {/* ============================================================== */}
      {/* CONVERSATION HISTORY DRAWER / SIDEBAR (Collapsible) */}
      {/* ============================================================== */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-40 flex">
          <div className="w-72 bg-slate-900 border-r border-slate-800 p-4 flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm">Chat History</h3>
              </div>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* New Chat Button */}
            <button
              onClick={handleNewConversation}
              className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-xs text-white shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>

            {/* Search Input */}
            <div className="relative mt-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchHistoryQuery}
                onChange={(e) => setSearchHistoryQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            {/* Conversation List */}
            <div className="flex-1 mt-3 space-y-1 overflow-y-auto pr-1">
              {conversations
                .filter((c) => c.title.toLowerCase().includes(searchHistoryQuery.toLowerCase()))
                .map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        setShowHistoryDrawer(false);
                      }}
                      className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                        isActive
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 font-semibold'
                          : 'bg-slate-800/20 border-transparent hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      {renamingId === conv.id ? (
                        <input
                          type="text"
                          value={newTitle}
                          autoFocus
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit(conv.id);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onBlur={() => handleRenameSubmit(conv.id)}
                          className="w-full bg-slate-800 px-1.5 py-0.5 rounded text-xs text-white border border-cyan-500"
                        />
                      ) : (
                        <div className="flex items-center gap-2 truncate">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{conv.title}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(conv.id);
                            setNewTitle(conv.title);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="flex-1 bg-black/60 backdrop-blur-xs" onClick={() => setShowHistoryDrawer(false)} />
        </div>
      )}

      {/* ============================================================== */}
      {/* MAIN CHAT AREA */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Sub-Header: Thread Actions & Controls */}
        <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryDrawer(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium"
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Threads</span>
            </button>
            <button
              onClick={handleNewConversation}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>New</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {enableThinking && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-[10px] text-purple-300 font-semibold">
                <Brain className="w-3 h-3 text-purple-400" />
                Thinking Active
              </span>
            )}
            {enableSearch && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-500/40 text-[10px] text-blue-300 font-semibold">
                <Globe className="w-3 h-3 text-blue-400" />
                Search Grounded
              </span>
            )}
            <button
              onClick={() => setShowSystemModal(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="System Prompt"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-6">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-cyan-500/20 mb-4 border border-cyan-400/40">
                Z
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">Zee Grok AI</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                All-in-one Multi-Model Assistant & Creator Studio. Ask anything, brainstorm viral YouTube scripts, analyze images, or request deep STEM thinking.
              </p>

              {/* Starter Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full text-left">
                {[
                  { title: 'YouTube Script', prompt: 'Write a 60-second viral YouTube Shorts script about the latest breakthroughs in AI.' },
                  { title: 'Analyze STEM Code', prompt: 'Explain the difference between Dijkstra and A* pathfinding with a TypeScript implementation.' },
                  { title: 'Search Grounding', prompt: 'What are the top 3 tech headlines today and what makes them significant?' },
                  { title: 'Creative Hook', prompt: 'Give me 5 irresistible opening hooks for a video about financial freedom.' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-xs text-slate-300 transition-all hover:bg-slate-850"
                  >
                    <p className="font-bold text-white text-[11px] mb-0.5">{item.title}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{item.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      isUser
                        ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white'
                        : 'bg-slate-800 border border-slate-700 text-cyan-400'
                    }`}
                  >
                    {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed max-w-[85vw] sm:max-w-xl group relative ${
                      isUser
                        ? 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-100 rounded-tr-none'
                        : 'bg-slate-900 border border-slate-800/90 text-slate-200 rounded-tl-none shadow-md'
                    }`}
                  >
                    {/* Attachments preview */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {msg.attachments.map((att, attIdx) => (
                          <div key={attIdx} className="rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                            {att.mimeType.startsWith('image/') ? (
                              <img src={att.data} alt={att.name} className="max-h-40 rounded object-cover" />
                            ) : (
                              <div className="p-2 text-[10px] text-slate-300 flex items-center gap-1.5">
                                <Paperclip className="w-3 h-3 text-cyan-400" />
                                <span className="truncate max-w-[120px]">{att.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                    {/* Footer / Copy / Info */}
                    <div className="flex items-center justify-between gap-3 mt-2 pt-1 border-t border-slate-800/50 text-[10px] text-slate-400">
                      <span>{msg.modelUsed || 'Gemini'}</span>
                      <button
                        onClick={() => handleCopyText(msg.id, msg.content)}
                        className="hover:text-white flex items-center gap-1"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Controls & Typing Bar */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
          {/* Active Attachments Preview Chips */}
          {attachments.length > 0 && (
            <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-850 border border-slate-700 text-xs text-slate-200"
                >
                  <Paperclip className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate max-w-[100px] text-[11px]">{att.name}</span>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-0.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Prompt Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2 max-w-4xl mx-auto"
          >
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*,text/*,application/pdf,audio/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-400 hover:text-white transition-all shrink-0"
              title="Attach File / Photo"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Textarea Input */}
            <div className="flex-1 relative rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-cyan-500/60 shadow-inner">
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder="Ask Zee Grok AI, write a script, or paste code..."
                className="w-full bg-transparent px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-hidden resize-none max-h-32"
              />
            </div>

            {/* Action Buttons: Stop vs Send / Regenerate */}
            {isGenerating ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shrink-0 shadow-md shadow-rose-600/20 active:scale-95 transition-all"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <div className="flex items-center gap-1 shrink-0">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:text-white text-slate-400 transition-all"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() && attachments.length === 0}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20 active:scale-95 transition-all font-bold"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* System Prompt Customization Modal */}
      {showSystemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm">System Prompt & Persona</h3>
              <button onClick={() => setShowSystemModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Customize how Zee Grok responds. You can specify tone, role, format constraints, or personality.
            </p>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g. You are a senior software architect who gives concise code snippets with performance analysis..."
              rows={4}
              className="mt-3 w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-xs text-slate-200 focus:outline-hidden focus:border-cyan-500 resize-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setSystemPrompt('')}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Reset
              </button>
              <button
                onClick={() => setShowSystemModal(false)}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Save Persona
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
