import React, { useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Globe, RefreshCw, FileCode2, FileText, LayoutTemplate, Monitor, Tablet, Smartphone, Download, Copy, Maximize2, Play, Square } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function WebsitePage() {
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("idle");
  const [files, setFiles] = useState(null);
  const [activeFile, setActiveFile] = useState("preview");
  const [viewMode, setViewMode] = useState("desktop");
  const [isFullScreen, setIsFullScreen] = useState(false);

  const generate = async () => {
    const desc = description.trim();
    if (!desc || status === "generating") return;
    setStatus("generating");
    setFiles(null);
    setActiveFile("preview");

    try {
      // NOTE: This uses the Python backend's updated /website/generate endpoint
      // which now directly returns JSON containing 'files'
      const start = await api.post("/website/generate", { description: desc, site_type: "landing", files: [] });
      const jobId = start.data.job_id;
      if (!jobId) throw new Error("No job id returned");
      
      const deadline = Date.now() + 5 * 60 * 1000;
      let done = null;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const j = await api.get(`/website/jobs/${jobId}`);
        if (j.data.status === "done") { done = j.data; break; }
        if (j.data.status === "error") {
          throw new Error(j.data.error || "Generation failed");
        }
      }
      
      if (!done) throw new Error("Generation timed out. Please try again.");
      
      if (!done.files) {
        throw new Error("Invalid response from server. No files generated.");
      }
      
      setFiles(done.files);
      setStatus("success");
      toast.success("Your website is ready!");
    } catch (err) {
      toast.error(err?.response?.data?.detail || err.message || "Generation failed");
      setStatus("error");
    }
  };

  const handleStop = () => {
    setStatus("error");
  };

  const hasCode = files !== null;

  const handleCopy = () => {
    if (files && files["index.html"]) {
      const fullHtml = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n<style>${files["styles.css"]}</style>\n<script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body>\n${files["index.html"]}\n<script>${files["script.js"]}</script>\n</body>\n</html>`;
      navigator.clipboard.writeText(fullHtml);
      toast.success("Source code copied to clipboard!");
    }
  };

  const downloadZip = async () => {
    if (!files) return;
    const zip = new JSZip();
    zip.file("index.html", files["index.html"]);
    zip.file("styles.css", files["styles.css"]);
    zip.file("script.js", files["script.js"]);
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `grexo-site-${Date.now()}.zip`);
  };

  const srcDoc = files ? `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8" />\n<style>${files["styles.css"]}</style>\n<script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body>\n${files["index.html"]}\n<script>(function(){try{${files["script.js"]}}catch(e){console.error(e)}})();</script>\n</body>\n</html>` : "";
  const widthClass = isFullScreen ? "w-full" : viewMode === "mobile" ? "w-[375px]" : viewMode === "tablet" ? "w-[768px]" : "w-full";

  return (
    <div className={`flex flex-col text-gray-200 overflow-hidden ${isFullScreen ? 'fixed inset-0 z-[100] bg-[#07080d]' : 'h-full bg-transparent'}`}>
      {!isFullScreen && (
        <div className="flex flex-col mb-4 p-6 lg:p-10 pb-0 shrink-0">
            <div className="text-mono-accent mb-2">Tool</div>
            <h1 className="text-4xl font-light tracking-tighter">
              Website <span className="text-gradient-cyan font-medium">Builder</span>
            </h1>
            <p className="mt-2 text-slate-400">Describe a site. Grexo generates a beautiful, responsive multi-file project instantly.</p>
        </div>
      )}

      <div className={`flex flex-1 min-h-0 ${isFullScreen ? '' : 'px-6 lg:px-10 pb-10'}`}>
        {/* Sidebar */}
        {!isFullScreen && (
          <div className="w-80 shrink-0 border border-white/10 bg-[#0d0e12] rounded-l-2xl flex flex-col h-full z-10 transition-all shadow-xl shadow-black/20 overflow-hidden">
            <div className="p-5 border-b border-white/5 flex flex-col gap-4 bg-[#111216]">
              <Textarea 
                placeholder="Describe the website you want to build (e.g. A modern BMW luxury website)..." 
                className="w-full h-36 bg-[#07080A] text-gray-200 border-white/10 focus-visible:ring-cyan-500 resize-none rounded-xl"
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={status === "generating"}
              />

              {status === "generating" ? (
                <Button onClick={handleStop} variant="destructive" className="w-full h-11 bg-red-600/90 hover:bg-red-600 text-white rounded-xl shadow-lg border-t border-white/10 cursor-pointer">
                  <Square size={16} fill="currentColor" className="mr-2" /> Stop Generation
                </Button>
              ) : (
                <Button onClick={generate} disabled={!description.trim()} className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] border-t border-white/20 rounded-xl cursor-pointer disabled:opacity-50 transition-all font-medium">
                  {hasCode && description.trim() ? <RefreshCw size={16} className="mr-2" /> : <Play size={16} fill="currentColor" className="mr-2" />}
                  {hasCode && description.trim() ? "Regenerate" : "Generate"}
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
              <div className="px-3 pt-3 pb-2 text-[10px] uppercase tracking-widest text-[#4B5563] font-bold">Workspace</div>
              
              <button onClick={() => setActiveFile("preview")} disabled={!hasCode} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left w-full disabled:opacity-40 font-medium tracking-tight ${activeFile === "preview" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner" : "hover:bg-white/5 text-slate-400 border border-transparent"}`}>
                <Monitor size={16} className={activeFile === "preview" ? "text-cyan-400" : "text-slate-500"} /> Live Preview
              </button>

              <div className="px-3 pt-5 pb-2 text-[10px] uppercase tracking-widest text-[#4B5563] font-bold">Source Code</div>
              
              {[
                { id: "index.html", icon: FileCode2 },
                { id: "styles.css", icon: Globe },
                { id: "script.js", icon: FileText }
              ].map(f => (
                <button key={f.id} disabled={!hasCode} onClick={() => setActiveFile(f.id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left w-full disabled:opacity-40 font-medium tracking-tight ${activeFile === f.id ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner" : "hover:bg-white/5 text-slate-400 border border-transparent"}`}>
                  <f.icon size={16} className={activeFile === f.id ? "text-cyan-400" : "text-slate-500"} /> {f.id}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Area */}
        <div className={`flex flex-col min-w-0 flex-1 relative ${isFullScreen ? 'h-full bg-[#07080d]' : 'border-y border-r border-white/10 rounded-r-2xl overflow-hidden bg-[#0a0a0f] shadow-2xl relative shadow-black/40'}`}>
          
          <div className={`h-14 border-b border-white/10 bg-[#111216]/90 backdrop-blur flex items-center justify-between px-5 shrink-0 z-20 ${isFullScreen ? 'absolute top-0 w-full left-0 right-0' : ''}`}>
            
            {/* Viewport Toggles */}
            <div className={`flex bg-black/40 rounded-lg border border-white/5 p-1 ${!hasCode ? "opacity-30 pointer-events-none" : ""}`}>
              {["desktop", "tablet", "mobile"].map(mode => {
                const Icon = mode === "desktop" ? Monitor : mode === "tablet" ? Tablet : Smartphone;
                return (
                  <button key={mode} onClick={() => setViewMode(mode)} title={mode} className={`p-1.5 rounded-md transition-all ${viewMode === mode ? "bg-[#1f2334] text-cyan-400 shadow-sm border border-white/5" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
                    <Icon size={16} />
                  </button>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={handleCopy} disabled={!hasCode} className="text-slate-400 hover:text-white h-8 hover:bg-white/5 px-2.5" title="Copy HTML/CSS/JS">
                <Copy size={16} />
                <span className="hidden sm:inline ml-2 text-xs font-medium tracking-wide">Copy Code</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={downloadZip} disabled={!hasCode} className="text-slate-400 hover:text-white h-8 hover:bg-white/5 px-2.5" title="Download Source (.zip)">
                <Download size={16} />
                <span className="hidden sm:inline ml-2 text-xs font-medium tracking-wide">Download ZIP</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsFullScreen(!isFullScreen)} disabled={!hasCode} className={`${isFullScreen ? 'text-cyan-400 hover:text-cyan-300 bg-cyan-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'} h-8 px-2.5 ml-1`} title="Full Screen Preview">
                <Maximize2 size={16} />
              </Button>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#131722] via-[#0a0a0f] to-[#0a0a0f]">
            {activeFile === "preview" ? (
              <AnimatePresence mode="wait">
                {status === "generating" ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10 bg-[#0a0a0f]/80 backdrop-blur-sm">
                    <div className="relative w-20 h-20 mb-8 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl bg-[#111216]">
                      <Globe size={32} className="text-cyan-400 animate-pulse drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                      <div className="absolute inset-0 rounded-2xl border border-cyan-500/50 scale-[1.2] opacity-50 animate-ping" style={{ animationDuration: '3s' }} />
                    </div>
                    <h3 className="text-xl font-light text-white tracking-wide">Crafting your site</h3>
                    <p className="mt-2 text-sm text-slate-400 font-mono tracking-tight opacity-70 border border-white/5 py-1 px-3 rounded-full bg-white/5">Generating structure, styles, and logic...</p>
                  </motion.div>
                ) : !files ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    <LayoutTemplate size={56} className="mb-6 opacity-10 drop-shadow-sm" strokeWidth={1} />
                    <p className="text-sm tracking-wide font-medium bg-white/5 px-4 py-2 rounded-full border border-white/5">Waiting for your instructions</p>
                  </motion.div>
                ) : (
                  <motion.div key="preview" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className={`absolute inset-0 w-full h-full flex items-center justify-center ${isFullScreen ? 'p-0 pt-14' : 'p-4 pb-0 opacity-100'}`}>
                    <div className={`h-full bg-white shadow-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${widthClass} ${viewMode !== 'desktop' && !isFullScreen ? 'rounded-[2rem] border-[10px] border-[#1f2334] mb-4 origin-bottom shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] ring-1 ring-white/10' : 'rounded-t-xl mb-0 shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.5)]'}`}>
                      <iframe title="live-preview" srcDoc={srcDoc} className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-same-origin allow-forms" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              files && (
                <div className="absolute inset-0 pt-2 bg-[#1e1e1e]">
                  <textarea
                    className="w-full h-full bg-[#1e1e1e] text-white p-4 font-mono text-sm resize-none outline-none"
                    value={files[activeFile] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFiles(f => ({ ...f, [activeFile]: val }));
                    }}
                    spellCheck={false}
                  />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
