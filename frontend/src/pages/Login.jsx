import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import VortexLogo from "@/components/VortexLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back to Vortex");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = () => {
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
          <h1 className="text-2xl font-medium tracking-tight">Welcome back</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your Vortex workspace</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-slate-300 text-xs uppercase tracking-widest">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 h-12 bg-vortex-elevated border-white/10 focus:border-vortex-cyan" data-testid="login-email" />
            </div>
            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-slate-300 text-xs uppercase tracking-widest">Password</Label>
                <Link to="/forgot" className="text-xs text-vortex-cyan hover:underline" data-testid="login-forgot-link">Forgot?</Link>
              </div>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 h-12 bg-vortex-elevated border-white/10 focus:border-vortex-cyan" data-testid="login-password" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 btn-primary-vortex" data-testid="login-submit">
              {loading ? "Entering..." : "Sign in"}
            </Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
            <div className="h-px flex-1 bg-white/10" /> OR <div className="h-px flex-1 bg-white/10" />
          </div>
          <Button onClick={googleLogin} variant="outline" className="w-full h-12 btn-ghost-vortex" data-testid="login-google">
            <span className="mr-2">G</span> Continue with Google
          </Button>
          <p className="mt-6 text-sm text-slate-400 text-center">
            New to Vortex? <Link to="/signup" className="text-vortex-cyan hover:underline" data-testid="login-go-signup">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
