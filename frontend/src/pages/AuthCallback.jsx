import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) { navigate("/login"); return; }
    const sid = decodeURIComponent(m[1]);
    (async () => {
      try {
        const r = await api.post("/auth/google-session", null, { headers: { "X-Session-ID": sid } });
        if (r.data?.session_token) localStorage.setItem("vortex_token", r.data.session_token);
        setUser(r.data.user);
        window.history.replaceState(null, "", "/dashboard");
        navigate("/dashboard", { replace: true, state: { user: r.data.user } });
      } catch (e) {
        navigate("/login?error=oauth", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-vortex-bg">
      <div className="text-mono-accent">Authenticating with Vortex...</div>
    </div>
  );
}
