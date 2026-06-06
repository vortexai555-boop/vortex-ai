import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import VortexLogo from "@/components/VortexLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signup(form.email, form.password, form.name);
      toast.success("Welcome to Vortex");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const googleSignup = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-vortex-bg p-6 relative overflow-hidden">
      <div className="aurora" />
      <div className="vortex-grid-bg absolute inset-0 opacity-30" />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8"><Link to="/"><VortexLogo size={44} /></Link></div>
        <div className="glass-strong rounded-2xl p-8">
          <h1 className="text-2xl font-medium tracking-tight">Create your account</h1>
          <p className="text-slate-400 text-sm mt-1">Start building with Vortex AI. 100 free credits inside.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label className="text-slate-300 text-xs uppercase tracking-widest">Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 h-12 bg-vortex-elevated border-white/10 focus:border-vortex-cyan" data-testid="signup-name" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs uppercase tracking-widest">Email</Label>
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 h-12 bg-vortex-elevated border-white/10 focus:border-vortex-cyan" data-testid="signup-email" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs uppercase tracking-widest">Password</Label>
              <Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-2 h-12 bg-vortex-elevated border-white/10 focus:border-vortex-cyan" data-testid="signup-password" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 btn-primary-vortex" data-testid="signup-submit">
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
            <div className="h-px flex-1 bg-white/10" /> OR <div className="h-px flex-1 bg-white/10" />
          </div>
          <Button onClick={googleSignup} variant="outline" className="w-full h-12 btn-ghost-vortex" data-testid="signup-google">
            <span className="mr-2">G</span> Continue with Google
          </Button>
          <p className="mt-6 text-sm text-slate-400 text-center">
            Already have an account? <Link to="/login" className="text-vortex-cyan hover:underline" data-testid="signup-go-login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
