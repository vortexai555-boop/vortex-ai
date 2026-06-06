import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import VortexLogo from "@/components/VortexLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const submitEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post("/auth/forgot", { email });
      if (r.data.reset_token) {
        setResetToken(r.data.reset_token);
        toast.success("Reset token generated. Enter a new password.");
        setStep(2);
      } else {
        toast.success("If that email exists we sent you a reset link.");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset", { token: resetToken, password: newPassword });
      toast.success("Password updated. Please sign in.");
      window.location.href = "/login";
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-vortex-bg p-6 relative overflow-hidden">
      <div className="aurora" />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8"><Link to="/"><VortexLogo size={44} /></Link></div>
        <div className="glass-strong rounded-2xl p-8">
          <h1 className="text-2xl font-medium tracking-tight">Reset password</h1>
          {step === 1 ? (
            <form onSubmit={submitEmail} className="mt-6 space-y-4">
              <div>
                <Label className="text-slate-300 text-xs uppercase tracking-widest">Email</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 h-12 bg-vortex-elevated border-white/10" data-testid="forgot-email" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 btn-primary-vortex" data-testid="forgot-submit">
                {loading ? "Working..." : "Continue"}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitReset} className="mt-6 space-y-4">
              <div>
                <Label className="text-slate-300 text-xs uppercase tracking-widest">Reset Token</Label>
                <Input required value={resetToken} onChange={(e) => setResetToken(e.target.value)} className="mt-2 h-12 bg-vortex-elevated border-white/10 font-mono text-xs" data-testid="forgot-token" />
              </div>
              <div>
                <Label className="text-slate-300 text-xs uppercase tracking-widest">New Password</Label>
                <Input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-2 h-12 bg-vortex-elevated border-white/10" data-testid="forgot-new-password" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 btn-primary-vortex" data-testid="forgot-reset-submit">
                {loading ? "Saving..." : "Update password"}
              </Button>
            </form>
          )}
          <p className="mt-6 text-sm text-slate-400 text-center">
            <Link to="/login" className="text-vortex-cyan hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
