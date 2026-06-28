import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Image as ImageIcon, Sparkle, DownloadSimple, X, MagnifyingGlassPlus,
  Paperclip, Trash, FilePdf
} from "@phosphor-icons/react";
import { saveAs } from "file-saver";

const STYLES = [
  { v: "realistic", l: "Realistic", suffix: "photorealistic, ultra detailed, natural lighting, 50mm lens, professional photography" },
  { v: "cinematic", l: "Cinematic", suffix: "cinematic film still, dramatic lighting, high contrast, anamorphic, color graded, IMAX" },
  { v: "3d", l: "3D Render", suffix: "octane render, 3D illustration, soft global illumination, blender, hyperreal materials" },
  { v: "anime", l: "Anime", suffix: "anime style, studio ghibli inspired, hand-drawn, vibrant colors, cel-shaded" },
  { v: "digital-art", l: "Digital Art", suffix: "concept art, digital painting, trending on artstation, vivid colors" },
  { v: "minimal", l: "Minimal", suffix: "minimalist design, clean composition, lots of negative space, soft palette" },
];

const ASPECTS = [
  { v: "1:1", l: "Square (1:1)" },
  { v: "16:9", l: "Wide (16:9)" },
  { v: "9:16", l: "Portrait (9:16)" },
  { v: "4:3", l: "Classic (4:3)" },
];

const EXAMPLES = [
  "A neon cyberpunk city at midnight from a rooftop, rain reflecting the lights",
  "A serene mountain lake at sunrise with mist drifting over the water",
  "Macro shot of a holographic flower made of liquid glass",
  "Astronaut sitting in a field of bioluminescent flowers, dreamy mood",
];

const ASPECT_CLASS = {
  "1:1": "aspect-square",
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "4:3": "aspect-[4/3]",
};

