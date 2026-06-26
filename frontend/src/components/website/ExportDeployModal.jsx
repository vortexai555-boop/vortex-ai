import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Github, Cloud, Box, Server, CircleDashed } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function ExportDeployModal({ project, files }) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const generateProjectFiles = (target) => {
    const finalFiles = { ...files };
    const isNode = finalFiles["package.json"];
    const projectName = project?.name || "my-app";

    // 1. Generate README
    if (!finalFiles["README.md"]) {
      finalFiles["README.md"] = `# ${projectName}\n\nGenerated with Grexo AI.\n\n## Getting Started\n\n`;
      if (isNode) finalFiles["README.md"] += "Run `npm install` and `npm start` (or `npm run dev`).";
      else finalFiles["README.md"] += "Open `index.html` in your browser.";
    }

    // 2. Generate package.json if missing but looks like it needs one
    if (!isNode && (finalFiles["server.js"] || finalFiles["App.jsx"])) {
      finalFiles["package.json"] = JSON.stringify({
        name: projectName.toLowerCase().replace(/\s+/g, '-'),
        version: "1.0.0",
        scripts: { start: finalFiles["server.js"] ? "node server.js" : "react-scripts start" },
        dependencies: finalFiles["server.js"] ? { express: "^4.18.2" } : { react: "^18.2.0", "react-dom": "^18.2.0", "react-scripts": "5.0.1" }
      }, null, 2);
    }

    // 3. Add deployment configurations based on target
    if (target === "vercel") {
      finalFiles["vercel.json"] = JSON.stringify({ version: 2, builds: [{ src: "package.json", use: "@vercel/static-build" }] }, null, 2);
    } else if (target === "netlify") {
      finalFiles["netlify.toml"] = `[build]\n  command = "npm run build"\n  publish = "build"\n`;
    } else if (target === "railway" || target === "render") {
      finalFiles["railway.json"] = JSON.stringify({ build: { builder: "NIXPACKS" } }, null, 2);
      finalFiles["render.yaml"] = `services:\n  - type: web\n    name: ${projectName}\n    env: node\n    buildCommand: npm install && npm run build\n    startCommand: npm start\n`;
    } else if (target === "firebase") {
      finalFiles["firebase.json"] = JSON.stringify({ hosting: { public: "public", ignore: ["firebase.json", "**/.*", "**/node_modules/**"] } }, null, 2);
    } else if (target === "docker") {
      finalFiles["Dockerfile"] = isNode 
        ? `FROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD ["npm", "start"]`
        : `FROM nginx:alpine\nCOPY . /usr/share/nginx/html\nEXPOSE 80\nCMD ["nginx", "-g", "daemon off;"]`;
      finalFiles["docker-compose.yml"] = `version: '3'\nservices:\n  web:\n    build: .\n    ports:\n      - "3000:${isNode ? '3000' : '80'}"\n`;
    } else if (target === "github") {
      finalFiles[".github/workflows/deploy.yml"] = `name: Deploy\non:\n  push:\n    branches: [ main ]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - run: echo "Deploy logic goes here"\n`;
    }

    return finalFiles;
  };

  const validateProject = (finalFiles) => {
    // A simple validation step
    const missingIndexHtml = !finalFiles["index.html"] && !finalFiles["public/index.html"] && !finalFiles["src/index.html"] && !finalFiles["package.json"];
    if (missingIndexHtml) {
      toast.warning("Warning: No index.html or package.json found. The project might not be fully deployable.");
    }
  };

  const handleExport = async (target) => {
    setExporting(target);
    try {
      const finalFiles = generateProjectFiles(target);
      validateProject(finalFiles);

      // Simulate a small delay for validation & generation processing
      await new Promise(resolve => setTimeout(resolve, 600));

      const zip = new JSZip();
      for (const [path, content] of Object.entries(finalFiles)) {
        zip.file(path, content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `${project?.name?.replace(/\s+/g, '-') || 'project'}-${target}.zip`);
      toast.success(`Successfully exported for ${target}!`);
    } catch (e) {
      toast.error("Export failed: " + e.message);
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white h-8 hover:bg-white/10 bg-white/5 px-3 rounded-md" title="Export & Deploy">
          <Download size={14} className="mr-2" /> <span className="text-xs font-medium">Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0f1115] border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export & Deployment</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="hosting" className="w-full mt-4">
          <TabsList className="bg-black/50 border border-white/5 w-full justify-start rounded-md h-12 p-1">
            <TabsTrigger value="hosting" className="data-[state=active]:bg-white/10">Cloud Hosting</TabsTrigger>
            <TabsTrigger value="containers" className="data-[state=active]:bg-white/10">Containers</TabsTrigger>
            <TabsTrigger value="source" className="data-[state=active]:bg-white/10">Source Code</TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="hosting" className="grid grid-cols-2 sm:grid-cols-3 gap-4 m-0">
              <ExportCard icon={<Cloud />} title="Vercel" desc="Auto-generates vercel.json" onClick={() => handleExport("vercel")} loading={exporting === "vercel"} />
              <ExportCard icon={<Cloud />} title="Netlify" desc="Includes netlify.toml" onClick={() => handleExport("netlify")} loading={exporting === "netlify"} />
              <ExportCard icon={<Server />} title="Railway" desc="Nixpacks builder ready" onClick={() => handleExport("railway")} loading={exporting === "railway"} />
              <ExportCard icon={<Server />} title="Render" desc="Includes render.yaml" onClick={() => handleExport("render")} loading={exporting === "render"} />
              <ExportCard icon={<Cloud />} title="Firebase" desc="Firebase Hosting ready" onClick={() => handleExport("firebase")} loading={exporting === "firebase"} />
            </TabsContent>
            
            <TabsContent value="containers" className="grid grid-cols-2 gap-4 m-0">
              <ExportCard icon={<Box />} title="Docker" desc="Generates optimized Dockerfile" onClick={() => handleExport("docker")} loading={exporting === "docker"} />
              <ExportCard icon={<Box />} title="Docker Compose" desc="Full docker-compose stack" onClick={() => handleExport("docker")} loading={exporting === "docker"} />
            </TabsContent>

            <TabsContent value="source" className="grid grid-cols-2 gap-4 m-0">
              <ExportCard icon={<Download />} title="Standard ZIP" desc="Download raw source code" onClick={() => handleExport("zip")} loading={exporting === "zip"} />
              <ExportCard icon={<Github />} title="GitHub Repo" desc="Ready with GitHub Actions" onClick={() => handleExport("github")} loading={exporting === "github"} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ExportCard({ icon, title, desc, onClick, loading }) {
  return (
    <button 
      onClick={onClick}
      disabled={loading}
      className="flex flex-col items-start p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-left transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
    >
      <div className="p-2 bg-white/5 rounded-lg text-cyan-400 mb-3">
        {loading ? <CircleDashed className="animate-spin w-5 h-5" /> : React.cloneElement(icon, { size: 20 })}
      </div>
      <h3 className="font-medium text-sm text-slate-200">{title}</h3>
      <p className="text-xs text-slate-400 mt-1">{desc}</p>
    </button>
  );
}
