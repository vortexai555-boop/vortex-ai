import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "@/components/Markdown";
import {
  PaperPlaneRight, Plus, Trash, PencilSimple, DownloadSimple, ChatCircleDots, Sparkle,
} from "@phosphor-icons/react";
import VortexLogo from "@/components/VortexLogo";

export default function ChatPage() {
  const { cid } = useParams();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [current, setCurrent] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const scrollRef = useRef(null);

  const loadConversations = async () => {
    try {
      const r = await api.get("/conversations");
      setConversations(r.data || []);
    } catch (_e) {
      /* ignore */
    }
  };

  const loadConversation = async (id) => {
    if (!id) { setCurrent(null); return; }
    try {
      const r = await api.get(`/conversations/${id}`);
      setCurrent(r.data);
    } catch {
      navigate("/dashboard/chat");
    }
  };

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { loadConversation(cid); }, [cid]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [current?.messages, sending]);

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    // Optimistic add
    const optimistic = { role: "user", content: text, ts: new Date().toISOString() };
    setCurrent((c) => c ? { ...c, messages: [...(c.messages || []), optimistic] } : { id: null, messages: [optimistic], title: text.slice(0, 60) });
    try {
      const r = await api.post("/chat/send", { conversation_id: current?.id || null, message: text, tool: "chat" });
      const newCid = r.data.conversation_id;
      const aiMsg = { role: "assistant", content: r.data.reply, ts: new Date().toISOString() };
      setCurrent((c) => ({ ...(c || {}), id: newCid, messages: [...(c?.messages || []), aiMsg] }));
      if (!cid || cid !== newCid) {
        navigate(`/dashboard/chat/${newCid}`, { replace: true });
      }
      loadConversations();
      refresh();
    } catch (err) {
      const detail = err?.response?.data?.detail || "Failed to send";
      toast.error(detail);
      setCurrent((c) => c ? { ...c, messages: (c.messages || []).slice(0, -1) } : null);
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const newChat = () => {
    setCurrent(null);
    navigate("/dashboard/chat");
  };

  const removeConv = async (id, e) => {
    e?.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    await api.delete(`/conversations/${id}`);
    if (cid === id) newChat();
    loadConversations();
  };

  const startRename = (c, e) => {
    e?.stopPropagation();
    setRenaming(c.id);
    setRenameVal(c.title);
  };

  const saveRename = async (id) => {
    if (renameVal.trim()) {
      await api.patch(`/conversations/${id}`, { title: renameVal.trim() });
      loadConversations();
      if (current?.id === id) setCurrent((c) => ({ ...c, title: renameVal.trim() }));
    }
    setRenaming(null);
  };

  const exportConv = () => {
    if (!current) return;
    const lines = [`# ${current.title || "Chat"}\n`];
    (current.messages || []).forEach((m) => {
      lines.push(`### ${m.role.toUpperCase()}`);
      lines.push(m.content);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(current.title || "chat").replace(/[^a-z0-9-_]+/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full">
      {/* Chat list panel */}
      <aside className="hidden lg:flex w-72 border-r border-white/5 bg-vortex-surface/50 flex-col">
        <div className="p-4 border-b border-white/5">
          <Button onClick={newChat} className="w-full btn-primary-vortex" data-testid="new-chat-btn">
            <Plus size={16} className="mr-2" /> New chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-1">
          {conversations.length === 0 && (
            <div className="text-slate-500 text-xs px-3 py-6 text-center">No conversations yet</div>
          )}
          {conversations.map((c) => {
            const active = c.id === cid;
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/dashboard/chat/${c.id}`)}
                className={`group rounded-lg px-3 py-2 text-sm cursor-pointer transition ${active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
                data-testid={`conv-item-${c.id}`}
              >
                {renaming === c.id ? (
                  <Input
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={() => saveRename(c.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveRename(c.id); if (e.key === "Escape") setRenaming(null); }}
                    className="h-8 bg-vortex-elevated border-white/20"
                    data-testid={`conv-rename-input-${c.id}`}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate flex-1">{c.title || "Untitled"}</div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                      <button onClick={(e) => startRename(c, e)} className="p-1 hover:text-white" title="Rename" data-testid={`conv-rename-${c.id}`}>
                        <PencilSimple size={14} />
                      </button>
                      <button onClick={(e) => removeConv(c.id, e)} className="p-1 hover:text-red-400" title="Delete" data-testid={`conv-delete-${c.id}`}>
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main chat area */}
      <section className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-vortex-surface/30">
          <div className="flex items-center gap-3 min-w-0">
            <ChatCircleDots size={20} color="#00F0FF" />
            <div className="text-sm truncate" data-testid="chat-title">{current?.title || "New chat"}</div>
          </div>
          <div className="flex items-center gap-2">
            {current?.id && (
              <Button variant="ghost" size="sm" onClick={exportConv} data-testid="chat-export" className="text-slate-300 hover:text-white">
                <DownloadSimple size={16} className="mr-1.5" /> Export
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={newChat} data-testid="chat-new" className="text-slate-300 hover:text-white lg:hidden">
              <Plus size={16} />
            </Button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {!current?.messages?.length && (
              <div className="text-center py-16">
                <div className="flex justify-center mb-6"><VortexLogo size={56} withText={false} /></div>
                <h2 className="text-3xl font-light tracking-tight">How can <span className="text-gradient-cyan">VORTEX</span> help today?</h2>
                <p className="mt-3 text-slate-400">Ask anything. Brainstorm, debug, plan, write — start with a prompt below.</p>
                <div className="mt-8 grid sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                  {[
                    "Explain quantum entanglement like I'm 12",
                    "Draft a launch tweet for my SaaS",
                    "Plan a 7-day Tokyo itinerary",
                    "Review this resume bullet for impact",
                  ].map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(s)}
                      className="glass rounded-xl px-4 py-3 text-left text-sm text-slate-300 hover:border-white/20 hover:-translate-y-0.5 transition"
                      data-testid={`prompt-suggestion-${i}`}
                    >
                      <Sparkle size={14} className="inline mr-2 text-vortex-cyan" /> {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {(current?.messages || []).map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-6 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`msg-${m.role}-${i}`}
                >
                  {m.role === "assistant" && (
                    <div className="w-8 h-8 mr-3 rounded-full overflow-hidden flex-shrink-0">
                      <VortexLogo size={32} withText={false} />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${m.role === "user" ? "bg-vortex-navy text-white border border-vortex-cyan/20" : "glass text-slate-100"}`}>
                    {m.role === "assistant" ? <Markdown source={m.content} /> : <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {sending && (
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <div className="w-8 h-8 rounded-full overflow-hidden"><VortexLogo size={32} withText={false} /></div>
                <div className="glass rounded-2xl px-5 py-3 flex items-center gap-2" data-testid="chat-loading">
                  <span className="w-1.5 h-1.5 rounded-full bg-vortex-cyan animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-vortex-cyan animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-vortex-cyan animate-pulse" style={{ animationDelay: "300ms" }} />
                  <span className="ml-2 text-xs">VORTEX is thinking…</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={send} className="border-t border-white/5 bg-vortex-surface/40 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="glass-strong rounded-2xl p-2 flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
                placeholder="Message VORTEX AI…"
                rows={1}
                className="min-h-[44px] max-h-40 resize-none bg-transparent border-0 focus-visible:ring-0 text-base placeholder:text-slate-500"
                data-testid="chat-input"
              />
              <Button type="submit" disabled={sending || !input.trim()} className="btn-primary-vortex h-11 px-5" data-testid="chat-send">
                <PaperPlaneRight size={16} weight="fill" />
              </Button>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 text-center">Vortex can make mistakes. Verify important info.</div>
          </div>
        </form>
      </section>
    </div>
  );
}
