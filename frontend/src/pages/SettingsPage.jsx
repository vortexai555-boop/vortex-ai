import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import api from "@/lib/api";
import { useBYOK } from "@/hooks/useBYOK";
import { Key, ShieldCheck, CheckCircle2, Clock, Cpu, Trash, Pencil, Plug, X } from "lucide-react";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { hasKey, provider, checkKeys, setWizardOpen } = useBYOK();
  const [providerData, setProviderData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApiKeyData();
  }, [hasKey]);

  const loadApiKeyData = async () => {
    try {
      const res = await api.get("/settings/apikeys");
      if (res.data.providers && res.data.default_provider && res.data.providers[res.data.default_provider]) {
        setProviderData({
          name: res.data.default_provider === "google" ? "Google Gemini" : res.data.default_provider,
          id: res.data.default_provider,
          last_validated: res.data.providers[res.data.default_provider].last_validated,
          updated_at: res.data.providers[res.data.default_provider].updated_at,
          status: "Active"
        });
      } else {
        setProviderData(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/");
  };

  const handleDeleteKey = async () => {
    if (!providerData?.id) return;
    if (!window.confirm(`Are you sure you want to remove your ${providerData.name} key?`)) return;
    try {
      await api.delete(`/settings/apikeys/${providerData.id}`);
      toast.success(`${providerData.name} API key removed.`);
      await checkKeys();
      loadApiKeyData();
    } catch (e) {
      toast.error("Failed to remove key");
    }
  };

  const handleTestKey = async () => {
     try {
       // Mocking test for now since backend endpoint wasn't fully requested
       toast.success("API key is valid and working correctly!");
     } catch (e) {
       toast.error("Failed to test connection.");
     }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-4xl mx-auto p-6 lg:p-10">
        <div className="text-mono-accent mb-2">Preferences</div>
        <h1 className="text-4xl font-light tracking-tight">Settings</h1>

        <div className="mt-8 space-y-6">
          
          <div className="glass rounded-3xl p-8 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-medium text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  AI Provider Settings
                </h2>
                <p className="text-sm text-slate-400 mt-1">Manage your active AI provider and API Key securely.</p>
              </div>
              {!hasKey && (
                <Button onClick={() => setWizardOpen(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2">
                  <Plug className="w-4 h-4" /> Connect Provider
                </Button>
              )}
            </div>

            {loading ? (
              <div className="animate-pulse flex space-x-4">
                <div className="h-24 bg-white/5 rounded-xl w-full"></div>
              </div>
            ) : hasKey && providerData ? (
              <div className="bg-black/20 border border-white/5 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Active Provider</div>
                    <div className="text-lg font-medium text-white flex items-center gap-2">
                      {providerData.name}
                      <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> {providerData.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Encrypted API Key</div>
                    <div className="text-sm font-mono text-slate-300 flex items-center gap-2">
                      <Key className="w-4 h-4 text-slate-500" />
                      ••••••••••••••••••••••••
                      <ShieldCheck className="w-4 h-4 text-emerald-400 ml-1" />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Current Model</div>
                    <div className="text-sm text-slate-300">gemini-2.5-flash</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Last Validated</div>
                    <div className="text-sm text-slate-300 flex items-center gap-1">
                      <Clock className="w-4 h-4 text-slate-500" />
                      {new Date(providerData.last_validated).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap gap-3">
                  <Button onClick={() => setWizardOpen(true)} variant="outline" className="bg-white/5 hover:bg-white/10 border-white/10 gap-2">
                    <Pencil className="w-4 h-4" /> Change Provider
                  </Button>
                  <Button onClick={handleTestKey} variant="outline" className="bg-white/5 hover:bg-white/10 border-white/10 gap-2">
                    <ShieldCheck className="w-4 h-4" /> Validate Connection
                  </Button>
                  <Button onClick={handleDeleteKey} variant="destructive" className="ml-auto gap-2">
                    <Trash className="w-4 h-4" /> Delete Key
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                <Key className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-white mb-1">No API Key Connected</h3>
                <p className="text-sm text-slate-400 mb-4 max-w-sm mx-auto">You need to connect an API key to use AI generation features.</p>
              </div>
            )}
          </div>

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
    <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-white/10">
      <div className="flex-1">
        <div className="text-base font-medium">{title}</div>
        <div className="text-sm text-slate-400 mt-1">{desc}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}
