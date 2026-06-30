import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Clock, Code2, Sparkles, Terminal } from "lucide-react";

export default function BuildStatusPanel({ jobId, onComplete, api }) {
  const [status, setStatus] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/website/jobs/${jobId}`);
        const data = res.data;
        setStatus(data);
        if (data.status === "done" || data.status === "error") {
          clearInterval(interval);
          onComplete(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [jobId, api, onComplete]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const logs = status?.logs || [];
  const currentStage = status?.stage || "starting";
  
  const stages = [
    { id: "understanding", label: "Understanding Requirements" },
    { id: "planning", label: "Planning Architecture & Stack" },
    { id: "generating", label: "Generating Code & Components" },
    { id: "validating", label: "Validating & Fixing Errors" },
    { id: "completed", label: "Preview Ready" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <div className="w-full max-w-4xl glass rounded-2xl border border-white/10 overflow-hidden flex flex-col md:flex-row h-[600px] shadow-2xl">
        
        {/* Left sidebar - Timeline */}
        <div className="w-full md:w-1/3 bg-black/40 border-r border-white/10 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-medium">Building Website</h3>
              <p className="text-sm text-slate-400">GREXO AI Pipeline</p>
            </div>
          </div>
          
          <div className="flex-1 space-y-6">
            {stages.map((stage, idx) => {
              const isPast = stages.findIndex(s => s.id === currentStage) > idx;
              const isCurrent = currentStage === stage.id && status?.status !== "done" && status?.status !== "error";
              
              return (
                <div key={stage.id} className="flex items-start gap-4">
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border ${isPast ? 'bg-cyan-500 border-cyan-500 text-black' : isCurrent ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : 'border-white/10 text-white/30'}`}>
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : isCurrent ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className="w-2 h-2 rounded-full bg-white/20" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isPast || isCurrent ? 'text-white' : 'text-slate-500'}`}>{stage.label}</p>
                    {isCurrent && <p className="text-xs text-cyan-400/70 mt-1 animate-pulse">In progress...</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-2"><Clock className="w-4 h-4"/> Elapsed Time</span>
            <span className="text-white font-mono text-lg">{formatTime(elapsed)}</span>
          </div>
        </div>

        {/* Right content - Logs */}
        <div className="w-full md:w-2/3 p-6 flex flex-col bg-[#0a0a0a]">
          <div className="flex items-center gap-2 mb-4 text-slate-400 text-sm">
            <Terminal className="w-4 h-4" />
            <span>Live Build Logs</span>
          </div>
          <div className="flex-1 bg-black/60 rounded-xl border border-white/5 p-4 font-mono text-xs overflow-y-auto flex flex-col-reverse">
             <div className="space-y-2">
               {logs.map((log, i) => (
                 <div key={i} className="text-slate-300">
                    <span className="text-slate-500 mr-3">[{new Date(log.time).toLocaleTimeString()}]</span>
                    {log.message}
                 </div>
               ))}
               {status?.status === "error" && (
                 <div className="text-red-400 mt-4">
                    <span className="text-red-500 mr-3">[{new Date().toLocaleTimeString()}]</span>
                    ERROR: {status.error}
                 </div>
               )}
               {status?.status !== "done" && status?.status !== "error" && (
                 <div className="text-cyan-400 animate-pulse mt-2">_</div>
               )}
             </div>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-4">
             <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                <div className="text-xs text-slate-500 mb-1">Architecture Model</div>
                <div className="text-sm text-white">Gemini 2.5</div>
             </div>
             <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                <div className="text-xs text-slate-500 mb-1">Code Generator</div>
                <div className="text-sm text-white">DeepSeek V3</div>
             </div>
             <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                <div className="text-xs text-slate-500 mb-1">Validator</div>
                <div className="text-sm text-white">Qwen Coder</div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
