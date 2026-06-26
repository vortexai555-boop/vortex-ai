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
  const [providers, setProviders] = useState({ google: { has_key: false } });
  const [geminiKey, setGeminiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const res = await api.get("/settings/apikeys");
      setProviders(res.data.providers || { google: { has_key: false } });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/");
  };

  const handleSaveKey = async (provider, key) => {
    if (!key.trim()) return;
    setIsSaving(true);
    try {
      await api.post("/settings/apikeys", { provider, api_key: key });
      toast.success(`${provider} API key saved securely.`);
      setGeminiKey("");
      loadApiKeys();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save API key");
    } finally {
      setIsSaving(false);
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

  const handleTestKey = async (provider, key) => {
     if (!key.trim() && !providers[provider]?.has_key) return;
     setIsTesting(true);
     try {
       // if we have a key in input, test that. if not, backend can't test unless we send it.
       // actually, our test endpoint requires the key to be sent.
       // if they already saved it, we can't test without them re-entering or modifying the test endpoint.
       // Let's just test the input key.
       if (!key.trim()) {
           toast.error("Please enter a key to test first.");
           setIsTesting(false);
           return;
       }
       await api.post("/settings/apikeys/test", { provider, api_key: key });
       toast.success("API key is valid!");
     } catch (e) {
       toast.error(e.response?.data?.detail || "Invalid API key");
     } finally {
       setIsTesting(false);
     }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto p-6 lg:p-10">
        <div className="text-mono-accent mb-2">Preferences</div>
        <h1 className="text-4xl font-light tracking-tight">Settings</h1>

        <div className="mt-8 space-y-4">
          <Row title="Bring Your Own Key (BYOK)" desc="Use your own API keys to bypass rate limits and utilize personal quotas. Keys are encrypted at rest.">
            <div className="flex flex-col gap-3 min-w-[300px]">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-300">Google Gemini API Key</label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="password"
                    placeholder={providers.google?.has_key ? "••••••••••••••••••••••••" : "AIzaSy..."}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="bg-[#0f1115] border-white/10"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 bg-white/5 border-white/10 hover:bg-white/10"
                    onClick={() => handleTestKey("google", geminiKey)}
                    disabled={isTesting || !geminiKey}
                  >
                    {isTesting ? "Testing..." : "Test Key"}
                  </Button>
                  <Button 
                    size="sm"
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                    onClick={() => handleSaveKey("google", geminiKey)}
                    disabled={isSaving || !geminiKey}
                  >
                    {isSaving ? "Saving..." : "Save Key"}
                  </Button>
                  {providers.google?.has_key && (
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleDeleteKey("google")}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
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
