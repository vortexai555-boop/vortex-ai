import React from "react";
import { motion } from "framer-motion";

const STATS = [
  { value: "100K+", label: "Generated Images" },
  { value: "500K+", label: "AI Conversations" },
  { value: "50K+", label: "Websites Created" },
  { value: "1M+", label: "Documents Generated" },
  { value: "99.9%", label: "Uptime" }
];

export default function Statistics() {
  return (
    <div className="py-20 border-y border-white/5 bg-[#020617] relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-light text-white mb-2 tracking-tight">
                {stat.value}
              </div>
              <div className="text-sm text-slate-500 uppercase tracking-widest font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
