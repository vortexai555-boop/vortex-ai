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
  PaperPlaneRight, Plus, Trash, PencilSimple, DownloadSimple, ChatCircleDots, Sparkle, Copy, Check, Globe, PlusCircle, X
} from "@phosphor-icons/react";
import GrexoLogo from "@/components/GrexoLogo";

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
  const [webSearch, setWebSearch] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const scrollRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files)]);
    }
    e.target.value = null; // reset
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const loadConversations = React.useCallback(async () => {
    try {
      const r = await api.get("/conversations");
      setConversations(r.data || []);
    } catch (_e) {
      /* ignore */
    }
  }, []);

  const loadConversation = React.useCallback(async (id) => {
    if (!id) { setCurrent(null); return; }
    try {
      const r = await api.get(`/conversations/${id}`);
      setCurrent(r.data);
    } catch {
      navigate("/dashboard/chat");
    }
  }, [navigate]);
  
 useEffect(() => {
  loadConversations();
}, [loadConversations])
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  loadConversation(cid);
}, [cid, loadConversation]);

  // Auto-scroll logic
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // User is at bottom if they are within 100px of the bottom
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "auto",
      });
    }
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [current?.messages, sending, isAtBottom]);
  
  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if ((!text && attachments.length === 0) || sending) return;
    setInput("");
    setSending(true);

    const filesBase64 = await Promise.all(
      attachments.map((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve({ mime: file.type, data: reader.result.split(',')[1] });
          reader.onerror = (error) => reject(error);
        });
      })
    );
    setAttachments([]);

    // Optimistic add
    const displayContent = text ? text : "[Attached Image]";
    const optimistic = { role: "user", content: displayContent, ts: new Date().toISOString() };
    setCurrent((c) => c ? { ...c, messages: [...(c.messages || []), optimistic] } : { id: null, messages: [optimistic], title: displayContent.slice(0, 60) });
    try {
      const r = await api.post("/chat/send", { conversation_id: current?.id || null, message: text, tool: "chat", web_search: webSearch, files: filesBase64 });
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

  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopy = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      toast.success("Message copied to clipboard!", { duration: 2000 });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (e) {
      toast.error("Failed to copy message.");
    }
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
      <aside className="hidden lg:flex w-72 border-r border-white/5 bg-grexo-surface/50 flex-col">
        <div className="p-4 border-b border-white/5">
          <Button onClick={newChat} className="w-full btn-primary-grexo" data-testid="new-chat-btn">
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
                    className="h-8 bg-grexo-elevated border-white/20"
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
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-grexo-surface/30">
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

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {!current?.messages?.length && (
              <div className="text-center py-16">
                <div className="flex justify-center mb-6"><GrexoLogo size={56} withText={false} /></div>
                <h2 className="text-3xl font-light tracking-tight">How can <span className="text-gradient-cyan">grexo</span> help today?</h2>
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
                      <Sparkle size={14} className="inline mr-2 text-grexo-cyan" /> {s}
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
                      <GrexoLogo size={32} withText={false} />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${m.role === "user" ? "bg-grexo-navy text-white border border-grexo-cyan/20" : "glass text-slate-100"} group relative`}>
                    {m.role === "assistant" && (
                      <button
                        onClick={() => handleCopy(m.content, i)}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded p-1.5"
                        title="Copy message"
                      >
                        {copiedIndex === i ? <Check size={16} weight="bold" className="text-grexo-cyan" /> : <Copy size={16} />}
                      </button>
                    )}
                    {m.role === "assistant" ? <Markdown source={m.content} /> : <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {sending && (
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <div className="w-8 h-8 rounded-full overflow-hidden"><GrexoLogo size={32} withText={false} /></div>
                <div className="glass rounded-2xl px-5 py-3 flex items-center gap-2" data-testid="chat-loading">
                  <span className="w-1.5 h-1.5 rounded-full bg-grexo-cyan animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-grexo-cyan animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-grexo-cyan animate-pulse" style={{ animationDelay: "300ms" }} />
                  <span className="ml-2 text-xs">grexo is thinking…</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={send} className="border-t border-white/5 bg-grexo-surface/40 p-4">
          <div className="max-w-3xl mx-auto">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs text-slate-300">
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button type="button" onClick={() => removeAttachment(i)} className="text-slate-400 hover:text-white">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="glass-strong rounded-2xl p-2 flex items-end gap-2">
              <label htmlFor="file-upload-chat" className="h-11 px-3 mt-auto flex items-center justify-center text-slate-500 hover:text-slate-300 cursor-pointer transition-colors" title="Upload file or image">
                <PlusCircle size={24} weight="regular" className="pointer-events-none" />
                <input id="file-upload-chat" type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => {
                  console.log("File selected:", e.target.files);
                  handleFileChange(e);
                }} />
              </label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
                placeholder="Message grexo ai…"
                rows={1}
                className="min-h-[44px] max-h-40 resize-none bg-transparent border-0 focus-visible:ring-0 text-base placeholder:text-slate-500"
                data-testid="chat-input"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setWebSearch(!webSearch)}
                className={`h-11 px-3 mt-auto ${webSearch ? 'text-grexo-cyan bg-grexo-cyan/10' : 'text-slate-500 hover:text-slate-300'}`}
                title="Toggle Web Search"
              >
                <Globe size={20} weight={webSearch ? "fill" : "regular"} />
              </Button>
              <Button type="submit" disabled={sending || (!input.trim() && attachments.length === 0)} className="btn-primary-grexo h-11 px-5" data-testid="chat-send">
                <PaperPlaneRight size={16} weight="fill" />
              </Button>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Grexo can make mistakes. Verify important info.</span>
              <span className="text-grexo-cyan">Tip: Toggle Web Search on for accurate, up-to-date answers!</span>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