export default function ImagePage() {
  const { refresh } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [aspect, setAspect] = useState("1:1");
  const [count, setCount] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const loadHistory = async () => {
    try {
      const r = await api.get("/images");
      setHistory(r.data || []);
    } catch (_e) { /* ignore */ }
  };

  useEffect(() => { loadHistory(); }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addFiles = (selected) => {
    const validFiles = selected.filter(f => f.size <= 20 * 1024 * 1024);
    if (validFiles.length < selected.length) {
      toast.error("Some files exceed the 20MB limit.");
    }
    const newAttachments = validFiles.map(f => {
      let preview = null;
      if (f.type.startsWith("image/")) {
        preview = URL.createObjectURL(f);
      }
      return { file: f, preview };
    });
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
    e.target.value = null; // reset input
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const generate = async () => {
      const p = prompt.trim();
      if ((!p && attachments.length === 0) || generating) return;
      const styleDef = STYLES.find((s) => s.v === style);
      const fullPrompt = p ? `${p}. Style: ${styleDef?.suffix || ""}` : `Style: ${styleDef?.suffix || ""}`;
      setGenerating(true);
      setResults([]);
      try {
        let r;
        if (attachments.length > 0) {
          const formData = new FormData();
          formData.append("prompt", fullPrompt);
          formData.append("aspect_ratio", aspect);
          formData.append("count", count);
          attachments.forEach(a => formData.append("files[]", a.file));
          r = await api.post("/images/generate", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
        } else {
          r = await api.post("/images/generate", { prompt: fullPrompt, aspect_ratio: aspect, count });
        }
        
        setResults(r.data.images || []);
        toast.success(`Generated ${r.data.images.length} image${r.data.images.length === 1 ? "" : "s"}`);
        loadHistory();
        refresh();
      } catch (err) {
        toast.error(err?.response?.data?.detail || "Generation failed");
      } finally {
        setGenerating(false);
      }
  };

  const mimeOf = (img) => img?.mime || (img?.data?.startsWith("/9j/") ? "image/jpeg" : "image/png");
  const extOf = (img) => mimeOf(img) === "image/jpeg" ? "jpg" : (mimeOf(img) === "image/webp" ? "webp" : "png");

  const download = (img) => {
    const bytes = Uint8Array.from(atob(img.data), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mimeOf(img) });
    saveAs(blob, `grexo-${img.id || Date.now()}.${extOf(img)}`);
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto p-6 lg:p-10">
        <div className="text-mono-accent mb-2">Tool</div>
        <h1 className="text-4xl font-light tracking-tighter">
          Image <span className="text-gradient-cyan font-medium">Generator</span>
        </h1>
        <p className="mt-2 text-slate-400">Describe an image and pick a style. Powered by Gemini Nano Banana.</p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          {/* Input panel */}
          <div 
            className="lg:col-span-4"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className={`glass rounded-2xl p-6 sticky top-6 transition-all ${dragActive ? "border-grexo-cyan border bg-grexo-cyan/5" : ""}`}>
              <div className="text-mono-accent">Describe your image</div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A neon cyberpunk city at midnight, raining…"
                className="mt-3 min-h-[140px] bg-[#0A0A12] text-white placeholder-slate-500 border-white/10 focus-visible:ring-[#00F0FF] resize-none"
                data-testid="image-prompt-input"
              />

              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 relative group">
                      {a.preview ? (
                        <img src={a.preview} alt="preview" className="w-12 h-12 object-cover rounded-md" />
                      ) : (
                        <div className="w-12 h-12 bg-white/10 flex items-center justify-center rounded-md">
                           <FilePdf size={24} className="text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{a.file.name}</div>
                        <div className="text-xs text-slate-400">{(a.file.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                      <button onClick={() => removeAttachment(i)} className="text-slate-400 hover:text-red-400 p-2 transition-colors">
                        <Trash size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-3 flex justify-end">
                <label htmlFor="file-upload-image" className="cursor-pointer flex items-center gap-2 text-sm text-slate-400 hover:text-grexo-cyan transition-colors">
                  <Paperclip size={18} className="pointer-events-none" />
                  <span>Attach Image or PDF</span>
                  <input id="file-upload-image" type="file" multiple className="sr-only" accept="image/*,application/pdf" onChange={handleFileChange} />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-mono-accent mb-2">Style</div>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="bg-grexo-elevated border-white/10 h-11" data-testid="image-style-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STYLES.map((s) => (<SelectItem key={s.v} value={s.v} data-testid={`image-style-${s.v}`}>{s.l}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-mono-accent mb-2">Aspect</div>
                  <Select value={aspect} onValueChange={setAspect}>
                    <SelectTrigger className="bg-grexo-elevated border-white/10 h-11" data-testid="image-aspect-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASPECTS.map((a) => (<SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-mono-accent mb-2">Count</div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`flex-1 h-10 rounded-lg text-sm transition ${count === n ? "bg-grexo-cyan text-black font-semibold" : "bg-grexo-elevated border border-white/10 text-slate-300 hover:border-white/20"}`}
                      data-testid={`image-count-${n}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={generate} disabled={generating || (!prompt.trim() && attachments.length === 0)} className="mt-5 w-full h-12 btn-primary-grexo" data-testid="image-generate-btn">
                {generating ? "Generating…" : <><Sparkle size={16} weight="fill" className="mr-2" /> Generate</>}
              </Button>
              <div className="mt-3 text-xs text-slate-500">Costs 2 credits per image.</div>

              <div className="mt-6">
                <div className="text-mono-accent mb-2">Examples</div>
                <div className="space-y-2">
                  {EXAMPLES.map((e, i) => (
                    <button key={i} onClick={() => setPrompt(e)} className="w-full text-left text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/15 transition" data-testid={`image-example-${i}`}>{e}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Output panel */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {generating ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`grid gap-4 ${count > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className={`${ASPECT_CLASS[aspect] || "aspect-square"} rounded-2xl glass relative overflow-hidden`} data-testid={`image-skeleton-${i}`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-grexo-cyan/5 via-transparent to-grexo-purple/10 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center text-grexo-cyan">
                        <ImageIcon size={32} className="animate-grexo-pulse" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : results.length > 0 ? (
                <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`grid gap-4 ${results.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                  {results.map((img, i) => (
                    <div key={img.id || i} className="glass rounded-2xl overflow-hidden group" data-testid={`image-result-${i}`}>
                      <div className={`${ASPECT_CLASS[aspect] || "aspect-square"} bg-black relative`}>
                        <img src={`data:${mimeOf(img)};base64,${img.data}`} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Button size="icon" onClick={() => setLightbox(img)} className="bg-white/10 hover:bg-white/20 mr-2" data-testid={`image-zoom-${i}`}>
                            <MagnifyingGlassPlus size={16} />
                          </Button>
                          <Button size="icon" onClick={() => download(img)} className="btn-primary-grexo" data-testid={`image-download-${i}`}>
                            <DownloadSimple size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-16 text-center">
                  <ImageIcon size={48} className="mx-auto text-grexo-cyan opacity-60" />
                  <div className="mt-6 text-xl font-light">No images yet</div>
                  <div className="mt-2 text-slate-500 text-sm">Describe an image on the left and hit Generate.</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* History gallery */}
            {history.length > 0 && (
              <div className="mt-10">
                <div className="text-mono-accent mb-3">Your gallery</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {history.map((h) => (
                    <button key={h.id} onClick={() => setLightbox(h)} className="aspect-square overflow-hidden rounded-xl border border-white/5 hover:border-white/20 transition group" data-testid={`image-history-${h.id}`}>
                      <img src={`data:${mimeOf(h)};base64,${h.data}`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6" onClick={() => setLightbox(null)} data-testid="image-lightbox">
          <button onClick={() => setLightbox(null)} className="absolute top-6 right-6 text-white hover:text-grexo-cyan" data-testid="image-lightbox-close">
            <X size={28} />
          </button>
          <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={`data:${mimeOf(lightbox)};base64,${lightbox.data}`} alt="" className="w-full rounded-xl" />
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="text-sm text-slate-400 truncate flex-1">{lightbox.prompt}</div>
              <Button onClick={() => download(lightbox)} className="btn-primary-grexo" data-testid="image-lightbox-download">
                <DownloadSimple size={14} className="mr-1.5" /> Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
