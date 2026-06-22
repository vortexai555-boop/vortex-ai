import React, { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Globe, Sparkle, Code as CodeIcon, DownloadSimple, ArrowsClockwise, ClipboardText, MonitorPlay, PlusCircle, X
} from "@phosphor-icons/react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const SITE_TYPES = [
  { v: "landing", l: "Landing Page" },
  { v: "business", l: "Business Site" },
  { v: "portfolio", l: "Portfolio" },
  { v: "ecommerce", l: "E-commerce" },
  { v: "restaurant", l: "Restaurant" },
];

const EXAMPLES = [
  "Modern landing page for a coffee subscription brand called Brewly",
  "Portfolio site for a UX designer named Maya with case studies",
  "Restaurant website for a Japanese ramen bar called Ten Tora",
  "E-commerce store for handmade ceramic lamps",
];

export default function WebsitePage() {
  const { refresh } = useAuth();
  const [description, setDescription] = useState("");
  const [siteType, setSiteType] = useState("landing");
  const [generating, setGenerating] = useState(false);
  const [current, setCurrent] = useState(null); // { id, html, description }
  const [selectedFile, setSelectedFile] = useState('');
  const [history, setHistory] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const iframeRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files)]);
    }
    e.target.value = null; // reset
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const parseFiles = (text) => {
    if (!text) return { preview: "", files: {} };
    const files = {};
    let htmlPreview = "";

    const blocks = text.split("```");
    if (blocks.length > 1) {
      for (let i = 1; i < blocks.length; i += 2) {
        const block = blocks[i];
        const lines = block.split('\n');
        const langInfo = lines.shift().trim();
        const lang = langInfo.split(' ')[0].toLowerCase();
        if (lines.length === 0) continue;
        
        let content = lines.join('\n');
        let filename = `file_${i}.${lang || 'txt'}`;
        
        const firstLine = lines[0].trim();
        let match = firstLine.match(/<!--\s*([a-zA-Z0-9_\-\.]+)\s*-->/);
        if (!match) match = firstLine.match(/\/\*\s*([a-zA-Z0-9_\-\.]+)\s*\*\//);
        if (!match) match = firstLine.match(/#\s*([a-zA-Z0-9_\-\.]+)/);
        if (!match) match = firstLine.match(/\/\/\s*([a-zA-Z0-9_\-\.]+)/);
        
        if (match && match[1] && match[1].includes('.')) {
          filename = match[1].trim();
        } else {
          if (lang === 'html' && !files['index.html']) filename = 'index.html';
          else if (lang === 'css' && !files['style.css']) filename = 'style.css';
          else if ((lang === 'javascript' || lang === 'js') && !files['script.js']) filename = 'script.js';
          else if (lang === 'python' && !files['app.py']) filename = 'app.py';
          else if (lang === 'json' && !files['package.json']) filename = 'package.json';
        }

        if (filename.toLowerCase() === 'index.html' || (lang === 'html' && !htmlPreview)) {
          htmlPreview = content;
          filename = 'index.html';
        }
        files[filename] = content;
      }
    } else {
      // No markdown blocks found at all
      if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
         htmlPreview = text;
         files['index.html'] = text;
      } else {
         files['output.txt'] = text;
      }
    }
    
    if (Object.keys(files).length === 0) {
      return { preview: text, files: { 'output.txt': text } };
    }
    
    // Inject scripts/css into HTML preview if they are separate files and not already referenced inline?
    // Doing true bundling here is complex, but we prioritize index.html
    return { preview: htmlPreview || "<html><body><h1>Backend code generated, but no index.html was found!</h1><p>Check the Code tab to view the generated files.</p></body></html>", files };
  };

  const loadHistory = async () => {
    try {
      const r = await api.get("/website");
      setHistory(r.data || []);
    } catch (_e) { /* ignore */ }
  };

  useEffect(() => { loadHistory(); }, []);

  const generate = async () => {
    const desc = description.trim();
    if (!desc || generating) return;
    setGenerating(true);
    setCurrent(null);

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

    try {
      const start = await api.post("/website/generate", { description: desc, site_type: siteType, files: filesBase64 });
      const jobId = start.data.job_id;
      if (!jobId) throw new Error("No job id returned");
      // Poll job status every 2 seconds, timeout after 5 minutes
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
      if (!done) throw new Error("Generation timed out — please try again");
      setCurrent({ id: done.site_id, html: done.html, description: desc });
      toast.success("Your website is ready");
      loadHistory();
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    if (!current?.html) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(current.html);
      } else {
        // Fallback for insecure contexts / older browsers
        const ta = document.createElement("textarea");
        ta.value = current.html;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("HTML copied to clipboard");
    } catch (_e) {
      toast.error("Clipboard blocked by browser. Use Download .html instead.");
    }
  };

  const downloadHtml = () => {
    if (!current?.html) return;
    const { preview } = parseFiles(current.html);
    const blob = new Blob([preview], { type: "text/html" });
    saveAs(blob, `grexo-site-${current.id || Date.now()}.html`);
  };

  const downloadZip = async () => {
    if (!current?.html) return;
    const zip = new JSZip();
    const { files } = parseFiles(current.html);
    
    for (const [filename, content] of Object.entries(files)) {
      zip.file(filename, content);
    }
    
    zip.file("README.md", `# grexo ai Generated Site\n\nPrompt: ${current.description || description}\nGenerated: ${new Date().toISOString()}\n\n## To preview\nOpen index.html in any browser.\n`);
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `grexo-site-${current.id || Date.now()}.zip`);
  };

  const openHistory = async (item) => {
    setCurrent({ id: item.id, html: item.html, description: item.description });
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto p-6 lg:p-10">
        <div className="text-mono-accent mb-2">Tool</div>
        <h1 className="text-4xl font-light tracking-tighter">
          Website <span className="text-gradient-cyan font-medium">Builder</span>
        </h1>
        <p className="mt-2 text-slate-400">Describe a site. Grexo generates a beautiful, responsive single-page HTML file with Claude Sonnet 4.5.</p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          {/* Input panel */}
          <div className="lg:col-span-4">
            <div className="glass rounded-2xl p-6 sticky top-6">
              <div className="text-mono-accent mb-2">Describe your website</div>
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
              <div className="relative">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. A modern landing page for a coffee subscription brand called Brewly..."
                  className="mt-3 min-h-[140px] pb-12 bg-[#0A0A12] text-white placeholder-slate-500 border-white/10 focus-visible:ring-[#00F0FF] resize-none"
                  data-testid="website-prompt-input"
                />
                <div className="absolute left-2 bottom-2">
                  <label htmlFor="file-upload-website" className="p-2 flex justify-center items-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 cursor-pointer transition-colors" title="Upload file or image">
                    <PlusCircle size={20} weight="regular" className="pointer-events-none" />
                    <input id="file-upload-website" type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={handleFileChange} />
                  </label>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-mono-accent mb-2">Site type</div>
                <Select value={siteType} onValueChange={setSiteType}>
                  <SelectTrigger className="bg-grexo-elevated border-white/10 h-11" data-testid="website-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SITE_TYPES.map((s) => (
                      <SelectItem key={s.v} value={s.v} data-testid={`website-type-${s.v}`}>{s.l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generate} disabled={generating || !description.trim()} className="mt-5 w-full h-12 btn-primary-grexo" data-testid="website-generate-btn">
                {generating ? "Generating…" : <><Sparkle size={16} weight="fill" className="mr-2" /> Generate Website</>}
              </Button>
              <div className="mt-3 text-xs text-slate-500">Costs 3 credits per generation.</div>

              <div className="mt-6">
                <div className="text-mono-accent mb-2">Examples</div>
                <div className="space-y-2">
                  {EXAMPLES.map((e, i) => (
                    <button
                      key={i}
                      onClick={() => setDescription(e)}
                      className="w-full text-left text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/15 transition"
                      data-testid={`website-example-${i}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Output panel */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {generating ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-2xl p-16 text-center">
                  <Globe size={48} className="mx-auto text-grexo-cyan animate-grexo-pulse" />
                  <div className="mt-6 text-xl">Crafting your website…</div>
                  <div className="mt-2 text-slate-500 text-sm">Generating layout, design and content with Claude.</div>
                  <div className="mt-6 flex items-center justify-center gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} className="w-1.5 h-6 bg-grexo-cyan/40 rounded animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                    ))}
                  </div>
                </motion.div>
              ) : current ? (
                <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="glass rounded-2xl p-2">
                    <Tabs defaultValue="preview" className="w-full">
                      <div className="flex items-center justify-between p-3">
                        <TabsList className="bg-grexo-elevated border border-white/5">
                          <TabsTrigger value="preview" data-testid="website-tab-preview"><MonitorPlay size={14} className="mr-2" /> Preview</TabsTrigger>
                          <TabsTrigger value="code" data-testid="website-tab-code"><CodeIcon size={14} className="mr-2" /> Code</TabsTrigger>
                        </TabsList>
                        <div className="flex items-center gap-2">
                          <Button onClick={generate} variant="outline" size="sm" className="btn-ghost-grexo" data-testid="website-regenerate-btn">
                            <ArrowsClockwise size={14} className="mr-1.5" /> Regenerate
                          </Button>
                          <Button onClick={copyCode} variant="outline" size="sm" className="btn-ghost-grexo" data-testid="website-copy-btn">
                            <ClipboardText size={14} className="mr-1.5" /> Copy
                          </Button>
                          <Button onClick={downloadZip} size="sm" className="btn-primary-grexo" data-testid="website-zip-btn">
                            <DownloadSimple size={14} className="mr-1.5" /> ZIP
                          </Button>
                        </div>
                      </div>
                      <TabsContent value="preview" className="m-0">
                        <div className="rounded-xl overflow-hidden border border-white/5 bg-white">
                          <iframe
                            ref={iframeRef}
                            srcDoc={parseFiles(current.html).preview}
                            title="Generated website preview"
                            sandbox="allow-scripts"
                            className="w-full h-[640px] bg-white"
                            data-testid="website-preview-iframe"
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value="code" className="m-0">
                        <div className="flex h-[640px] rounded-xl border border-white/5 bg-[#07080d] overflow-hidden">
                          <div className="w-1/3 min-w-[200px] border-r border-white/5 bg-black/40 overflow-y-auto p-2">
                            <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold px-3 py-2 mb-1">Project Files</div>
                            {Object.entries(parseFiles(current.html).files).map(([filename, content]) => (
                               <button
                                 key={filename}
                                 onClick={() => setSelectedFile(filename)}
                                 className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                                    (selectedFile || Object.keys(parseFiles(current.html).files)[0]) === filename
                                      ? 'bg-grexo-cyan/10 text-grexo-cyan' 
                                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                 }`}
                               >
                                 {filename}
                               </button>
                            ))}
                          </div>
                          <div className="flex-1 overflow-auto p-4 w-2/3">
                            <pre className="text-xs leading-relaxed">
                              <code className="text-cyan-100" data-testid="website-code-block">
                                {parseFiles(current.html).files[selectedFile || Object.keys(parseFiles(current.html).files)[0]] || current.html}
                              </code>
                            </pre>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button onClick={downloadHtml} variant="ghost" size="sm" className="text-slate-400 hover:text-white" data-testid="website-html-btn">
                      <DownloadSimple size={14} className="mr-1.5" /> Download .html
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-16 text-center">
                  <Globe size={48} className="mx-auto text-grexo-cyan opacity-60" />
                  <div className="mt-6 text-xl font-light">No website yet</div>
                  <div className="mt-2 text-slate-500 text-sm">Describe what you want on the left and hit Generate.</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* History */}
            {history.length > 0 && (
              <div className="mt-8">
                <div className="text-mono-accent mb-3">Your projects</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {history.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => openHistory(h)}
                      className="text-left glass rounded-xl p-4 hover:border-white/20 hover:-translate-y-0.5 transition"
                      data-testid={`website-history-${h.id}`}
                    >
                      <div className="text-sm font-medium truncate">{h.description}</div>
                      <div className="mt-1 text-xs text-slate-500">{new Date(h.created_at).toLocaleString()} · {h.site_type}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
