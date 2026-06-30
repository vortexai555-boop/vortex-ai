import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, Globe, Trash, Copy, ArrowRight, Loader2, Code2, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import BuildStatusPanel from "./BuildStatusPanel";

export default function WebsiteDashboard({ onOpenProject }) {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingJob, setGeneratingJob] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState("landing");
  const [promptHistory, setPromptHistory] = useState([]);

  useEffect(() => {
    fetchWebsites();
    const history = localStorage.getItem("grexo_prompt_history");
    if (history) {
      try {
        setPromptHistory(JSON.parse(history));
      } catch (e) {}
    }
  }, []);

  const savePromptToHistory = (newPrompt) => {
    const entry = { text: newPrompt, time: new Date().toISOString() };
    const newHistory = [entry, ...promptHistory.filter(p => p.text !== newPrompt)].slice(0, 20);
    setPromptHistory(newHistory);
    localStorage.setItem("grexo_prompt_history", JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setPromptHistory([]);
    localStorage.removeItem("grexo_prompt_history");
  };

  const fetchWebsites = async () => {
    try {
      const res = await api.get("/website");
      setWebsites(res.data);
    } catch (err) {
      toast.error("Failed to load websites");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return toast.error("Please enter a description");
    savePromptToHistory(prompt.trim());
    try {
      const res = await api.post("/website/generate", { description: prompt, site_type: type });
      setGeneratingJob(res.data.job_id);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Generation failed");
    }
  };

  const handleJobComplete = (jobData) => {
    setGeneratingJob(null);
    if (jobData.status === "done") {
      toast.success("Website generated successfully!");
      fetchWebsites();
      onOpenProject(jobData.site_id);
    } else {
      toast.error(jobData.error || "Generation failed");
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure?")) return;
    try {
      await api.delete(`/website/${id}`);
      setWebsites(w => w.filter(x => x.id !== id));
      toast.success("Website deleted");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const handleDuplicate = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/website/${id}/duplicate`);
      fetchWebsites();
      toast.success("Website duplicated");
    } catch (err) {
      toast.error("Duplicate failed");
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-8">
      {generatingJob && (
        <BuildStatusPanel 
          jobId={generatingJob} 
          onComplete={handleJobComplete}
          api={api}
        />
      )}
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="space-y-4">
          <h1 className="text-4xl font-light">Website Builder</h1>
          <p className="text-slate-400">Describe what you want to build, and GREXO will generate production-ready code.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass rounded-2xl p-6 border border-white/10 space-y-6">
            <div className="flex gap-4">
              <select 
                value={type} 
                onChange={e => setType(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none"
              >
                <option value="landing">Landing Page</option>
                <option value="portfolio">Portfolio</option>
                <option value="dashboard">Dashboard</option>
                <option value="blog">Blog</option>
                <option value="ecommerce">Ecommerce Store</option>
                <option value="saas">SaaS Application</option>
              </select>
            </div>
            <Textarea 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe your website (e.g., A dark-themed portfolio for a software engineer with a neon aesthetic)"
              className="h-40 bg-black/40 border-white/10 text-base"
            />
            <div className="flex justify-end">
              <Button onClick={handleGenerate} disabled={!!generatingJob || !prompt.trim()} className="bg-cyan-500 text-black hover:bg-cyan-400 px-8 py-6 text-lg">
                <Code2 className="w-5 h-5 mr-2" />
                Generate Project
              </Button>
            </div>
          </div>
          
          <div className="glass rounded-2xl border border-white/10 flex flex-col overflow-hidden max-h-[300px]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
               <div className="flex items-center gap-2 text-slate-300">
                  <History className="w-4 h-4" />
                  <span className="font-medium">Prompt History</span>
               </div>
               {promptHistory.length > 0 && (
                 <button onClick={clearHistory} className="text-xs text-slate-500 hover:text-slate-300">Clear</button>
               )}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
              {promptHistory.length === 0 ? (
                <div className="text-center p-4 text-sm text-slate-500">No recent prompts</div>
              ) : (
                promptHistory.map((item, i) => (
                  <div key={i} className="p-3 hover:bg-white/5 rounded-lg group cursor-pointer transition-colors relative" onClick={() => setPrompt(item.text)}>
                     <p className="text-sm text-slate-300 line-clamp-2 pr-6">{item.text}</p>
                     <span className="text-xs text-slate-500 mt-1 block">{new Date(item.time).toLocaleDateString()} {new Date(item.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         const newHistory = promptHistory.filter((_, idx) => idx !== i);
                         setPromptHistory(newHistory);
                         localStorage.setItem("grexo_prompt_history", JSON.stringify(newHistory));
                       }}
                       className="absolute right-2 top-3 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                       <X className="w-3 h-3" />
                     </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-light">Your Projects</h2>
          {loading ? (
            <div className="text-slate-400">Loading...</div>
          ) : websites.length === 0 ? (
            <div className="text-center py-12 glass rounded-2xl border-dashed border-white/20">
              <p className="text-slate-400">No projects yet. Generate your first website above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {websites.map(site => (
                <div 
                  key={site.id} 
                  onClick={() => onOpenProject(site.id)}
                  className="glass rounded-2xl p-6 border border-white/5 hover:border-cyan-500/50 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-black/40 rounded-xl">
                      <Globe className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleDuplicate(site.id, e)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
                        <Copy size={16} />
                      </button>
                      <button onClick={(e) => handleDelete(site.id, e)} className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400">
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">{site.name || "Untitled Project"}</h3>
                  <p className="text-sm text-slate-400 mb-6 flex-1 line-clamp-2">
                    {site.description || "Generated website"}
                  </p>
                  <div className="text-xs text-slate-500 flex justify-between items-center mt-auto">
                    <span>{new Date(site.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 group-hover:text-cyan-400 transition-colors">
                      Open <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
