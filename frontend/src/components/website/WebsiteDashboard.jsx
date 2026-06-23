import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Search, Plus, MoreVertical, Trash, Copy, Edit2, Play, Square, LayoutTemplate, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function WebsiteDashboard({ 
  projects, 
  onOpenProject, 
  onGenerate, 
  onDelete, 
  onDuplicate,
  isGenerating 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [description, setDescription] = useState("");

  const filteredProjects = projects.filter(p => 
    (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleGenerate = () => {
    if (!description.trim() || isGenerating) return;
    onGenerate(description.trim());
    setDescription("");
  };

  return (
    <div className="flex flex-col h-full bg-[#07080A] text-gray-200 p-6 lg:p-10 overflow-y-auto">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-4xl font-light tracking-tighter">
          Website <span className="text-gradient-cyan font-medium">Projects</span>
        </h1>
        <p className="text-slate-400">Manage your generated websites and continue editing them.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 flex flex-col p-6 rounded-2xl bg-[#0d0e12] border border-white/5 shadow-xl">
          <h2 className="text-lg font-medium mb-4 text-white">Generate New Website</h2>
          <Textarea 
            placeholder="Describe the website you want to build (e.g. A modern BMW luxury website)..." 
            className="w-full h-32 bg-[#07080A] text-gray-200 border-white/10 focus-visible:ring-cyan-500 resize-none rounded-xl mb-4"
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={isGenerating}
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleGenerate} 
              disabled={!description.trim() || isGenerating} 
              className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] rounded-xl transition-all font-medium"
            >
              {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : <Play size={16} className="mr-2" />}
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="p-6 rounded-2xl bg-[#0d0e12] border border-white/5 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 font-medium">Total Projects</p>
              <h3 className="text-3xl font-light text-white mt-1">{projects.length}</h3>
            </div>
            <LayoutTemplate size={32} className="text-cyan-500/50" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-white">Recent Websites</h2>
        <div className="relative w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input 
            placeholder="Search projects..." 
            className="pl-9 bg-[#0d0e12] border-white/10 text-sm h-10 rounded-xl"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500 border border-white/5 border-dashed rounded-2xl">
          <LayoutTemplate size={48} className="mb-4 opacity-20" />
          <p>No projects found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
          {filteredProjects.map(p => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={p.id} 
              className="group flex flex-col bg-[#0d0e12] border border-white/5 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
              onClick={() => onOpenProject(p.id)}
            >
              <div className="h-40 bg-[#111216] relative border-b border-white/5 flex items-center justify-center overflow-hidden">
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt="thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <LayoutTemplate size={40} className="text-white/10" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] to-transparent opacity-50" />
              </div>
              <div className="p-5 flex flex-col gap-1 relative">
                <h3 className="text-white font-medium truncate pr-8">{p.name || "Untitled Project"}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock size={12} /> {formatDistanceToNow(new Date(p.updated_at || p.created_at), { addSuffix: true })}
                </p>
                <div className="absolute right-3 top-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                    onClick={(e) => { e.stopPropagation(); onDuplicate(p.id); }}
                  >
                    <Copy size={14} />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
