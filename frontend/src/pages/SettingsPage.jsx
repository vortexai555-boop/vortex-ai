import React from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import api from "@/lib/api";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-4xl mx-auto p-6 lg:p-10">
        <div className="text-mono-accent mb-2">Preferences</div>
        <h1 className="text-4xl font-light tracking-tight">Settings</h1>

        <div className="mt-8 space-y-6">
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
