import React from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

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
      <div className="max-w-3xl mx-auto p-6 lg:p-10">
        <div className="text-mono-accent mb-2">Preferences</div>
        <h1 className="text-4xl font-light tracking-tight">Settings</h1>

        <div className="mt-8 space-y-4">
          <Row title="Appearance" desc="Vortex uses a futuristic dark theme by default. Light mode coming soon.">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Dark</span>
              <Switch checked disabled data-testid="setting-theme-toggle" />
            </div>
          </Row>

          <Row title="Notifications" desc="In-product toast notifications for important events.">
            <Switch defaultChecked data-testid="setting-notifications-toggle" />
          </Row>

          <Row title="Account" desc={`Signed in as ${user?.email}.`}>
            <Button onClick={handleLogout} variant="outline" className="btn-ghost-vortex" data-testid="setting-logout">Sign out</Button>
          </Row>

          <Row title="Feedback" desc="Help us shape Vortex. Send feedback to the team.">
            <a href="mailto:hello@vortex.ai" className="text-vortex-cyan hover:underline text-sm" data-testid="setting-feedback-link">
              hello@vortex.ai
            </a>
          </Row>
        </div>
      </div>
    </div>
  );
}

function Row({ title, desc, children }) {
  return (
    <div className="glass rounded-2xl p-6 flex items-start justify-between gap-6">
      <div>
        <div className="text-base font-medium">{title}</div>
        <div className="text-sm text-slate-400 mt-1">{desc}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}
