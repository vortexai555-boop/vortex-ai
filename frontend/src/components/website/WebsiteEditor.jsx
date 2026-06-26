import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  Globe, FileCode2, FileText, Monitor, Tablet, Smartphone, 
  Download, Copy, Maximize2, Minimize2, ArrowLeft, Edit2, 
  Check, LayoutPanelLeft, Play, Square, Terminal, X,
  FolderOpen, ChevronRight, ChevronDown, Wand2, Search,
  Settings, CheckCircle2, CircleDashed, FileJson, File, Database, Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Editor from "@monaco-editor/react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import api from "@/lib/api";
import { SandpackProvider, SandpackPreview, SandpackConsole } from "@codesandbox/sandpack-react";
import ExportDeployModal from "./ExportDeployModal";

const getFileInfo = (path) => {
  if (!path) return { icon: File, name: "", lang: "plaintext", color: "text-slate-400" };
  const name = path.split("/").pop() || path;
  const ext = name.split(".").pop()?.toLowerCase();
  
  if (name === "package.json" || ext === "json") return { icon: FileJson, name, lang: "json", color: "text-green-400" };
  if (["html", "htm"].includes(ext)) return { icon: FileCode2, name, lang: "html", color: "text-orange-400" };
  if (["css", "scss", "sass"].includes(ext)) return { icon: Globe, name, lang: "css", color: "text-blue-400" };
  if (["js", "jsx"].includes(ext)) return { icon: FileText, name, lang: "javascript", color: "text-yellow-400" };
  if (["ts", "tsx"].includes(ext)) return { icon: FileText, name, lang: "typescript", color: "text-blue-500" };
  if (["py"].includes(ext)) return { icon: FileCode2, name, lang: "python", color: "text-blue-300" };
  if (["md"].includes(ext)) return { icon: FileText, name, lang: "markdown", color: "text-slate-300" };
  if (["sql", "db"].includes(ext)) return { icon: Database, name, lang: "sql", color: "text-purple-400" };
  return { icon: File, name, lang: "plaintext", color: "text-slate-400" };
};

