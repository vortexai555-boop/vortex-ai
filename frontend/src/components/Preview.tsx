import React, { useMemo } from "react";
import { GeneratedFiles, ViewMode } from "../types";
import { LayoutTemplate } from "lucide-react";

interface PreviewProps {
  files: GeneratedFiles | null;
  viewMode: ViewMode;
  isFullScreen?: boolean;
}

export function Preview({ files, viewMode, isFullScreen }: PreviewProps) {
  const srcDoc = useMemo(() => {
    if (!files) return "";
    
    return `
      <!DOCTYPE html>
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
            (function() {
              try {
                ${files["script.js"]}
              } catch (e) {
                console.error("Generated script error:", e);
              }
            })();
          </script>
        </body>
      </html>
    `;
  }, [files]);

  if (!files) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500 bg-[#07080d]">
        <div className="text-center">
          <LayoutTemplate size={48} className="mx-auto mb-4 opacity-20" />
          <p>Describe your website to see the preview.</p>
        </div>
      </div>
    );
  }

  const widthClass = 
    isFullScreen ? "w-full" : 
    viewMode === "mobile" ? "w-[375px]" :
    viewMode === "tablet" ? "w-[768px]" : "w-full";

  return (
    <div className={`w-full h-full bg-[#07080d] flex items-center justify-center p-4 transition-all overflow-hidden ${isFullScreen ? 'p-0' : ''}`}>
      <div className={`h-full bg-white shadow-2xl flex flex-col transition-all duration-300 ${widthClass} ${viewMode !== 'desktop' && !isFullScreen ? 'rounded-3xl border-[12px] border-gray-800' : ''}`}>
        <iframe
          title="live-preview"
          srcDoc={srcDoc}
          className="w-full h-full border-0 rounded-xl bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        />
      </div>
    </div>
  );
}
