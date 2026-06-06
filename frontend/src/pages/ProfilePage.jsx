import React from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  const copyId = () => {
    navigator.clipboard.writeText(user.user_id);
    toast.success("User ID copied");
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto p-6 lg:p-10">
        <div className="text-mono-accent mb-2">Account</div>
        <h1 className="text-4xl font-light tracking-tight">Profile</h1>

        <div className="mt-8 glass rounded-2xl p-8">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-vortex-cyan/30 to-vortex-purple/30 flex items-center justify-center text-2xl font-light overflow-hidden">
              {user.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover" /> : (user.name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-2xl font-medium" data-testid="profile-name">{user.name}</div>
              <div className="text-slate-400" data-testid="profile-email">{user.email}</div>
            </div>
          </div>

          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <Field label="User ID">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-300 truncate" data-testid="profile-user-id">{user.user_id}</span>
                <Button variant="ghost" size="sm" onClick={copyId} data-testid="profile-copy-id">Copy</Button>
              </div>
            </Field>
            <Field label="Account created">
              <span className="text-slate-300 text-sm">
                {user.created_at ? new Date(user.created_at).toLocaleString() : "—"}
              </span>
            </Field>
            <Field label="Plan">
              <span className="text-slate-300 capitalize" data-testid="profile-plan">{user.plan || "free"}</span>
            </Field>
            <Field label="Credits">
              <span className="text-slate-300" data-testid="profile-credits">{user.credits ?? 0}</span>
            </Field>
            <Field label="Auth provider">
              <span className="text-slate-300 capitalize">{user.provider || "jwt"}</span>
            </Field>
            <Field label="Role">
              <span className="text-slate-300 capitalize">{user.role || "user"}</span>
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="bg-vortex-elevated border border-white/5 rounded-xl p-4">
      <div className="text-mono-accent mb-2">{label}</div>
      {children}
    </div>
  );
}