const FileTree = ({ items, currentPath, openFile, activeFile, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  if (items.type === "file") {
    const info = getFileInfo(currentPath);
    const Icon = info.icon;
    return (
      <div 
        onClick={() => openFile(currentPath)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={`flex items-center gap-2 py-1 pr-2 rounded-sm text-sm cursor-pointer transition-colors ${activeFile === currentPath ? "bg-cyan-500/20 text-cyan-100" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
      >
        <Icon size={14} className={info.color} />
        <span className="truncate">{info.name}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className="flex items-center gap-1 py-1 pr-2 rounded-sm text-sm font-medium text-slate-300 hover:text-white cursor-pointer hover:bg-white/5 transition-colors"
      >
        {isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
        <FolderOpen size={14} className="text-yellow-500/80" />
        <span className="truncate">{currentPath.split("/").pop() || currentPath}</span>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: "auto", opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex flex-col"
          >
            {Object.keys(items.children).sort((a,b) => {
               // Sort folders first
               const aIsFolder = items.children[a].type === "folder";
               const bIsFolder = items.children[b].type === "folder";
               if (aIsFolder && !bIsFolder) return -1;
               if (!aIsFolder && bIsFolder) return 1;
               return a.localeCompare(b);
            }).map(key => (
              <FileTree 
                key={key} 
                items={items.children[key]} 
                currentPath={currentPath ? `${currentPath}/${key}` : key}
                openFile={openFile} 
                activeFile={activeFile} 
                depth={depth + 1} 
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function WebsiteEditor({ 
  project, 
  onBack, 
  onUpdateFiles, 
  onChat 
}) {
  const [activeFile, setActiveFile] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);
  const [viewMode, setViewMode] = useState("desktop");
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  
  // Default to a simple structure if none exists
  const defaultFiles = { "index.html": "<h1>Hello World</h1>", "styles.css": "", "script.js": "console.log('loaded');" };
  const initialFiles = (project?.files && Object.keys(project.files).length > 0) ? project.files : defaultFiles;
  
  const [files, setFiles] = useState(initialFiles);
  const [sidebarTab, setSidebarTab] = useState("explorer"); 
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(project?.name || "");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [bottomPanelTab, setBottomPanelTab] = useState("console");
  
  const [folderOpen, setFolderOpen] = useState(true);

  // Initialize active file safely
  useEffect(() => {
    if (Object.keys(files).length > 0 && !activeFile) {
      const firstHtml = Object.keys(files).find(f => f.endsWith(".html")) || Object.keys(files)[0];
      setOpenFiles([firstHtml]);
      setActiveFile(firstHtml);
    }
  }, []);

  useEffect(() => {
    if (project?.files && Object.keys(project.files).length > 0) {
      setFiles(project.files);
      const firstHtml = Object.keys(project.files).find(f => f.endsWith(".html")) || Object.keys(project.files)[0];
      if (firstHtml && !activeFile) {
        setOpenFiles([firstHtml]);
        setActiveFile(firstHtml);
      }
    }
    if (project?.name) setEditName(project.name);
  }, [project]);

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(files) !== JSON.stringify(project?.files)) {
        onUpdateFiles(project.id, files);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [files, project?.id, project?.files, onUpdateFiles]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'THUMBNAIL' && event.data.data) {
        if (project && project.thumbnail_url !== event.data.data) {
          api.put(`/website/${project.id}`, { thumbnail_url: event.data.data }).catch(console.error);
          project.thumbnail_url = event.data.data;
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [project]);

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    try {
      await api.put(`/website/${project.id}`, { name: editName.trim() });
      toast.success("Project renamed");
      setIsEditingName(false);
      if (project) project.name = editName.trim();
    } catch (err) {
      toast.error("Failed to rename project");
    }
  };

  const handleCopy = () => {
    if (files && files["html"]) {
      const fullHtml = getFullHtml();
      navigator.clipboard.writeText(fullHtml);
      toast.success("Source code copied to clipboard!");
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || isChatting) return;
    setIsChatting(true);
    try {
      await onChat(project.id, chatInput.trim());
      setChatInput("");
    } finally {
      setIsChatting(false);
    }
  };

  const closeFile = (e, fileId) => {
    e.stopPropagation();
    const newOpenFiles = openFiles.filter(f => f !== fileId);
    setOpenFiles(newOpenFiles);
    if (activeFile === fileId) {
      setActiveFile(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
    }
  };

  const openFile = (fileId) => {
    if (!openFiles.includes(fileId)) {
      setOpenFiles([...openFiles, fileId]);
    }
    setActiveFile(fileId);
  };

  const getFullHtml = () => {
    const html = files["index.html"] || files["html"] || "<h1>No HTML file</h1>";
    const css = files["styles.css"] || files["css"] || "";
    const js = files["script.js"] || files["js"] || "";
    return `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n<style>${css}</style>\n<script src="https://cdn.tailwindcss.com" crossorigin="anonymous"></script>\n</head>\n<body>\n${html}\n<script>${js}</script>\n</body>\n</html>`;
  };

  const getLanguage = (id) => getFileInfo(id).lang;
  
  // Build a tree from flat paths
  const buildTree = (fileMap) => {
    const root = { type: "folder", children: {} };
    for (const path of Object.keys(fileMap)) {
      const parts = path.split("/");
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current.children[part] = { type: "file" };
        } else {
          if (!current.children[part]) {
            current.children[part] = { type: "folder", children: {} };
          }
          current = current.children[part];
        }
      }
    }
    return root;
  };
  
  const fileTree = buildTree(files);

  return (
    <div className={`flex flex-col text-gray-200 overflow-hidden font-sans ${isFullScreen ? 'fixed inset-0 z-[100] bg-[#111111]' : 'h-full bg-transparent'}`}>
      
      {/* IDE Top Nav / Title Bar */}
      <div className="h-12 bg-[#18181b] border-b border-white/5 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-white rounded-md h-8 w-8 hover:bg-white/5">
            <ArrowLeft size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`text-slate-400 hover:text-white rounded-md h-8 w-8 hover:bg-white/5 ${isSidebarOpen ? 'bg-white/5' : ''}`}>
            <LayoutPanelLeft size={16} />
          </Button>
          <div className="h-4 w-px bg-white/10 mx-1" />
          
          {isEditingName ? (
            <div className="flex items-center gap-2 ml-1">
              <Input 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                className="h-7 bg-[#27272a] border-white/10 text-white w-48 text-sm px-2 focus-visible:ring-1 focus-visible:ring-cyan-500 rounded-md"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-white/5" onClick={handleSaveName}>
                <Check size={14} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group cursor-pointer ml-2" onClick={() => setIsEditingName(true)}>
              <span className="text-sm font-medium text-slate-200 tracking-wide">
                {project?.name || "Untitled Project"}
              </span>
              <Edit2 size={12} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isChatting && <div className="text-xs text-cyan-400 mr-2 flex items-center gap-1"><CircleDashed size={14} className="animate-spin" /> AI Working...</div>}
          
          {/* Viewport Toggles */}
          <div className="flex bg-[#27272a] rounded-md p-0.5 border border-white/5 mr-2">
            {["desktop", "tablet", "mobile"].map(mode => {
              const Icon = mode === "desktop" ? Monitor : mode === "tablet" ? Tablet : Smartphone;
              return (
                <button key={mode} onClick={() => setViewMode(mode)} title={mode} className={`p-1.5 rounded-sm transition-colors ${viewMode === mode ? "bg-[#3f3f46] text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                  <Icon size={14} />
                </button>
              )
            })}
          </div>

          <Button size="sm" variant="ghost" onClick={handleCopy} className="text-slate-300 hover:text-white h-8 hover:bg-white/10 bg-white/5 px-3 rounded-md" title="Copy HTML/CSS/JS">
            <Copy size={14} className="mr-2" /> <span className="text-xs font-medium">Copy</span>
          </Button>
          <ExportDeployModal project={project} files={files} />
          {!isFullScreen && (
            <Button size="sm" variant="ghost" onClick={() => setIsFullScreen(true)} className="text-cyan-400 hover:text-cyan-300 h-8 hover:bg-white/5 px-2.5 ml-1 rounded-md" title="Full Screen IDE">
              <Maximize2 size={14} />
            </Button>
          )}
          {isFullScreen && (
            <Button size="sm" variant="ghost" onClick={() => setIsFullScreen(false)} className="text-slate-400 hover:text-white h-8 hover:bg-white/5 px-2.5 ml-1 rounded-md" title="Exit Full Screen">
              <Minimize2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Main IDE Body */}
      <div className="flex-1 flex min-h-0 bg-[#1e1e1e]">
        <SandpackProvider 
          template={(() => {
            if (files["package.json"]) {
              try {
                const pkg = JSON.parse(files["package.json"]);
                if (pkg.dependencies?.next) return "nextjs";
                if (pkg.dependencies?.react) return "vite-react";
                if (pkg.dependencies?.vue) return "vite-vue";
                if (pkg.dependencies?.svelte) return "svelte";
              } catch (e) {}
            }
            if (files["next.config.js"]) return "nextjs";
            if (files["vite.config.js"] || files["vite.config.ts"]) return "vite-react";
            if (files["src/App.jsx"] || files["src/App.tsx"] || files["App.jsx"]) return "vite-react";
            if (files["src/App.vue"]) return "vite-vue";
            return "vanilla";
          })()}
          files={Object.entries(files).reduce((acc, [path, content]) => {
            let finalContent = content;
            const isVanilla = !files["package.json"] && !files["next.config.js"] && !files["vite.config.js"];
            if (isVanilla && (path === "index.html" || path === "/index.html") && !content.includes("tailwindcss")) {
                if (finalContent.includes("</head>")) {
                    finalContent = finalContent.replace("</head>", '<script src="https://cdn.tailwindcss.com"></script>\n</head>');
                } else {
                    finalContent = `<script src="https://cdn.tailwindcss.com"></script>\n${finalContent}`;
                }
            }
            acc[path.startsWith('/') ? path : `/${path}`] = finalContent;
            return acc;
          }, {})}
          options={{
            autoReload: true,
            initMode: "immediate",
            recompileMode: "delayed",
            recompileDelay: 500,
          }}
          className="flex-1 flex flex-col h-full w-full"
        >
          <ResizablePanelGroup direction="horizontal" className="flex-1">
          
          {/* Sidebar */}
          {isSidebarOpen && (
            <>
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="bg-[#18181b] flex flex-col border-r border-white/5">
                <div className="flex h-10 border-b border-white/5">
                  <button onClick={() => setSidebarTab('explorer')} className={`flex-1 flex justify-center items-center ${sidebarTab === 'explorer' ? 'text-white border-b-2 border-cyan-500 bg-white/5' : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'}`}>
                    <FolderOpen size={16} />
                  </button>
                  <button onClick={() => setSidebarTab('ai')} className={`flex-1 flex justify-center items-center ${sidebarTab === 'ai' ? 'text-white border-b-2 border-cyan-500 bg-white/5' : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'}`}>
                    <Wand2 size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {sidebarTab === 'explorer' && (
                    <div className="p-2">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 mb-2">Explorer</div>
                      <div 
                        className="flex items-center gap-1 text-sm font-medium text-slate-300 hover:text-white cursor-pointer px-1 py-1 rounded hover:bg-white/5 transition-colors"
                        onClick={() => setFolderOpen(!folderOpen)}
                      >
                        {folderOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                        {project?.name || "project"}
                      </div>
                      
                      <AnimatePresence>
                        {folderOpen && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: "auto", opacity: 1 }} 
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden flex flex-col pt-1"
                          >
                            {Object.keys(fileTree.children).sort((a,b) => {
                               const aIsFolder = fileTree.children[a].type === "folder";
                               const bIsFolder = fileTree.children[b].type === "folder";
                               if (aIsFolder && !bIsFolder) return -1;
                               if (!aIsFolder && bIsFolder) return 1;
                               return a.localeCompare(b);
                            }).map(key => (
                              <FileTree 
                                key={key} 
                                items={fileTree.children[key]} 
                                currentPath={key} 
                                openFile={openFile} 
                                activeFile={activeFile} 
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {sidebarTab === 'ai' && (
                    <div className="p-4 flex flex-col h-full gap-4">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">AI Assistant</div>
                      <div className="flex-1 bg-[#09090b] rounded-lg border border-white/5 p-3 flex flex-col">
                        <div className="flex-1 text-sm text-slate-400 flex flex-col justify-end">
                          <p className="mb-2">I am ready to help you modify this website. Describe the changes you want below.</p>
                        </div>
                        <div className="mt-4 flex flex-col gap-2">
                          <Textarea 
                            placeholder="Add a dark mode toggle to the navbar..." 
                            className="w-full bg-[#18181b] text-sm text-gray-200 border-white/10 focus-visible:ring-1 focus-visible:ring-cyan-500 resize-none min-h-[80px]"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            disabled={isChatting}
                          />
                          <Button size="sm" onClick={handleChat} disabled={!chatInput.trim() || isChatting} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium">
                            {isChatting ? "Generating Edit..." : "Generate Code"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-transparent hover:bg-cyan-500/50 transition-colors w-1" />
            </>
          )}

          {/* Main Editor & Preview Area */}
          <ResizablePanel defaultSize={80} className="flex flex-col bg-[#1e1e1e]">
            <ResizablePanelGroup direction="vertical">
              
              {/* Top: Editor + Preview */}
              <ResizablePanel defaultSize={75} className="flex">
                <ResizablePanelGroup direction="horizontal">
                  
                  {/* Editor View */}
                  <ResizablePanel defaultSize={50} className="flex flex-col bg-[#1e1e1e] border-r border-white/5 min-w-[200px]">
                    <div className="flex h-10 bg-[#18181b] border-b border-white/5 items-center overflow-x-auto hide-scrollbar">
                      {openFiles.map(f => {
                        const info = getFileInfo(f);
                        const Icon = info.icon;
                        return (
                          <div 
                            key={f} 
                            onClick={() => setActiveFile(f)}
                            className={`flex items-center gap-2 h-full px-4 text-sm border-r border-white/5 cursor-pointer min-w-[120px] max-w-[200px] group transition-colors ${activeFile === f ? 'bg-[#1e1e1e] text-white border-t-2 border-t-cyan-500' : 'bg-[#18181b] text-slate-400 hover:bg-[#27272a]'}`}
                          >
                            <Icon size={14} className={info.color} />
                            <span className="truncate flex-1" title={f}>{info.name}</span>
                            <div 
                              onClick={(e) => closeFile(e, f)}
                              className={`p-0.5 rounded-md hover:bg-white/10 ${activeFile === f ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            >
                              <X size={14} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="h-6 bg-[#1e1e1e] flex items-center px-4 text-xs text-slate-500 gap-2 border-b border-white/5 shrink-0">
                      <span>{project?.name || "project"}</span> <ChevronRight size={10} /> <span>{activeFile || ""}</span>
                    </div>
                    <div className="flex-1 relative">
                      {activeFile ? (
                        <Editor
                          height="100%"
                          language={getLanguage(activeFile)}
                          theme="vs-dark"
                          value={files[activeFile] || ""}
                          onChange={(val) => setFiles(f => ({ ...f, [activeFile]: val }))}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            wordWrap: "on",
                            padding: { top: 16 },
                            formatOnPaste: true,
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            smoothScrolling: true,
                            cursorBlinking: "smooth",
                            cursorSmoothCaretAnimation: "on"
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                          Select a file to edit
                        </div>
                      )}
                    </div>
                  </ResizablePanel>

                  <ResizableHandle withHandle className="bg-transparent hover:bg-cyan-500/50 transition-colors w-1" />

                  {/* Live Preview View */}
                  <ResizablePanel defaultSize={50} className="flex flex-col bg-[#09090b] min-w-[200px]">
                    <div className="flex-1 flex flex-col h-full">
                      <div className="h-10 bg-[#18181b] border-b border-white/5 flex items-center px-4 gap-3 shrink-0">
                        <Play size={14} className="text-green-400" />
                        <span className="text-sm font-medium text-slate-300">Live Preview</span>
                        <div className="flex-1" />
                        <div className="text-xs text-slate-500 font-mono bg-black/40 px-2 py-0.5 rounded border border-white/5 truncate max-w-[200px]">
                          localhost:3000
                        </div>
                      </div>
                      <div className="flex-1 p-4 flex items-center justify-center overflow-auto bg-[url('https://transparenttextures.com/patterns/cubes.png')] bg-fixed bg-center">
                        <div className={`h-full bg-white shadow-2xl overflow-hidden transition-all duration-300 ${viewMode === 'mobile' ? 'w-[375px] rounded-[2rem] border-[12px] border-[#1f2334] max-h-[812px]' : viewMode === 'tablet' ? 'w-[768px] rounded-[2rem] border-[12px] border-[#1f2334] max-h-[1024px]' : 'w-full rounded-lg'}`}>
                          <SandpackPreview 
                            showOpenInCodeSandbox={false}
                            showRefreshButton={true}
                            style={{ height: '100%', minHeight: '100%' }}
                          />
                        </div>
                      </div>
                    </div>
                  </ResizablePanel>
                  
                </ResizablePanelGroup>
              </ResizablePanel>

              {/* Bottom Panel */}
              {isBottomPanelOpen && (
                <>
                  <ResizableHandle className="bg-white/5 hover:bg-cyan-500/50 transition-colors h-1" />
                  <ResizablePanel defaultSize={25} minSize={10} className="bg-[#18181b] flex flex-col border-t border-white/5">
                    <div className="flex h-9 border-b border-white/5 items-center px-2">
                      <button onClick={() => setBottomPanelTab('console')} className={`px-3 h-full text-xs font-medium uppercase tracking-wider flex items-center border-b-2 ${bottomPanelTab === 'console' ? 'text-white border-cyan-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        Console
                      </button>
                      <button onClick={() => setBottomPanelTab('terminal')} className={`px-3 h-full text-xs font-medium uppercase tracking-wider flex items-center border-b-2 ${bottomPanelTab === 'terminal' ? 'text-white border-cyan-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        Terminal
                      </button>
                      <div className="flex-1" />
                      <button onClick={() => setIsBottomPanelOpen(false)} className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/5">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex-1 p-2 font-mono text-xs overflow-y-auto">
                      {bottomPanelTab === 'console' && (
                        <div className="flex flex-col gap-1 h-full overflow-hidden">
                          <SandpackConsole style={{ height: '100%', width: '100%', minHeight: '100%' }} />
                        </div>
                      )}
                      {bottomPanelTab === 'terminal' && (
                        <div className="text-slate-400 p-2">
                          <div className="text-green-400 mb-1">$ npm start</div>
                          <div>Starting development server...</div>
                          <div className="text-cyan-400 mt-2">Compiled successfully!</div>
                          <div className="mt-2">You can now view project in the browser.</div>
                          <div className="mt-2 flex items-center gap-2"><span className="w-2 h-4 bg-slate-400 animate-pulse inline-block" /></div>
                        </div>
                      )}
                    </div>
                  </ResizablePanel>
                </>
              )}
              
            </ResizablePanelGroup>
          </ResizablePanel>

        </ResizablePanelGroup>
        </SandpackProvider>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] shrink-0 font-medium z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1.5 py-0.5 rounded transition-colors"><CheckCircle2 size={12} /> Ready</div>
          <div className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1.5 py-0.5 rounded transition-colors"><X size={12} className="text-red-300" /> 0 Errors</div>
          <div className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1.5 py-0.5 rounded transition-colors text-slate-100">AI Assistant: Active</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="cursor-pointer hover:bg-white/20 px-1.5 py-0.5 rounded transition-colors">Ln 1, Col 1</div>
          <div className="cursor-pointer hover:bg-white/20 px-1.5 py-0.5 rounded transition-colors">UTF-8</div>
          <div className="cursor-pointer hover:bg-white/20 px-1.5 py-0.5 rounded transition-colors">{activeFile ? getFileInfo(activeFile).lang : ""}</div>
          <div className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1.5 py-0.5 rounded transition-colors" onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}>
            <Terminal size={12} /> Console
          </div>
        </div>
      </div>
    </div>
  );
}
