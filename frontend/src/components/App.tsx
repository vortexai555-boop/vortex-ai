import React, { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Preview } from "./components/Preview";
import { GeneratedFiles, ViewMode, Status } from "./types";
import { downloadWebsiteAsZip } from "./utils/download";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorStr, setErrorStr] = useState("");
  const [files, setFiles] = useState<GeneratedFiles | null>(null);
  const [activeFile, setActiveFile] = useState<"index.html" | "styles.css" | "script.js" | "preview">("preview");
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStatus("generating");
    setErrorStr("");
    setFiles(null);
    setActiveFile("preview");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.files || !data.files["index.html"]) {
        throw new Error("Invalid response format from AI.");
      }

      setFiles(data.files);
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setErrorStr(err.message || "An unknown error occurred.");
      setStatus("error");
    }
  };

  const handleStop = () => {
    // Currently generation stop is just UX (disconnecting stream/await)
    // Could implement AbortController here if needed.
    setStatus("error");
    setErrorStr("Generation stopped by user.");
  };

  const hasCode = files !== null;

  const handleCopy = () => {
    if (files && files["index.html"]) {
      const fullHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${files["styles.css"]}</style>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    ${files["index.html"]}
    <script>
      ${files["script.js"]}
    </script>
  </body>
</html>`;
      navigator.clipboard.writeText(fullHtml);
      // Could show a toast here
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0d0e12] overflow-hidden font-sans text-gray-200">
      {!isFullScreen && (
        <Sidebar
          prompt={prompt}
          setPrompt={setPrompt}
          status={status}
          errorStr={errorStr}
          onGenerate={handleGenerate}
          onStop={handleStop}
          activeFile={activeFile}
          setActiveFile={setActiveFile}
          hasCode={hasCode}
        />
      )}
      
      <div className="flex-1 flex flex-col min-w-0">
        {!isFullScreen && (
          <TopBar
            viewMode={viewMode}
            setViewMode={setViewMode}
            onDownload={() => files && downloadWebsiteAsZip(files)}
            onCopy={handleCopy}
            onFullScreen={() => setIsFullScreen(true)}
            hasCode={hasCode}
          />
        )}
        
        {isFullScreen && (
          <button
            onClick={() => setIsFullScreen(false)}
            className="absolute top-4 right-4 z-50 px-4 py-2 bg-gray-900 text-white rounded-lg shadow-lg hover:bg-gray-800 border border-gray-700"
          >
            Exit Full Screen
          </button>
        )}

        <div className="flex-1 relative overflow-hidden bg-[#07080d]">
          {activeFile === "preview" ? (
            <Preview files={files} viewMode={viewMode} isFullScreen={isFullScreen} />
          ) : (
            files && (
              <textarea
                className="w-full h-full bg-[#1e1e1e] text-white p-4 font-mono text-sm"
                value={files[activeFile]}
                onChange={(e) => {
                  const value = e.target.value;
                  setFiles(prev => prev ? { ...prev, [activeFile]: value } : prev);
                }}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
