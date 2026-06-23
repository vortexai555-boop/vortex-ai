import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import WebsiteDashboard from "../components/website/WebsiteDashboard";
import WebsiteEditor from "../components/website/WebsiteEditor";

export default function WebsitePage() {
  const [viewState, setViewState] = useState("dashboard"); // 'dashboard' or 'editor'
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get("/website");
      setProjects(res.data);
    } catch (err) {
      toast.error("Failed to load projects");
    }
  };

  const generate = async (description) => {
    setIsGenerating(true);
    try {
      const start = await api.post("/website/generate", { description, site_type: "landing", files: [] });
      const jobId = start.data.job_id;
      
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
      
      if (!done || !done.site_id) throw new Error("Generation failed");
      
      await fetchProjects();
      const proj = await api.get(`/website/${done.site_id}`);
      setCurrentProject(proj.data);
      setViewState("editor");
      toast.success("Your website is ready!");
    } catch (err) {
      toast.error(err?.response?.data?.detail || err.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenProject = async (id) => {
    try {
      const proj = await api.get(`/website/${id}`);
      setCurrentProject(proj.data);
      setViewState("editor");
    } catch (err) {
      toast.error("Failed to open project");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this website?")) return;
    try {
      await api.delete(`/website/${id}`);
      setProjects(p => p.filter(x => x.id !== id));
      toast.success("Project deleted");
    } catch (err) {
      toast.error("Failed to delete project");
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await api.post(`/website/${id}/duplicate`);
      await fetchProjects();
      toast.success("Project duplicated");
    } catch (err) {
      toast.error("Failed to duplicate project");
    }
  };

  const handleUpdateFiles = async (id, files) => {
    try {
      await api.put(`/website/${id}`, { files });
      setCurrentProject(p => p ? { ...p, files } : null);
    } catch (err) {
      // Background save error
      console.error("Auto-save failed", err);
    }
  };

  const handleChat = async (id, prompt) => {
    try {
      const start = await api.post(`/website/${id}/chat`, { prompt });
      const jobId = start.data.job_id;
      
      const deadline = Date.now() + 5 * 60 * 1000;
      let done = null;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const j = await api.get(`/website/jobs/${jobId}`);
        if (j.data.status === "done") { done = j.data; break; }
        if (j.data.status === "error") {
          throw new Error(j.data.error || "Edit failed");
        }
      }
      
      if (!done || !done.files) throw new Error("Edit failed");
      
      setCurrentProject(p => p ? { ...p, files: done.files } : null);
      toast.success("Website updated!");
    } catch (err) {
      toast.error(err?.response?.data?.detail || err.message || "AI Edit failed");
    }
  };

  if (viewState === "dashboard") {
    return (
      <WebsiteDashboard 
        projects={projects}
        onOpenProject={handleOpenProject}
        onGenerate={generate}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        isGenerating={isGenerating}
      />
    );
  }

  return (
    <WebsiteEditor 
      project={currentProject}
      onBack={() => { setViewState("dashboard"); fetchProjects(); }}
      onUpdateFiles={handleUpdateFiles}
      onChat={handleChat}
    />
  );
}
