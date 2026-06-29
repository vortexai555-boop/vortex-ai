import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save, Download, FileCode2, Play, Loader2, Sparkles, Monitor, Tablet, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Editor from "@monaco-editor/react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import api from "@/lib/api";

export default function WebsiteEditor({ project, onBack, onUpdateFiles, onChat }) {
  const [activeFile, setActiveFile] = useState("index.html");
  const [files, setFiles] = useState(project?.files || { "index.html": "", "styles.css": "", "script.js": "" });
  const [isChatting, setIsChatting] = useState(false);
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

    const fullSrc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>${css}</style>
        </head>
        <body>
          ${html}
          <script>${js}<\/script>
        </body>
      </html>
    `;
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
      toast.loading("Applying changes...", { id: "chat" });
      
      const interval = setInterval(async () => {
        try {
          const res = await api.get(`/website/jobs/${jobId}`);
          const data = res.data;
          if (data.status === "done") {
            clearInterval(interval);
            setFiles(data.files);
            toast.success("Changes applied!", { id: "chat" });
            setIsChatting(false);
            setChatInput("");
          } else if (data.status === "error") {
            clearInterval(interval);
            toast.error(data.error || "Failed to apply changes", { id: "chat" });
            setIsChatting(false);
          }
        } catch (e) {
          clearInterval(interval);
          toast.error("Status check failed", { id: "chat" });
          setIsChatting(false);
        }
      }, 3000);
    } catch (err) {
      toast.error("Failed to send request");
      setIsChatting(false);
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

  return (
    <div className="h-full flex flex-col bg-[#020617] text-white">
      {/* Topbar */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/40">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="font-medium">{project?.name || "Untitled Project"}</div>
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
          <Button onClick={handleDownload} variant="outline" size="sm" className="bg-transparent border-white/20 hover:bg-white/10">
            <Download size={14} className="mr-2" /> Export
          </Button>
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
              <div className="w-48 bg-black/30 border-r border-white/10 p-2 overflow-y-auto hidden md:block">
                 <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-1 px-2">Files</div>
                 {Object.keys(files).map(filename => (
                    <button
                      key={filename}
                      onClick={() => setActiveFile(filename)}
                      className={`w-full flex items-center text-left px-2 py-1.5 rounded text-sm mb-1 ${activeFile === filename ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-white/5'}`}
                    >
                      <FileCode2 size={14} className="mr-2 flex-shrink-0" />
                      <span className="truncate">{filename}</span>
                    </button>
                 ))}
              </div>
              
              <div className="flex-1 flex flex-col min-w-0">
                <div className="h-10 border-b border-white/10 flex items-center px-4 text-sm font-medium text-slate-300 bg-black/20">
                  {activeFile}
                </div>
                
                {/* Editor */}
                <div className="flex-1 relative">
                  <Editor
                    height="100%"
                    language={getEditorLanguage()}
                    theme="vs-dark"
                    value={files[activeFile]}
                    onChange={(val) => setFiles(prev => ({ ...prev, [activeFile]: val }))}
                    options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: "on" }}
                  />
                </div>
              </div>
            </div>

            {/* AI Assistant Chat */}
            <div className="h-48 border-t border-white/10 p-4 bg-black/20 flex flex-col">
              <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={12} className="text-cyan-400" /> AI Assistant
              </div>
              <Textarea 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask GREXO to modify this website..."
                className="flex-1 bg-black/40 border-white/10 resize-none mb-3"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChat();
                  }
                }}
              />
              <div className="flex justify-end">
                <Button onClick={handleChat} disabled={isChatting || !chatInput.trim()} size="sm" className="bg-cyan-500 text-black hover:bg-cyan-400">
                  {isChatting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  Apply
                </Button>
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-white/5 hover:bg-cyan-500/50 transition-colors cursor-col-resize" />

          {/* Right Panel: Preview */}
          <Panel defaultSize={60} className="bg-[#020617] relative flex flex-col p-4 items-center justify-center">
            <div 
              className="bg-white rounded-xl overflow-hidden shadow-2xl transition-all duration-300"
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
