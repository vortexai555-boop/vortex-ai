import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Check, CreditCard, Clock, X, Lightning } from "@phosphor-icons/react";

const PLANS = [
  {
    id: "free", label: "Free", priceDefault: 0,
    bullets: ["100 credits / month", "All AI tools (basic limits)", "Save chat history"],
    cta: "Current",
    accent: false,
  },
  {
    id: "pro", label: "Pro", priceDefault: 29,
    bullets: ["2,000 credits / month", "Priority generation", "Image + Website + Code AI", "Export everything"],
    cta: "Upgrade to Pro",
    accent: true,
  },
  {
    id: "business", label: "Business", priceDefault: 99,
    bullets: ["Unlimited credits", "Priority support", "Team-ready (soon)", "Advanced analytics"],
    cta: "Get Business",
    accent: false,
  },
];

const STATUS_BADGE = {
  pending: { label: "Pending review", className: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30" },
  approved: { label: "Approved", className: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" },
  rejected: { label: "Rejected", className: "bg-red-500/15 text-red-300 border border-red-500/30" },
};

export default function BillingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [sub, setSub] = useState(null);
  const [history, setHistory] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, m, p] = await Promise.all([
          api.get("/payment-settings"),
          api.get("/subscriptions/me"),
          api.get("/payments/me"),
        ]);
        setSettings(s.data);
        setSub(m.data.active);
        setHistory(m.data.history || []);
        setPayments(p.data || []);
      } catch (_e) { /* ignore */ }
    })();
  }, []);

  const priceFor = (id) => {
    if (id === "pro") return settings?.pro_price ?? 29;
    if (id === "business") return settings?.business_price ?? 99;
    return 0;
  };

  const currency = settings?.currency || "USD";
  const currentPlan = user?.plan || "free";

  const goPay = (planId) => navigate(`/dashboard/payment?plan=${planId}`);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        <div className="text-mono-accent mb-2">Account</div>
        <h1 className="text-4xl font-light tracking-tighter">
          Billing & <span className="text-gradient-cyan font-medium">Plans</span>
        </h1>
        <p className="mt-2 text-slate-400">Upgrade for higher limits and premium features.</p>

        {/* Current subscription */}
        <div className="mt-8 glass rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-mono-accent mb-1">Current plan</div>
            <div className="text-2xl font-medium capitalize" data-testid="billing-current-plan">{currentPlan}</div>
            <div className="text-sm text-slate-400 mt-1">
              {user?.credits ?? 0} credits remaining
              {sub?.activation_code && (
                <span className="ml-3 inline-flex items-center gap-2">
                  · Code <span className="font-mono text-vortex-cyan" data-testid="billing-active-code">{sub.activation_code}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(sub.activation_code); toast.success("Activation code copied"); }}
                    className="inline-flex items-center gap-1 text-vortex-cyan hover:text-white text-xs"
                    data-testid="billing-copy-code"
                    title="Copy activation code"
                  >
                    <Copy size={12} />
                  </button>
                </span>
              )}
            </div>
            {sub?.end_date && (
              <div className="text-xs text-slate-500 mt-1">Renews / expires {new Date(sub.end_date).toLocaleDateString()}</div>
            )}
          </div>
          <Badge className="bg-vortex-cyan/10 text-vortex-cyan border-vortex-cyan/30 px-3 py-1.5">
            <Lightning size={14} weight="fill" className="mr-1.5" />
            {sub ? "Subscription active" : "No active subscription"}
          </Badge>
        </div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {PLANS.map((p, i) => {
            const isCurrent = currentPlan === p.id;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl p-7 transition-all hover:-translate-y-1 ${p.accent ? "glass-strong border-[#00F0FF]/40 glow-cyan-strong" : "glass"}`}
                data-testid={`billing-plan-${p.id}`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-medium">{p.label}</h3>
                  {p.accent && <span className="text-mono-accent">Recommended</span>}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-light" data-testid={`billing-price-${p.id}`}>
                    {p.id === "free" ? "Free" : `${currency === "INR" ? "₹" : "$"}${priceFor(p.id)}`}
                  </span>
                  {p.id !== "free" && <span className="text-slate-500 text-sm">/mo</span>}
                </div>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check size={14} weight="bold" className="text-vortex-cyan mt-1 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  disabled={isCurrent || p.id === "free"}
                  onClick={() => goPay(p.id)}
                  className={`mt-6 w-full h-11 ${p.accent && !isCurrent ? "btn-primary-vortex" : "btn-ghost-vortex"} ${isCurrent ? "opacity-60 cursor-default" : ""}`}
                  data-testid={`billing-cta-${p.id}`}
                >
                  {isCurrent ? "Current plan" : p.cta}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Payment history */}
        <div className="mt-10 glass rounded-2xl p-6">
          <div className="flex items-center gap-2 text-mono-accent">
            <CreditCard size={14} /> Payment history
          </div>
          {payments.length === 0 ? (
            <div className="mt-4 text-slate-500 text-sm">No payments submitted yet.</div>
          ) : (
            <div className="mt-4 divide-y divide-white/5">
              {payments.map((p) => {
                const s = STATUS_BADGE[p.status] || STATUS_BADGE.pending;
                return (
                  <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm" data-testid={`billing-payment-${p.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium capitalize">{p.plan} plan</div>
                      <div className="text-xs text-slate-500">UTR: <span className="font-mono">{p.utr_number}</span> · {new Date(p.created_at).toLocaleString()}</div>
                      {p.activation_code && (
                        <div className="text-xs text-vortex-cyan mt-1 inline-flex items-center gap-2">
                          Activation code: <span className="font-mono">{p.activation_code}</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(p.activation_code); toast.success("Activation code copied"); }}
                            className="inline-flex items-center hover:text-white"
                            data-testid={`billing-copy-code-${p.id}`}
                            title="Copy activation code"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-xs ${s.className} flex items-center gap-1.5`}>
                      {p.status === "approved" ? <Check size={12} weight="bold" /> : p.status === "rejected" ? <X size={12} weight="bold" /> : <Clock size={12} />} {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subscription history */}
        {history.length > 0 && (
          <div className="mt-6 glass rounded-2xl p-6">
            <div className="text-mono-accent mb-3">Subscription history</div>
            <div className="divide-y divide-white/5">
              {history.map((s) => (
                <div key={s.id} className="py-3 text-sm flex flex-col sm:flex-row justify-between gap-2" data-testid={`billing-sub-${s.id}`}>
                  <div>
                    <div className="capitalize font-medium">{s.plan} · {s.status}</div>
                    <div className="text-xs text-slate-500">{new Date(s.start_date).toLocaleDateString()} → {s.end_date ? new Date(s.end_date).toLocaleDateString() : "—"}</div>
                  </div>
                  <div className="font-mono text-xs text-vortex-cyan">{s.activation_code}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
