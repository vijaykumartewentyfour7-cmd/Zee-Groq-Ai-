import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Play,
  CheckCircle2,
  Clock,
  Search,
  Code,
  Globe,
  Copy,
  Check,
  Zap,
  Layers,
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Download,
  Save,
  X,
  AlertCircle,
  Eye,
  Plus,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { saveCreatorArtifact } from '../../lib/firebase';
import { CreatorArtifact } from '../../lib/types';

interface AgentStudioViewProps {
  currentUser: User | null;
}

interface BatchSourceItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  dataUrl?: string; // base64
  content?: string; // raw text
}

interface BatchItemResult {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  output?: string;
  durationMs?: number;
  error?: string;
}

export const AgentStudioView: React.FC<AgentStudioViewProps> = ({ currentUser }) => {
  const [activeMode, setActiveMode] = useState<'planner' | 'batch'>('batch');

  // ==========================================
  // Single Agent Planner State
  // ==========================================
  const [taskPrompt, setTaskPrompt] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([
    'search',
    'analysis',
    'code',
    'synthesis',
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [agentOutput, setAgentOutput] = useState<string>('');
  const [copiedSingle, setCopiedSingle] = useState(false);

  // ==========================================
  // Batch Processing State
  // ==========================================
  const [batchPrompt, setBatchPrompt] = useState(
    'Extract the top 3 key insights, detect critical risks or opportunities, and provide an executive summary.'
  );
  const [batchModel, setBatchModel] = useState('gemini-3.8-flash');
  const [batchItems, setBatchItems] = useState<BatchSourceItem[]>([
    {
      id: 'demo_1',
      name: 'Q3_Financial_Brief.txt',
      mimeType: 'text/plain',
      content:
        'Revenue grew 42% YoY to $12.8M driven by enterprise expansion in APAC. Gross margins held steady at 78%. However, customer acquisition cost (CAC) increased by 19% due to competitive ad bidding. Cash reserves stand at $24M with an 18-month runway.',
    },
    {
      id: 'demo_2',
      name: 'Product_Roadmap_V2.txt',
      mimeType: 'text/plain',
      content:
        'Milestone 1: Launch Multi-Model Auto Routing and mobile-first PWA. Milestone 2: Expand Google Veo video generation to 1080p landscape. Milestone 3: Implement real-time voice translation via Live API with zero-latency audio streaming.',
    },
  ]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchItemResult[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ total: number; completed: number; timeMs: number } | null>(null);
  const [selectedResultModal, setSelectedResultModal] = useState<BatchItemResult | null>(null);
  const [copiedBatchAll, setCopiedBatchAll] = useState(false);
  const [savedBatchAll, setSavedBatchAll] = useState(false);
  const [manualTextTitle, setManualTextTitle] = useState('');
  const [manualTextContent, setManualTextContent] = useState('');
  const [showAddTextModal, setShowAddTextModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableTools = [
    { id: 'search', label: 'Web Search Grounding', icon: Globe },
    { id: 'analysis', label: 'Multimodal Document Analysis', icon: Search },
    { id: 'code', label: 'Code Execution & Synthesis', icon: Code },
    { id: 'synthesis', label: 'Executive Report Formatting', icon: Zap },
  ];

  const batchPromptPresets = [
    {
      label: 'Executive 3-Point Summary',
      prompt: 'Extract the top 3 critical takeaways, detect key sentiment, and generate an executive bullet-point summary.',
    },
    {
      label: 'Risk & Compliance Audit',
      prompt: 'Identify all operational, financial, and technical risks mentioned in this document. Rate each risk (Low/Med/High) and suggest immediate mitigations.',
    },
    {
      label: 'Key Metrics & Data Extraction',
      prompt: 'Extract all quantifiable metrics, dates, percentages, and financial figures from this item into a clean markdown table.',
    },
    {
      label: 'Viral Social Angles & Hooks',
      prompt: 'Analyze this source and generate 5 viral hooks, 3 content ideas, and 10 relevant hashtags for YouTube Shorts / TikTok.',
    },
    {
      label: 'Code Quality & Security Audit',
      prompt: 'Review this source for security vulnerabilities, architectural anti-patterns, and performance bottlenecks. Provide optimized refactored solutions.',
    },
  ];

  const toggleTool = (id: string) => {
    setSelectedTools((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Run Single Agent Task
  const handleRunSingleAgent = async () => {
    if (!taskPrompt.trim() || isRunning) return;
    setIsRunning(true);
    setCopiedSingle(false);

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: taskPrompt,
          permittedTools: selectedTools,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Agent execution failed');
      setAgentOutput(data.result || '');
    } catch (err: any) {
      console.error('Agent error:', err);
      setAgentOutput(`⚠️ Agent Execution Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Run Batch Processing Engine
  const handleRunBatch = async () => {
    if (!batchPrompt.trim() || batchItems.length === 0 || isBatchRunning) return;
    setIsBatchRunning(true);
    setCopiedBatchAll(false);
    setSavedBatchAll(false);

    // Initialize pending results
    const initialResults: BatchItemResult[] = batchItems.map((item) => ({
      id: item.id,
      name: item.name,
      status: 'processing',
    }));
    setBatchResults(initialResults);
    setBatchProgress({ total: batchItems.length, completed: 0, timeMs: 0 });

    try {
      const res = await fetch('/api/agent/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: batchPrompt,
          items: batchItems,
          model: batchModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Batch execution failed');

      setBatchResults(data.results || []);
      setBatchProgress({
        total: data.totalItems || batchItems.length,
        completed: data.completedItems || batchItems.length,
        timeMs: data.executionTimeMs || 0,
      });
    } catch (err: any) {
      console.error('Batch error:', err);
      setBatchResults((prev) =>
        prev.map((r) => ({
          ...r,
          status: 'failed',
          output: `Batch processing failed: ${err.message}`,
        }))
      );
    } finally {
      setIsBatchRunning(false);
    }
  };

  // Upload multiple files directly to batch items
  const handleBatchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        let content = '';

        if (
          file.type.startsWith('text/') ||
          file.name.endsWith('.json') ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.csv') ||
          file.name.endsWith('.ts') ||
          file.name.endsWith('.tsx') ||
          file.name.endsWith('.js')
        ) {
          try {
            content = atob(dataUrl.split(',')[1]);
          } catch {
            content = 'Plaintext source loaded.';
          }
        }

        const newItem: BatchSourceItem = {
          id: `batch_${Date.now()}_${i}`,
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
          content,
        };

        setBatchItems((prev) => [newItem, ...prev]);
      };

      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Add manual snippet item
  const handleAddManualSnippet = () => {
    if (!manualTextContent.trim()) return;
    const title = manualTextTitle.trim() || `Snippet_${batchItems.length + 1}.txt`;
    const newItem: BatchSourceItem = {
      id: `manual_${Date.now()}`,
      name: title,
      mimeType: 'text/plain',
      content: manualTextContent.trim(),
    };
    setBatchItems((prev) => [newItem, ...prev]);
    setManualTextTitle('');
    setManualTextContent('');
    setShowAddTextModal(false);
  };

  // Remove item
  const handleRemoveBatchItem = (id: string) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Export all batch results as Markdown
  const handleDownloadMarkdown = () => {
    if (batchResults.length === 0) return;
    let md = `# Zee Grok AI - Batch Execution Report\n\n`;
    md += `**Batch Prompt**: "${batchPrompt}"\n`;
    md += `**Model**: ${batchModel}\n`;
    md += `**Processed Items**: ${batchResults.length}\n`;
    md += `**Generated**: ${new Date().toLocaleString()}\n\n---\n\n`;

    batchResults.forEach((res, idx) => {
      md += `## ${idx + 1}. Source: ${res.name}\n`;
      md += `*Status: ${res.status.toUpperCase()} (${res.durationMs || 0}ms)*\n\n`;
      md += `${res.output || 'No response'}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeegrok-batch-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export all batch results as JSON
  const handleDownloadJSON = () => {
    if (batchResults.length === 0) return;
    const jsonStr = JSON.stringify(
      {
        prompt: batchPrompt,
        model: batchModel,
        timestamp: new Date().toISOString(),
        items: batchResults,
      },
      null,
      2
    );
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeegrok-batch-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save all to Firestore Creator Artifacts
  const handleSaveAllToFirestore = async () => {
    if (batchResults.length === 0) return;
    const uid = currentUser?.uid || 'guest_user';

    const consolidatedContent = batchResults
      .map((r) => `### Source: ${r.name}\n${r.output}\n`)
      .join('\n\n---\n\n');

    const artifact: CreatorArtifact = {
      id: `batch_art_${Date.now()}`,
      userId: uid,
      type: 'agent_task',
      title: `Batch (${batchResults.length} items): ${batchPrompt.slice(0, 30)}`,
      prompt: batchPrompt,
      content: consolidatedContent,
      createdAt: new Date().toISOString(),
    };

    try {
      await saveCreatorArtifact(artifact);
      setSavedBatchAll(true);
      setTimeout(() => setSavedBatchAll(false), 2500);
    } catch (err) {
      console.warn('Batch artifact save note:', err);
      setSavedBatchAll(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header with Mode Switcher */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white flex items-center gap-1.5">
                AI Agent Studio
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                  Batch Multi-File Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Run prompts across multiple files simultaneously or execute multi-step autonomous planning.
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/60 text-xs">
            <button
              onClick={() => setActiveMode('batch')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeMode === 'batch'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batch Processor</span>
            </button>
            <button
              onClick={() => setActiveMode('planner')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeMode === 'planner'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Autonomous Planner</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1 pb-16">
        {/* ============================================================== */}
        {/* BATCH PROCESSING MODULE VIEW */}
        {/* ============================================================== */}
        {activeMode === 'batch' && (
          <div className="space-y-6">
            {/* Input Config Card */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800/80 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  1. Unified Prompt & Presets
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Model:</span>
                  <select
                    value={batchModel}
                    onChange={(e) => setBatchModel(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-cyan-300 text-xs rounded-lg px-2.5 py-1 focus:outline-hidden"
                  >
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (Fast & Balanced)</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep STEM Thinking)</option>
                    <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Bulk Speed)</option>
                  </select>
                </div>
              </div>

              {/* Preset Chips */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Quick Preset Instructions:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {batchPromptPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBatchPrompt(preset.prompt)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                        batchPrompt === preset.prompt
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Textarea */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Prompt to apply to every file/data source <span className="text-cyan-400">*</span>
                </label>
                <textarea
                  value={batchPrompt}
                  onChange={(e) => setBatchPrompt(e.target.value)}
                  placeholder="e.g. Extract key risks, summarize in 3 bullet points, and highlight financial metrics..."
                  rows={3}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-cyan-500 resize-none leading-relaxed"
                />
              </div>

              {/* Source Items / Files Queue Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>2. Input Files & Data Sources Queue ({batchItems.length})</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleBatchFileUpload}
                      multiple
                      accept="*/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Files</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddTextModal(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Text Snippet</span>
                    </button>
                  </div>
                </div>

                {/* Items Queue list */}
                {batchItems.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-950 border border-dashed border-slate-800 text-center text-slate-400 text-xs">
                    <Upload className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                    <p>No items in the batch queue. Upload files or add text snippets above.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {batchItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {item.mimeType.startsWith('image/') ? (
                            <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <p className="font-semibold text-white truncate text-[11px]">{item.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {item.size ? `${Math.round(item.size / 1024)} KB` : `${item.content?.length || 0} chars`}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveBatchItem(item.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleRunBatch}
                disabled={!batchPrompt.trim() || batchItems.length === 0 || isBatchRunning}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isBatchRunning ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-white" />
                    <span>Executing Batch across {batchItems.length} sources simultaneously...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4 text-white" />
                    <span>Run Batch on {batchItems.length} Sources Simultaneously</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Execution Progress Bar */}
            {isBatchRunning && (
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                    Processing {batchItems.length} items in parallel...
                  </span>
                  <span>Model: {batchModel}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full w-full animate-pulse" />
                </div>
              </div>
            )}

            {/* Batch Results Matrix */}
            {batchResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Batch Execution Results ({batchResults.length} items)
                    </h3>
                    {batchProgress && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Completed {batchProgress.completed} of {batchProgress.total} in{' '}
                        <span className="text-cyan-300 font-semibold">{batchProgress.timeMs}ms</span>
                      </p>
                    )}
                  </div>

                  {/* Batch Export Suite */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleDownloadMarkdown}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                      title="Download full report as Markdown"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Markdown</span>
                    </button>

                    <button
                      onClick={handleDownloadJSON}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                      title="Download as JSON"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-400" />
                      <span>JSON</span>
                    </button>

                    <button
                      onClick={handleSaveAllToFirestore}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 text-xs font-semibold"
                    >
                      {savedBatchAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{savedBatchAll ? 'Saved' : 'Save to Cloud'}</span>
                    </button>
                  </div>
                </div>

                {/* Results Cards List */}
                <div className="space-y-3">
                  {batchResults.map((res, idx) => (
                    <div
                      key={res.id || idx}
                      className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 hover:border-slate-700 transition-all shadow-md"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-xs text-white">{res.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {res.durationMs && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {res.durationMs}ms
                            </span>
                          )}

                          {res.status === 'completed' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </span>
                          )}

                          {res.status === 'failed' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Failed
                            </span>
                          )}

                          <button
                            onClick={() => setSelectedResultModal(res)}
                            className="p-1 rounded text-slate-400 hover:text-white"
                            title="Expand full deliverable"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content Preview */}
                      <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto p-2.5 rounded-xl bg-slate-950 font-mono">
                        {res.output || (res.status === 'processing' ? 'Generating answer...' : 'No output')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* SINGLE AUTONOMOUS PLANNER VIEW */}
        {/* ============================================================== */}
        {activeMode === 'planner' && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-900 border border-slate-800/80 p-5 space-y-4 shadow-xl">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Goal or Complex Research Task <span className="text-blue-400">*</span>
                </label>
                <textarea
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  placeholder="e.g. Conduct a comprehensive technical audit of the top 3 open-source vector databases (Chroma, Qdrant, Milvus), comparing benchmarks, memory footprints, and Python vs Go architectures..."
                  rows={3}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 resize-none leading-relaxed"
                />
              </div>

              {/* Permitted Tools Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Permitted Autonomous Tools
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {availableTools.map((tool) => {
                    const Icon = tool.icon;
                    const isSelected = selectedTools.includes(tool.id);
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => toggleTool(tool.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                          isSelected
                            ? 'bg-blue-950/40 border-blue-500 text-blue-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0 text-blue-400" />
                        <span className="truncate">{tool.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleRunSingleAgent}
                disabled={!taskPrompt.trim() || isRunning}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/25 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isRunning ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-white" />
                    <span>Agent Orchestrating & Thinking...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-white" />
                    <span>Launch Autonomous Execution</span>
                  </>
                )}
              </button>
            </div>

            {/* Single Output Stream */}
            {agentOutput && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Autonomous Deliverable Completed
                  </span>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(agentOutput);
                      setCopiedSingle(true);
                      setTimeout(() => setCopiedSingle(false), 2000);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                  >
                    {copiedSingle ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSingle ? 'Copied' : 'Copy Deliverable'}</span>
                  </button>
                </div>

                <div className="prose prose-invert max-w-none text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto p-3 bg-slate-950/70 rounded-xl border border-slate-800 font-mono">
                  {agentOutput}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Result Lightbox Modal */}
      {selectedResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{selectedResultModal.name}</span>
                <span className="text-[10px] text-cyan-300 font-mono">
                  {selectedResultModal.durationMs}ms
                </span>
              </div>
              <button
                onClick={() => setSelectedResultModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-3 p-3 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-xs whitespace-pre-wrap leading-relaxed">
              {selectedResultModal.output}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedResultModal.output || '');
                  alert('Copied to clipboard!');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Output</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Text Snippet Modal */}
      {showAddTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Add Manual Data Snippet</h3>
              <button onClick={() => setShowAddTextModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Snippet Title / Label</label>
              <input
                type="text"
                value={manualTextTitle}
                onChange={(e) => setManualTextTitle(e.target.value)}
                placeholder="e.g. Competitor_Analysis.txt"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Content / Data</label>
              <textarea
                value={manualTextContent}
                onChange={(e) => setManualTextContent(e.target.value)}
                placeholder="Paste text, article content, logs, or JSON data here..."
                rows={5}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-cyan-500 resize-none font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddTextModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManualSnippet}
                disabled={!manualTextContent.trim()}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs disabled:opacity-50"
              >
                Add to Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
