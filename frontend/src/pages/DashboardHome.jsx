import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ChatCircleDots, Sparkle, Clock, ArrowRight } from "@phosphor-icons/react";

export default function DashboardHome() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get("/dashboard/summary").then((r) => setSummary(r.data)).catch(() => {});
  }, []);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-mono-accent mb-2">Workspace</div>
          <h1 className="text-4xl lg:text-5xl font-light tracking-tighter">
            Welcome to <span className="text-gradient-cyan font-medium">VORTEX AI</span>,
          </h1>
          <p className="mt-2 text-slate-400 text-lg" data-testid="dashboard-welcome-name">
            {user?.name || "Creator"}.
          </p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
          <div className="glass rounded-2xl p-6" data-testid="stat-credits">
            <div className="text-mono-accent">Credits</div>
            <div className="mt-2 text-3xl font-light">{summary?.credits ?? user?.credits ?? 0}</div>
            <div className="mt-1 text-xs text-slate-500 capitalize">{summary?.plan || user?.plan || "free"} plan</div>
          </div>
          <div className="glass rounded-2xl p-6" data-testid="stat-conversations">
            <div className="text-mono-accent">Conversations</div>
            <div className="mt-2 text-3xl font-light">{summary?.stats?.conversations ?? 0}</div>
            <div className="mt-1 text-xs text-slate-500">across your history</div>
          </div>
          <div className="glass rounded-2xl p-6" data-testid="stat-actions">
            <div className="text-mono-accent">Actions used</div>
            <div className="mt-2 text-3xl font-light">{(summary?.usage_by_tool || []).reduce((a, b) => a + (b.value || 0), 0)}</div>
            <div className="mt-1 text-xs text-slate-500">in last 100 events</div>
          </div>
        </div>

        {/* Tool launcher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
          <Link to="/dashboard/chat" className="glass rounded-2xl p-8 hover:-translate-y-1 hover:border-white/20 transition-all group" data-testid="launch-chat">
            <ChatCircleDots size={28} weight="duotone" color="#00F0FF" />
            <h3 className="mt-4 text-xl font-medium">Start a new chat</h3>
            <p className="mt-1 text-slate-400 text-sm">Brainstorm, write, learn — anything you can ask Claude Sonnet 4.5.</p>
            <div className="mt-6 flex items-center gap-2 text-vortex-cyan text-sm group-hover:translate-x-1 transition-transform">
              Open chat <ArrowRight size={16} />
            </div>
          </Link>
          <Link to="/dashboard/profile" className="glass rounded-2xl p-8 hover:-translate-y-1 hover:border-white/20 transition-all group" data-testid="launch-profile">
            <Sparkle size={28} weight="duotone" color="#00F0FF" />
            <h3 className="mt-4 text-xl font-medium">Your profile</h3>
            <p className="mt-1 text-slate-400 text-sm">Manage account details, your plan, and credit balance.</p>
            <div className="mt-6 flex items-center gap-2 text-vortex-cyan text-sm group-hover:translate-x-1 transition-transform">
              Open profile <ArrowRight size={16} />
            </div>
          </Link>
        </div>

        {/* Recent activity */}
        <div className="mt-10 glass rounded-2xl p-6">
          <div className="flex items-center gap-2 text-mono-accent">
            <Clock size={14} /> Recent activity
          </div>
          <div className="mt-4 divide-y divide-white/5">
            {(summary?.activity || []).length === 0 && (
              <div className="text-slate-500 text-sm py-4">No activity yet. Start a chat to see history here.</div>
            )}
            {(summary?.activity || []).map((a) => (
              <div key={a.id} className="py-3 flex items-center justify-between text-sm">
                <div className="flex-1 truncate">
                  <span className="text-mono-accent mr-3">{a.kind}</span>
                  <span className="text-slate-300">{a.summary}</span>
                </div>
                <span className="text-slate-500 text-xs">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
