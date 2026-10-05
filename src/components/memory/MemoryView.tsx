import React, { useState } from 'react';
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Save,
  X,
  CheckCircle2,
  Layers,
  Tag,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AIMemory } from '../../lib/types';
import { saveMemory, deleteMemory } from '../../lib/firebase';

interface MemoryViewProps {
  currentUser: User | null;
  memories: AIMemory[];
  onMemoriesUpdated: (memories: AIMemory[]) => void;
}

export const MemoryView: React.FC<MemoryViewProps> = ({
  currentUser,
  memories,
  onMemoriesUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'preference' | 'project' | 'fact' | 'custom'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'preference' | 'project' | 'fact' | 'custom'>('preference');
  const [tags, setTags] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSaveMemory = async () => {
    if (!content.trim()) return;
    const uid = currentUser?.uid || 'guest_user';

    const memoryItem: AIMemory = {
      id: editingId || `mem_${Date.now()}`,
      userId: uid,
      category,
      content: content.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveMemory(memoryItem);
      if (editingId) {
        onMemoriesUpdated(memories.map((m) => (m.id === editingId ? memoryItem : m)));
      } else {
        onMemoriesUpdated([memoryItem, ...memories]);
      }
    } catch (err) {
      console.warn('Memory save note:', err);
      onMemoriesUpdated([memoryItem, ...memories]);
    }

    setContent('');
    setTags('');
    setEditingId(null);
    setShowAddModal(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory(id);
    } catch (err) {
      console.warn(err);
    }
    onMemoriesUpdated(memories.filter((m) => m.id !== id));
  };

  const startEdit = (mem: AIMemory) => {
    setEditingId(mem.id);
    setContent(mem.content);
    setCategory(mem.category);
    setTags(mem.tags?.join(', ') || '');
    setShowAddModal(true);
  };

  const filteredMemories =
    activeTab === 'all' ? memories : memories.filter((m) => m.category === activeTab);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white flex items-center gap-1.5">
                AI Memory & Context
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300">
                  Adaptive
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Zee Grok remembers your project nuances, coding styles, and creator guidelines across all tools.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingId(null);
              setContent('');
              setTags('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold text-xs shadow-md shadow-pink-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Memory</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: `All Memories (${memories.length})` },
            { id: 'preference', label: 'Preferences' },
            { id: 'project', label: 'Project Context' },
            { id: 'fact', label: 'Saved Facts' },
            { id: 'custom', label: 'Custom Instructions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                activeTab === tab.id
                  ? 'bg-pink-950/50 border-pink-500 text-pink-200 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Memories Grid */}
        <div className="space-y-3">
          {filteredMemories.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
              <Brain className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>No memory items found in this category. Click "Add Memory" to teach Zee Grok your preferences.</p>
            </div>
          ) : (
            filteredMemories.map((mem) => (
              <div
                key={mem.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4 group hover:border-pink-500/40 transition-all shadow-sm"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 uppercase">
                      {mem.category}
                    </span>
                    {mem.tags && mem.tags.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Tag className="w-3 h-3 text-slate-500" />
                        <span>{mem.tags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {mem.content}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => startEdit(mem)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(mem.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm">
                {editingId ? 'Edit AI Memory' : 'Add New Context Memory'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mt-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-hidden"
                >
                  <option value="preference">User Preference (Coding style, voice, formatting)</option>
                  <option value="project">Project Context (App name, stack, goals)</option>
                  <option value="fact">Key Facts & Knowledge</option>
                  <option value="custom">Custom System Rule</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Memory Description <span className="text-pink-400">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="e.g. Always write TypeScript in functional style, or my YouTube channel focuses on AI tutorials for beginners..."
                  rows={3}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-pink-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Tags (Comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. tech, youtube, coding"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-pink-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMemory}
                disabled={!content.trim()}
                className="px-4 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold text-xs disabled:opacity-50"
              >
                Save Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
