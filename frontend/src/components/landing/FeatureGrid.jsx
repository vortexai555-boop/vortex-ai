import React from "react";
import { motion } from "framer-motion";
import { Code2, PenTool, Search, Bot, Database, Zap } from "lucide-react";

const GRID_ITEMS = [
  {
    title: "AI Chat & Reasoning",
    desc: "Engage with state-of-the-art reasoning models. Upload files, generate code, and solve complex problems in realtime.",
    colSpan: "col-span-1 md:col-span-2",
    img: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&auto=format&fit=crop",
    icon: Bot
  },
  {
    title: "Document Writer",
    desc: "Draft, edit, and perfect long-form content with AI context.",
    colSpan: "col-span-1",
    img: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop",
    icon: PenTool
  },
  {
    title: "Smart OCR & Vision",
    desc: "Extract text and structured data from images instantly.",
    colSpan: "col-span-1",
    img: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=600&auto=format&fit=crop",
    icon: Search
  },
  {
    title: "Website Builder",
    desc: "Go from prompt to deployed React application in seconds. Live preview and instantly download source code.",
    colSpan: "col-span-1 md:col-span-2",
    img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
    icon: Code2
  }
];

export default function FeatureGrid() {
  return (
    <div className="py-24 max-w-7xl mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-light text-white mb-6">Built for <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">velocity.</span></h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          We combined 12 fragmented tools into one unified platform with a premium interface.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {GRID_ITEMS.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={`group relative overflow-hidden rounded-3xl bg-[#0a0a0f] border border-white/10 ${item.colSpan}`}
          >
            {/* Background Image / Preview */}
            <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent z-10" />
              <img src={item.img} alt="" className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700" />
            </div>
            
            <div className="relative z-10 p-8 h-full flex flex-col justify-end min-h-[300px]">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 backdrop-blur-md">
                <item.icon size={24} className="text-cyan-400" />
              </div>
              <h3 className="text-2xl font-medium text-white mb-3">{item.title}</h3>
              <p className="text-slate-400 leading-relaxed max-w-md">{item.desc}</p>
            </div>

            {/* Hover Glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
