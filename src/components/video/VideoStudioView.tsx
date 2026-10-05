import React, { useState, useRef, useEffect } from 'react';
import {
  Video as VideoIcon,
  Sparkles,
  Play,
  Download,
  Upload,
  X,
  Clock,
  Film,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { saveCreatorArtifact } from '../../lib/firebase';
import { CreatorArtifact } from '../../lib/types';

interface VideoStudioViewProps {
  currentUser: User | null;
}

interface VideoJob {
  id: string;
  operationName: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  status: 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  progressMessage: string;
  createdAt: string;
}

export const VideoStudioView: React.FC<VideoStudioViewProps> = ({ currentUser }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [startingImage, setStartingImage] = useState<string | null>(null);
  const [activeEngine, setActiveEngine] = useState<'veo' | 'runway' | 'kling'>('veo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalsRef = useRef<{ [key: string]: any }>({});

  const reassuringMessages = [
    'Synthesizing temporal neural frames...',
    'Rendering physics and lighting simulation...',
    'Interpolating high-definition motion vectors...',
    'Encoding MP4 video stream with Veo...',
    'Polishing final cinematic frames...',
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setStartingImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStartGeneration = async () => {
    if (!prompt.trim() && !startingImage) return;

    if (activeEngine !== 'veo') {
      alert(`The ${activeEngine.toUpperCase()} API adapter is in readiness mode. Please select Google Veo 3 for live generation or configure ${activeEngine.toUpperCase()}_API_KEY.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          startingImage: startingImage || undefined,
          aspectRatio,
          resolution,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start video generation');

      const jobId = `job_${Date.now()}`;
      const newJob: VideoJob = {
        id: jobId,
        operationName: data.operationName,
        prompt: prompt || 'Photo animation',
        aspectRatio,
        status: 'processing',
        progressMessage: 'Initializing Veo 3 generation...',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setJobs((prev) => [newJob, ...prev]);
      pollJobStatus(newJob);
    } catch (err: any) {
      console.error('Video generation error:', err);
      alert(`Generation failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll video status
  const pollJobStatus = (job: VideoJob) => {
    let cycle = 0;
    const interval = setInterval(async () => {
      cycle++;
      try {
        const statusRes = await fetch('/api/video/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName: job.operationName }),
        });

        const statusData = await statusRes.json();

        // Update progress message
        const msg = reassuringMessages[cycle % reassuringMessages.length];
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, progressMessage: msg } : j))
        );

        if (statusData.done) {
          clearInterval(interval);
          delete pollingIntervalsRef.current[job.id];

          // Download video binary / data
          const downloadRes = await fetch('/api/video/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName: job.operationName }),
          });

          if (!downloadRes.ok) throw new Error('Video ready but download failed');
          const blob = await downloadRes.blob();
          const videoObjectUrl = URL.createObjectURL(blob);

          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id
                ? {
                    ...j,
                    status: 'completed',
                    videoUrl: videoObjectUrl,
                    progressMessage: 'Video generated successfully!',
                  }
                : j
            )
          );

          // Save to Firestore
          const uid = currentUser?.uid || 'guest_user';
          const artifact: CreatorArtifact = {
            id: job.id,
            userId: uid,
            type: 'video',
            title: `Veo Video: ${job.prompt.slice(0, 30)}`,
            prompt: job.prompt,
            mediaUrl: videoObjectUrl,
            content: `Aspect: ${job.aspectRatio}, Resolution: ${resolution}`,
            createdAt: new Date().toISOString(),
          };
          saveCreatorArtifact(artifact).catch(console.warn);
        } else if (statusData.error) {
          clearInterval(interval);
          delete pollingIntervalsRef.current[job.id];
          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id
                ? {
                    ...j,
                    status: 'failed',
                    progressMessage: `Generation error: ${statusData.error.message || 'Operation failed'}`,
                  }
                : j
            )
          );
        }
      } catch (err: any) {
        console.warn('Poll error:', err);
      }
    }, 6000);

    pollingIntervalsRef.current[job.id] = interval;
  };

  useEffect(() => {
    return () => {
      Object.values(pollingIntervalsRef.current).forEach((i) => clearInterval(i));
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <VideoIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white flex items-center gap-1.5">
                Video Studio
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                  Google Veo 3
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Text-to-video generation and photo animation powered by Google Veo 3.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* Engine Switcher */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
          {[
            { id: 'veo', label: 'Google Veo 3', status: 'Live Native', isReady: true },
            { id: 'runway', label: 'Runway Gen-3', status: 'Adapter Ready', isReady: false },
            { id: 'kling', label: 'Kling AI', status: 'Adapter Ready', isReady: false },
          ].map((engine) => (
            <button
              key={engine.id}
              onClick={() => setActiveEngine(engine.id as any)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeEngine === engine.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{engine.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                  engine.isReady ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {engine.status}
              </span>
            </button>
          ))}
        </div>

        {/* Input Parameters Box */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800/80 p-5 space-y-4 shadow-xl">
          {/* Prompt */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Describe the video motion, camera movement, and scene <span className="text-indigo-400">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A neon hologram of a sports car driving at high speed through a cyberpunk city with reflections on wet asphalt..."
              rows={2}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Aspect Ratio (Veo strictly supports 16:9 landscape or 9:16 portrait) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Veo Aspect Ratio
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                    aspectRatio === '16:9'
                      ? 'bg-indigo-950/50 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>16:9 Landscape</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">YouTube / Desktop</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                    aspectRatio === '9:16'
                      ? 'bg-indigo-950/50 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>9:16 Portrait</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Shorts / Reels</span>
                </button>
              </div>
            </div>

            {/* Photo Animation Input */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Photo-to-Video (Starting Frame)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              {startingImage ? (
                <div className="relative inline-block border border-indigo-500/50 rounded-xl overflow-hidden">
                  <img src={startingImage} alt="Starting frame" className="h-16 w-28 object-cover" />
                  <button
                    type="button"
                    onClick={() => setStartingImage(null)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-slate-950 border border-dashed border-slate-700 text-xs text-slate-400 hover:text-white hover:border-indigo-500 transition-all"
                >
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>Upload photo to animate into video</span>
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleStartGeneration}
            disabled={(!prompt.trim() && !startingImage) || isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-white" />
                <span>Initiating Veo 3 Job...</span>
              </>
            ) : (
              <>
                <Film className="w-4 h-4 text-white" />
                <span>Generate Video with Veo 3</span>
              </>
            )}
          </button>
        </div>

        {/* Video Jobs Stream */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Video Generation Jobs ({jobs.length})
          </h3>

          {jobs.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
              <Film className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>No video jobs running. Describe a prompt or upload a photo to generate with Veo 3.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white line-clamp-1">{job.prompt}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold">
                        {job.aspectRatio}
                      </span>
                    </div>
                    <p className="text-[11px] text-cyan-300 flex items-center gap-1.5">
                      {job.status === 'processing' && <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
                      {job.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {job.status === 'failed' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                      <span>{job.progressMessage}</span>
                    </p>
                  </div>

                  {job.videoUrl && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedVideo(job.videoUrl!)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Play Video</span>
                      </button>
                      <a
                        href={job.videoUrl}
                        download="zeegrok-veo-video.mp4"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
                        title="Download MP4"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video Lightbox Player */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <video src={selectedVideo} controls autoPlay className="w-full rounded-2xl shadow-2xl border border-slate-700" />
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-slate-800 text-white hover:bg-rose-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
