import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  Upload,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  Trash2,
  Sparkles,
  Send,
  Search,
  CheckCircle2,
  Bot,
  Copy,
  Check,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { UploadedFileItem } from '../../lib/types';
import { fetchUserFiles, saveFileMetadata } from '../../lib/firebase';

interface FilesViewProps {
  currentUser: User | null;
}

export const FilesView: React.FC<FilesViewProps> = ({ currentUser }) => {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [qaHistory, setQaHistory] = useState<{ q: string; a: string; time: string }[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user files
  useEffect(() => {
    async function loadFiles() {
      const uid = currentUser?.uid || 'guest_user';
      try {
        const list = await fetchUserFiles(uid);
        if (list && list.length > 0) {
          setFiles(list);
          setSelectedFileId(list[0].id);
        }
      } catch (err) {
        console.warn('Files fetch error:', err);
      }
    }
    loadFiles();
  }, [currentUser]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const reader = new FileReader();

      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        let extractedText = '';

        // If text file, preview text directly
        if (file.type.startsWith('text/') || file.name.endsWith('.json') || file.name.endsWith('.md')) {
          try {
            extractedText = atob(dataUrl.split(',')[1]);
          } catch {
            extractedText = 'Raw document content loaded.';
          }
        } else {
          extractedText = `Document (${file.type}) loaded for Gemini Pro multimodal reasoning.`;
        }

        const uid = currentUser?.uid || 'guest_user';
        const fileItem: UploadedFileItem = {
          id: `file_${Date.now()}_${i}`,
          userId: uid,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          extractedText: extractedText.slice(0, 10000),
          dataUrl,
          createdAt: new Date().toLocaleDateString(),
        };

        setFiles((prev) => [fileItem, ...prev]);
        setSelectedFileId(fileItem.id);

        try {
          await saveFileMetadata(fileItem);
        } catch (err) {
          console.warn('Save file metadata note:', err);
        }
      };

      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAskQuestion = async () => {
    const activeFile = files.find((f) => f.id === selectedFileId);
    if (!question.trim() || !activeFile) return;

    const userQ = question;
    setQuestion('');
    setIsAnalyzing(true);

    try {
      // Build attachment or text context for Gemini
      const attachments = activeFile.dataUrl
        ? [
            {
              name: activeFile.name,
              mimeType: activeFile.mimeType,
              data: activeFile.dataUrl,
            },
          ]
        : [];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Regarding the attached file "${activeFile.name}": ${userQ}\n\n[Extracted Text Content]:\n${activeFile.extractedText || ''}`,
              attachments,
            },
          ],
          model: 'gemini-3.1-pro-preview',
          stream: false,
          enableThinking: true,
          systemPrompt:
            'You are an expert Document Intelligence and Multimodal Analyst. Provide thorough, fact-based answers extracted directly from the user document.',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Q&A analysis failed');

      setQaHistory((prev) => [
        ...prev,
        {
          q: userQ,
          a: data.content || 'Analysis complete.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      console.error('Q&A error:', err);
      setQaHistory((prev) => [
        ...prev,
        {
          q: userQ,
          a: `⚠️ Analysis error: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedFile = files.find((f) => f.id === selectedFileId);

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-purple-400" />;
    if (mime.startsWith('video/')) return <VideoIcon className="w-4 h-4 text-indigo-400" />;
    if (mime.startsWith('audio/')) return <Music className="w-4 h-4 text-cyan-400" />;
    return <FileText className="w-4 h-4 text-teal-400" />;
  };

  const handleCopy = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white flex items-center gap-1.5">
                Files & Document Intelligence
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300">
                  Gemini Pro Multimodal
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Upload PDFs, TXT, images, and audio. Ask complex questions and extract insights.
              </p>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept="*/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition-all active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Files</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">
        {/* Left Column: Files List */}
        <div className="w-full md:w-72 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col shrink-0 max-h-56 md:max-h-full">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Documents ({files.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto mt-2 space-y-1">
            {files.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                <FileText className="w-8 h-8 mx-auto text-slate-600 mb-1" />
                <p>No documents uploaded.</p>
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs border transition-all ${
                    selectedFileId === file.id
                      ? 'bg-teal-950/40 border-teal-500/50 text-teal-200 font-semibold'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {getFileIcon(file.mimeType)}
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {Math.round(file.size / 1024)} KB
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Q&A & Document Inspector */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          {selectedFile ? (
            <>
              {/* Document Header */}
              <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {getFileIcon(selectedFile.mimeType)}
                  <span className="font-bold text-white truncate max-w-xs">{selectedFile.name}</span>
                  <span className="text-[10px] text-slate-400">({selectedFile.mimeType})</span>
                </div>
              </div>

              {/* Q&A Thread Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {qaHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                    <Bot className="w-10 h-10 text-teal-400 mb-2" />
                    <p className="font-semibold text-white">Ask anything about this document</p>
                    <p className="mt-1 max-w-sm">
                      Gemini 3.1 Pro will read the document structure, extract key arguments, summarize data, or debug formulas.
                    </p>
                  </div>
                ) : (
                  qaHistory.map((item, index) => (
                    <div key={index} className="space-y-2">
                      {/* Question */}
                      <div className="ml-auto max-w-xl p-3 rounded-2xl bg-teal-950/40 border border-teal-500/30 text-xs text-teal-100">
                        <span className="font-bold text-teal-400 block mb-0.5">Question:</span>
                        {item.q}
                      </div>

                      {/* Answer */}
                      <div className="mr-auto max-w-xl p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200">
                        <div className="flex items-center justify-between mb-1 text-[10px] text-teal-400">
                          <span className="font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Gemini 3.1 Pro Analysis
                          </span>
                          <button
                            onClick={() => handleCopy(index, item.a)}
                            className="hover:text-white flex items-center gap-1"
                          >
                            {copiedIndex === index ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed">{item.a}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Question Input Bar */}
              <div className="p-3 border-t border-slate-800 bg-slate-950">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskQuestion();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={`Ask a question about ${selectedFile.name}...`}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    disabled={!question.trim() || isAnalyzing}
                    className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs disabled:opacity-40 transition-all flex items-center gap-1.5"
                  >
                    {isAnalyzing ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Ask</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 text-xs">
              <Upload className="w-10 h-10 text-slate-600 mb-2" />
              <p className="font-bold text-white text-sm">No Document Selected</p>
              <p className="mt-1">Upload or choose a file on the left to start AI Q&A.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
