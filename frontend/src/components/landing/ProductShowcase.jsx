import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, LayoutTemplate, Image as ImageIcon, 
  FileText, Briefcase, Mail, Scan, FileQuestion, 
  Languages, Users, AlignLeft, Sparkles
} from "lucide-react";

const FEATURES = [
  { id: "chat", name: "AI Chat", icon: MessageSquare, color: "text-cyan-400" },
  { id: "website", name: "Website Builder", icon: LayoutTemplate, color: "text-blue-400" },
  { id: "image", name: "Image Generator", icon: ImageIcon, color: "text-purple-400" },
  { id: "document", name: "Document Writer", icon: FileText, color: "text-green-400" },
  { id: "resume", name: "Resume Builder", icon: Briefcase, color: "text-yellow-400" },
  { id: "email", name: "Email Writer", icon: Mail, color: "text-orange-400" },
  { id: "ocr", name: "OCR Extract", icon: Scan, color: "text-red-400" },
  { id: "pdf", name: "PDF QA", icon: FileQuestion, color: "text-indigo-400" },
  { id: "translate", name: "Translator", icon: Languages, color: "text-pink-400" },
  { id: "notes", name: "Meeting Notes", icon: Users, color: "text-teal-400" },
  { id: "summarizer", name: "Text Summarizer", icon: AlignLeft, color: "text-sky-400" }
];

export default function ProductShowcase() {
  const [activeFeature, setActiveFeature] = useState("chat");

  const renderScreenContent = () => {
    switch (activeFeature) {
      case "chat":
        return (
          <div className="flex flex-col h-full bg-[#0a0a0f] text-slate-300 p-4">
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
                <div className="bg-slate-800 rounded-2xl rounded-tl-sm p-3 text-sm">Write a Python script for a web scraper.</div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-900/50 flex items-center justify-center shrink-0">
                  <Sparkles size={14} className="text-cyan-400" />
                </div>
                <div className="bg-cyan-900/10 border border-cyan-500/20 rounded-2xl rounded-tl-sm p-3 text-sm">
                  <p className="mb-2">Here is a simple Python web scraper using BeautifulSoup:</p>
                  <pre className="bg-black/50 p-3 rounded-lg border border-white/5 text-xs text-emerald-400 font-mono">
                    <code>
                      import requests{'\n'}
                      from bs4 import BeautifulSoup{'\n\n'}
                      res = requests.get('https://example.com'){'\n'}
                      soup = BeautifulSoup(res.text, 'html.parser')
                    </code>
                  </pre>
                </div>
              </div>
            </div>
            <div className="mt-4 bg-[#111216] border border-white/10 rounded-xl p-3 flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-500" />
              <div className="h-4 w-full bg-white/5 rounded-md" />
            </div>
          </div>
        );
      case "website":
        return (
          <div className="flex h-full bg-[#0a0a0f]">
            <div className="w-1/3 border-r border-white/10 p-4 flex flex-col gap-3">
              <div className="h-20 bg-[#111216] border border-white/10 rounded-xl p-3 text-xs text-slate-400">
                "Create a modern restaurant website with a dark theme"
              </div>
              <div className="h-8 bg-cyan-600/20 text-cyan-400 rounded-lg flex items-center justify-center text-xs font-medium border border-cyan-500/20">
                Generating structure...
              </div>
            </div>
            <div className="flex-1 bg-white relative overflow-hidden flex flex-col">
              <div className="h-10 bg-slate-100 border-b flex items-center px-4">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
              </div>
              <div className="flex-1 p-6 bg-[#111] text-white">
                <h1 className="text-3xl font-serif">LUMIÈRE</h1>
                <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest">Fine Dining & Experience</p>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="h-24 bg-white/10 rounded-lg" />
                  <div className="h-24 bg-white/10 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        );
      case "image":
        return (
          <div className="flex flex-col h-full bg-[#0a0a0f] p-4 gap-4">
            <div className="flex gap-2 items-center bg-[#111216] border border-white/10 p-2 rounded-xl">
              <input disabled placeholder="A cinematic shot of a futuristic city..." className="bg-transparent flex-1 px-3 text-sm text-white outline-none" />
              <button className="bg-purple-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium">Generate</button>
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-slate-800 rounded-xl relative overflow-hidden group">
                  <img src={`https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80`} className="w-full h-full object-cover opacity-80" alt="" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="bg-white text-black px-3 py-1 text-xs rounded-full">Upscale</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full bg-[#0a0a0f] text-slate-500">
            <div className="flex flex-col items-center gap-3">
              <Sparkles size={32} className="text-cyan-500/50 animate-pulse" />
              <p className="text-sm">Loading workspace...</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="grid lg:grid-cols-4 gap-8 max-w-7xl mx-auto items-center">
      <div className="lg:col-span-1 space-y-2">
        {FEATURES.map(f => {
          const isActive = activeFeature === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFeature(f.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${isActive ? "bg-white/10 border border-white/20 shadow-[0_0_20px_rgba(0,229,255,0.15)]" : "hover:bg-white/5 border border-transparent opacity-70 hover:opacity-100"}`}
            >
              <f.icon size={18} className={isActive ? f.color : "text-slate-400"} />
              <span className={`text-sm font-medium ${isActive ? "text-white" : "text-slate-400"}`}>{f.name}</span>
            </button>
          )
        })}
      </div>
      
      <div className="lg:col-span-3">
        <div className="relative mx-auto max-w-[800px]">
          {/* MacBook Frame */}
          <div className="relative pt-[60%] bg-[#2a2b2f] rounded-t-3xl border-t border-x border-white/20 shadow-2xl overflow-hidden">
            {/* Screen Inner */}
            <div className="absolute top-3 left-3 right-3 bottom-0 bg-black rounded-t-xl overflow-hidden flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 w-full h-full"
                >
                  {renderScreenContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          {/* Base */}
          <div className="h-6 bg-gradient-to-b from-[#3a3b3f] to-[#1a1b1f] rounded-b-xl border border-white/10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-[#111] rounded-b-md" />
          </div>
          
          {/* Glow */}
          <div className="absolute -inset-10 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-3xl -z-10 rounded-full opacity-50" />
        </div>
      </div>
    </div>
  );
}
