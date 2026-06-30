import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save, Download, FileCode2, Play, Loader2, Sparkles, Monitor, Tablet, Smartphone, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Editor from "@monaco-editor/react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import api from "@/lib/api";
import BuildStatusPanel from "./BuildStatusPanel";

export default function WebsiteEditor({ project, onBack, onUpdateFiles, onChat }) {
  // Migrate legacy keys if they exist
  const migrateLegacyFiles = (legacyFiles) => {
      if (!legacyFiles) return { "index.html": "", "styles.css": "", "script.js": "" };
      const migrated = { ...legacyFiles };
      if (migrated.html !== undefined && migrated["index.html"] === undefined) {
          migrated["index.html"] = migrated.html;
          delete migrated.html;
      }
      if (migrated.css !== undefined && migrated["styles.css"] === undefined) {
          migrated["styles.css"] = migrated.css;
          delete migrated.css;
      }
      if (migrated.js !== undefined && migrated["script.js"] === undefined) {
          migrated["script.js"] = migrated.js;
          delete migrated.js;
      }
      return migrated;
  };

  const initialFiles = migrateLegacyFiles(project?.files);
  const [activeFile, setActiveFile] = useState(initialFiles["index.html"] !== undefined ? "index.html" : Object.keys(initialFiles)[0] || "index.html");
  const [files, setFiles] = useState(initialFiles);
  const [isChatting, setIsChatting] = useState(false);
  const [chatJobId, setChatJobId] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [viewMode, setViewMode] = useState("desktop");
  const iframeRef = useRef(null);

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(files) !== JSON.stringify(project?.files)) {
        onUpdateFiles(project.id, files);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [files, project?.id, project?.files, onUpdateFiles]);

  const updatePreview = () => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentWindow?.document;
    if (!doc) return;

    const html = files["index.html"] || files.html || "";
    const css = files["styles.css"] || files.css || "";
    const js = files["script.js"] || files.js || "";

    let fullSrc = html;
    const htmlLower = html.toLowerCase();
    
    // Check if the html string already contains a full document
    if (htmlLower.includes("<html") || htmlLower.includes("<!doctype html>")) {
       // It's a full document, we need to inject CSS and JS
       if (css) {
           const safeCss = css.replace(/<\/style>/ig, ''); // Prevent style breakout
           if (htmlLower.includes("</head>")) {
               fullSrc = fullSrc.replace(/<\/head>/i, () => `<style>${safeCss}</style>\n</head>`);
           } else {
               fullSrc = `<style>${safeCss}</style>\n` + fullSrc;
           }
       }
       if (js) {
           const safeJs = js.replace(/<\/script>/ig, '<\\/script>');
           // Detect if the code looks like JSX to inject Babel
           const isJsx = safeJs.includes("/>") || safeJs.match(/<\/[a-zA-Z]+>/) || safeJs.includes("React.");
           const scriptTag = isJsx 
             ? `<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>\n<script type="text/babel" data-type="module">${safeJs}<\/script>`
             : `<script>${safeJs}<\/script>`;
           if (htmlLower.includes("</body>")) {
               fullSrc = fullSrc.replace(/<\/body>/i, () => `${scriptTag}\n</body>`);
           } else {
               fullSrc = fullSrc + `\n${scriptTag}`;
           }
       }
    } else {
      // It's just a fragment, wrap it
      const safeCss = css.replace(/<\/style>/ig, '');
      const safeJs = js.replace(/<\/script>/ig, '<\\/script>');
      fullSrc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>${safeCss}</style>
        </head>
        <body>
          ${html}
          <script>${safeJs}<\/script>
        </body>
      </html>
      `;
    }

    iframeRef.current.srcdoc = fullSrc;
  };

  useEffect(() => {
    updatePreview();
  }, [files]);

  const handleDownload = () => {
    const zip = new JSZip();
    Object.entries(files).forEach(([name, content]) => zip.file(name, content));
    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, `${project.name || "website"}.zip`);
    });
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    setIsChatting(true);
    try {
      const jobId = await onChat(project.id, chatInput);
      setChatJobId(jobId);
    } catch (err) {
      toast.error("Failed to send request");
      setIsChatting(false);
    }
  };

  const handleChatComplete = (data) => {
    setChatJobId(null);
    setIsChatting(false);
    if (data.status === "done") {
      setFiles(data.files);
      toast.success("Changes applied!");
      setChatInput("");
    } else {
      toast.error(data.error || "Failed to apply changes");
    }
  };

  const getEditorLanguage = () => {
    if (!activeFile) return "plaintext";
    const ext = activeFile.split(".").pop();
    if (ext === "html") return "html";
    if (ext === "css") return "css";
    if (ext === "js" || ext === "jsx") return "javascript";
    if (ext === "ts" || ext === "tsx") return "typescript";
    if (ext === "json") return "json";
    return "plaintext";
  };

  const copyFileCode = () => {
    navigator.clipboard.writeText(files[activeFile] || "");
    toast.success("Copied to clipboard");
  };

  return (
    <div className="h-full flex flex-col bg-[#020617] text-white">
      {chatJobId && (
        <BuildStatusPanel 
          jobId={chatJobId} 
          onComplete={handleChatComplete}
          api={api}
        />
      )}
      {/* Topbar */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/40">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="font-medium">{project?.name || "Untitled Project"}</div>
            <div className="text-xs text-slate-500">
              {Object.keys(files).length} files • {Object.values(files).reduce((a, b) => a + b.length, 0).toLocaleString()} bytes
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
            <button onClick={() => setViewMode("desktop")} className={`p-1.5 rounded-md ${viewMode === "desktop" ? "bg-white/10" : "text-slate-400 hover:text-white"}`}>
              <Monitor size={16} />
            </button>
            <button onClick={() => setViewMode("tablet")} className={`p-1.5 rounded-md ${viewMode === "tablet" ? "bg-white/10" : "text-slate-400 hover:text-white"}`}>
              <Tablet size={16} />
            </button>
            <button onClick={() => setViewMode("mobile")} className={`p-1.5 rounded-md ${viewMode === "mobile" ? "bg-white/10" : "text-slate-400 hover:text-white"}`}>
              <Smartphone size={16} />
            </button>
          </div>
          <div className="flex gap-2">
            <Button onClick={copyFileCode} variant="outline" size="sm" className="bg-transparent border-white/20 hover:bg-white/10 text-slate-300">
              <Copy size={14} className="mr-2" /> Copy File
            </Button>
            <Button onClick={handleDownload} size="sm" className="bg-cyan-500 text-black hover:bg-cyan-400">
              <Download size={14} className="mr-2" /> Export ZIP
            </Button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Left Panel: Editor & Chat */}
          <Panel defaultSize={40} minSize={25} className="flex flex-col border-r border-white/10 bg-[#0f172a]">
            {/* File Explorer & Editor */}
            <div className="flex flex-1 overflow-hidden">
              {/* File Explorer */}
              <div className="w-56 bg-[#0a0f1c] border-r border-white/10 p-2 overflow-y-auto hidden md:block">
                 <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-2 px-2 flex justify-between items-center">
                   <span>Project Files</span>
                   <span className="bg-white/10 px-1.5 py-0.5 rounded text-white">{Object.keys(files).length}</span>
                 </div>
                 <div className="space-y-0.5">
                   {Object.keys(files).sort().map(filename => (
                      <button
                        key={filename}
                        onClick={() => setActiveFile(filename)}
                        className={`w-full flex items-center text-left px-2 py-1.5 rounded text-sm group ${activeFile === filename ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-300 hover:bg-white/5'}`}
                      >
                        <FileCode2 size={14} className={`mr-2 flex-shrink-0 ${activeFile === filename ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                        <span className="truncate flex-1">{filename}</span>
                      </button>
                   ))}
                 </div>
              </div>
              
              <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
                <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-[#1e1e1e]">
                  <div className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <FileCode2 size={14} className="text-slate-500" />
                    {activeFile}
                  </div>
                  <span className="text-xs text-slate-500">{getEditorLanguage().toUpperCase()}</span>
                </div>
                
                {/* Editor */}
                <div className="flex-1 relative">
                  <Editor
                    height="100%"
                    language={getEditorLanguage()}
                    theme="vs-dark"
                    value={files[activeFile] || ""}
                    onChange={(val) => setFiles(prev => ({ ...prev, [activeFile]: val }))}
                    options={{ 
                      minimap: { enabled: false }, 
                      fontSize: 14, 
                      wordWrap: "on",
                      padding: { top: 16 },
                      scrollBeyondLastLine: false,
                      smoothScrolling: true,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* AI Assistant Chat */}
            <div className="h-48 border-t border-white/10 p-4 bg-[#0a0f1c] flex flex-col">
              <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={12} className="text-cyan-400" /> AI Assistant Editing
              </div>
              <Textarea 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask GREXO to modify this website (e.g., 'Make the navbar sticky' or 'Add dark mode')..."
                className="flex-1 bg-black/40 border-white/10 resize-none mb-3 text-sm focus:border-cyan-500/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChat();
                  }
                }}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Smart AI will modify only necessary files.</span>
                <Button onClick={handleChat} disabled={isChatting || !chatInput.trim()} size="sm" className="bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  {isChatting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  Apply Changes
                </Button>
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-white/5 hover:bg-cyan-500/50 transition-colors cursor-col-resize" />

          {/* Right Panel: Preview */}
          <Panel defaultSize={60} className="bg-[#020617] relative flex flex-col p-6 items-center justify-center">
            <div 
              className="bg-white rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ring-1 ring-white/10"
              style={{
                width: viewMode === "desktop" ? "100%" : viewMode === "tablet" ? "768px" : "375px",
                height: "100%",
                maxWidth: "100%"
              }}
            >
              <iframe
                ref={iframeRef}
                title="preview"
                className="w-full h-full border-none bg-white"
                sandbox="allow-scripts allow-modals allow-popups allow-presentation allow-same-origin"
              />
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
