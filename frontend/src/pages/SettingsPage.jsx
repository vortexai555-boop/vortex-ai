import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [providers, setProviders] = useState({});
  const [defaultProvider, setDefaultProvider] = useState("google");
  const [keysInput, setKeysInput] = useState({});
  const [isSaving, setIsSaving] = useState({});
  const [isTesting, setIsTesting] = useState({});

  const providerList = [
    { id: "google", name: "Google Gemini" },
    { id: "openai", name: "OpenAI" },
    { id: "anthropic", name: "Anthropic" },
    { id: "groq", name: "Groq" },
    { id: "openrouter", name: "OpenRouter" },
    { id: "deepseek", name: "DeepSeek" },
    { id: "together", name: "Together AI" },
    { id: "mistral", name: "Mistral" },
    { id: "fal", name: "Fal" },
    { id: "replicate", name: "Replicate" },
    { id: "stability", name: "Stability AI" },
  ];

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const res = await api.get("/settings/apikeys");
      setProviders(res.data.providers || {});
      setDefaultProvider(res.data.default_provider || "google");
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/");
  };

  const handleSetDefaultProvider = async (provider) => {
    try {
      await api.post("/settings/default_provider", { provider });
      setDefaultProvider(provider);
      toast.success(`Default provider set to ${provider}`);
    } catch (e) {
      toast.error("Failed to set default provider");
    }
  };

  const handleSaveKey = async (provider) => {
    const key = keysInput[provider];
    if (!key?.trim()) return;
    setIsSaving(p => ({ ...p, [provider]: true }));
    try {
      await api.post("/settings/apikeys", { provider, api_key: key });
      toast.success(`${provider} API key saved securely.`);
      setKeysInput(p => ({ ...p, [provider]: "" }));
      loadApiKeys();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save API key");
    } finally {
      setIsSaving(p => ({ ...p, [provider]: false }));
    }
  };

  const handleDeleteKey = async (provider) => {
    if (!window.confirm(`Are you sure you want to remove your ${provider} key?`)) return;
    try {
      await api.delete(`/settings/apikeys/${provider}`);
      toast.success(`${provider} API key removed.`);
      loadApiKeys();
    } catch (e) {
      toast.error("Failed to remove key");
    }
  };

  const handleTestKey = async (provider) => {
     const key = keysInput[provider];
     if (!key?.trim() && !providers[provider]?.has_key) return;
     setIsTesting(p => ({ ...p, [provider]: true }));
     try {
       if (!key?.trim()) {
           toast.error("Please enter a key to test first.");
           setIsTesting(p => ({ ...p, [provider]: false }));
           return;
       }
       await api.post("/settings/apikeys/test", { provider, api_key: key });
       toast.success("API key is valid!");
     } catch (e) {
       toast.error(e.response?.data?.detail || "Invalid API key");
     } finally {
       setIsTesting(p => ({ ...p, [provider]: false }));
     }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto p-6 lg:p-10">
        <div className="text-mono-accent mb-2">Preferences</div>
        <h1 className="text-4xl font-light tracking-tight">Settings</h1>

        <div className="mt-8 space-y-4">
          <Row title="Default AI Provider" desc="Select the primary AI provider used by the platform.">
            <select 
              value={defaultProvider} 
              onChange={(e) => handleSetDefaultProvider(e.target.value)}
              className="bg-[#0f1115] border border-white/10 text-white text-sm rounded-md focus:ring-cyan-500 focus:border-cyan-500 block w-[200px] p-2.5"
            >
              {providerList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Row>

          <Row title="Bring Your Own Key (BYOK)" desc="Use your own API keys to bypass rate limits and utilize personal quotas. Keys are encrypted at rest.">
            <div className="flex flex-col gap-6 w-full max-w-md">
              {providerList.map(p => (
                <div key={p.id} className="flex flex-col gap-1 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-300">{p.name} API Key</label>
                    {providers[p.id]?.has_key && (
                      <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Active</span>
                    )}
                  </div>
                  <Input 
                    type="password"
                    placeholder={providers[p.id]?.has_key ? "••••••••••••••••••••••••" : "Enter API Key..."}
                    value={keysInput[p.id] || ""}
                    onChange={(e) => setKeysInput(prev => ({ ...prev, [p.id]: e.target.value }))}
                    className="bg-[#0f1115] border-white/10"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 bg-white/5 border-white/10 hover:bg-white/10"
                      onClick={() => handleTestKey(p.id)}
                      disabled={isTesting[p.id] || !keysInput[p.id]}
                    >
                      {isTesting[p.id] ? "Testing..." : "Test"}
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                      onClick={() => handleSaveKey(p.id)}
                      disabled={isSaving[p.id] || !keysInput[p.id]}
                    >
                      {isSaving[p.id] ? "Saving..." : "Save"}
                    </Button>
                    {providers[p.id]?.has_key && (
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDeleteKey(p.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Row>

          <Row title="Appearance" desc="Grexo uses a futuristic dark theme by default. Light mode coming soon.">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Dark</span>
              <Switch checked disabled data-testid="setting-theme-toggle" />
            </div>
          </Row>

          <Row title="Notifications" desc="In-product toast notifications for important events.">
            <Switch defaultChecked data-testid="setting-notifications-toggle" />
          </Row>

          <Row title="Account" desc={`Signed in as ${user?.email}.`}>
            <Button onClick={handleLogout} variant="outline" className="btn-ghost-Grexo" data-testid="setting-logout">Sign out</Button>
          </Row>

          <Row title="Feedback" desc="Help us shape Grexo. Send feedback to the team.">
            <a href="mailto:hello@Grexo.ai" className="text-Grexo-cyan hover:underline text-sm" data-testid="setting-feedback-link">
              hello@Grexo.ai
            </a>
          </Row>
        </div>
      </div>
    </div>
  );
}

function Row({ title, desc, children }) {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
      <div className="flex-1">
        <div className="text-base font-medium">{title}</div>
        <div className="text-sm text-slate-400 mt-1">{desc}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}
