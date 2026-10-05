import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  Copy,
  Check,
  Upload,
  X,
  Maximize2,
  RefreshCw,
  Palette,
  Sliders,
  Save,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { saveCreatorArtifact } from '../../lib/firebase';
import { CreatorArtifact } from '../../lib/types';

interface ImageStudioViewProps {
  currentUser: User | null;
  initialPrompt?: string;
}

export const ImageStudioView: React.FC<ImageStudioViewProps> = ({
  currentUser,
  initialPrompt = '',
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [stylePreset, setStylePreset] = useState('Hyper-Realistic');
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{ id: string; url: string; prompt: string; aspect: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectRatios = [
    { id: '1:1', label: '1:1 Square', iconClass: 'w-4 h-4' },
    { id: '16:9', label: '16:9 Landscape', iconClass: 'w-5 h-3' },
    { id: '9:16', label: '9:16 Story / Shorts', iconClass: 'w-3 h-5' },
    { id: '4:3', label: '4:3 Standard', iconClass: 'w-4 h-3' },
    { id: '3:4', label: '3:4 Portrait', iconClass: 'w-3 h-4' },
    { id: '21:9', label: '21:9 Ultrawide', iconClass: 'w-6 h-2.5' },
  ];

  const stylePresets = [
    'Hyper-Realistic',
    'Cinematic Lighting',
    'Cyberpunk Neon',
    '3D Pixar Render',
    'Anime Aesthetic',
    'Minimalist Flat Art',
    'Dark Fantasy Oil',
  ];

  const handleBaseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setBaseImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          stylePreset,
          baseImage: baseImage || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image generation failed');

      if (data.imageUrl) {
        const newImg = {
          id: `img_${Date.now()}`,
          url: data.imageUrl,
          prompt,
          aspect: aspectRatio,
        };
        setGeneratedImages((prev) => [newImg, ...prev]);

        // Save to Firestore artifacts
        const uid = currentUser?.uid || 'guest_user';
        const artifact: CreatorArtifact = {
          id: newImg.id,
          userId: uid,
          type: 'image',
          title: `Image: ${prompt.slice(0, 30)}`,
          prompt,
          mediaUrl: data.imageUrl,
          content: `Aspect ratio: ${aspectRatio}, Style: ${stylePreset}`,
          createdAt: new Date().toISOString(),
        };
        saveCreatorArtifact(artifact).catch(console.warn);
      }
    } catch (err: any) {
      console.error('Image gen error:', err);
      setErrorMsg(err.message || 'Generation failed. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (url: string, filename = 'zeegrok-image.png') => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white flex items-center gap-1.5">
                Image Studio
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                  Gemini Flash Image
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Text-to-image, photo-to-image editing, and studio aspect ratio control.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* Creator Control Box */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800/80 p-5 space-y-4 shadow-xl">
          {/* Prompt */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Describe the image you want to create or edit <span className="text-purple-400">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A hyper-realistic cybernetic robot barista pouring glowing latte art in a rainy neon Tokyo alleyway..."
              rows={2}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-purple-500 resize-none"
            />
          </div>

          {/* Aspect Ratio Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Aspect Ratio</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {aspectRatios.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAspectRatio(item.id)}
                  className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                    aspectRatio === item.id
                      ? 'bg-purple-950/50 border-purple-500 text-purple-200 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-[11px]">{item.id}</span>
                  <span className="text-[9px] text-slate-400 line-clamp-1">{item.label.split(' ')[1] || item.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Aesthetic Preset</label>
            <div className="flex flex-wrap gap-1.5">
              {stylePresets.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setStylePreset(style)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    stylePreset === style
                      ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Image-to-Image Starting Photo Attachment */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Starting Photo (Optional for Image-to-Image Editing)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleBaseImageUpload}
              accept="image/*"
              className="hidden"
            />
            {baseImage ? (
              <div className="relative inline-block border border-purple-500/50 rounded-xl overflow-hidden">
                <img src={baseImage} alt="Base" className="h-20 w-20 object-cover" />
                <button
                  type="button"
                  onClick={() => setBaseImage(null)}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-rose-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-dashed border-slate-700 text-xs text-slate-400 hover:text-white hover:border-purple-500 transition-all"
              >
                <Upload className="w-4 h-4 text-purple-400" />
                <span>Upload reference photo to edit or animate</span>
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/25 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-white" />
                <span>Rendering High-Res Masterpiece...</span>
              </>
            ) : (
              <>
                <Palette className="w-4 h-4 text-white" />
                <span>Generate Image ({aspectRatio})</span>
              </>
            )}
          </button>
        </div>

        {/* Generated Image Gallery */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Studio Generation Gallery ({generatedImages.length})
          </h3>

          {generatedImages.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
              <ImageIcon className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>No images generated yet in this session. Describe an idea above to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {generatedImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-md hover:border-purple-500/50 transition-all"
                >
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="w-full h-56 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                    onClick={() => setSelectedImage(img.url)}
                  />

                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                    <p className="text-[11px] text-white font-medium line-clamp-2">{img.prompt}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
                      <span className="text-[10px] text-purple-300 font-bold">{img.aspect}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => downloadImage(img.url)}
                          className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-purple-600 transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedImage(img.url)}
                          className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-purple-600 transition-colors"
                          title="Fullscreen"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Fullscreen preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 right-3 flex gap-2">
              <button
                onClick={() => downloadImage(selectedImage)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
