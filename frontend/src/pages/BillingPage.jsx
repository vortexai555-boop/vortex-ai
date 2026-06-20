import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Check, CreditCard, Clock, X, Lightning, Copy } from "@phosphor-icons/react";

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
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, m, p, pl] = await Promise.all([
          api.get("/payment-settings"),
          api.get("/subscriptions/me"),
          api.get("/payments/me"),
          api.get("/plans")
        ]);
        setSettings(s.data);
        setSub(m.data.active);
        setHistory(m.data.history || []);
        setPayments(p.data || []);
        setPlans(pl.data || []);
      } catch (_e) { /* ignore */ }
    })();
  }, []);

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

        {/* Dynamic Plans Table */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p, i) => {
            const isCurrent = currentPlan === p.id;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-3xl p-8 relative flex flex-col justify-between overflow-hidden shadow-2xl transition hover:transform hover:scale-[1.02] border ${
                  isCurrent ? "border-vortex-cyan bg-vortex-cyan/5" : "border-white/5 glass"
                }`}
              >
                <div>
                  <h3 className="text-xl font-medium mb-2 uppercase">{p.name}</h3>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-4xl font-light">
                      {p.price > 0 ? ((p.currency || currency) === "INR" ? "₹" : "$") + p.price : "Free"}
                    </span>
                    {p.price > 0 && <span className="text-sm text-slate-400 mb-1">/ mo</span>}
                  </div>
                  <ul className="mt-8 space-y-4">
                    {p.features?.map((b, _i) => (
                      <li key={_i} className="flex items-start text-slate-300 text-sm">
                        <Check size={16} className={`mr-3 mt-0.5 shrink-0 text-vortex-cyan`} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-10">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full justify-center pointer-events-none border-white/10 text-slate-300" data-testid={`billing-plan-${p.id}-current`}>
                      Current Plan
                    </Button>
                  ) : p.purchasable ? (
                    <Button variant="default" onClick={() => goPay(p.id)} className={`w-full justify-center bg-vortex-cyan text-black hover:bg-vortex-cyan/90`} data-testid={`billing-plan-upgrade-${p.id}`}>
                      {p.price === 0 ? "Downgrade" : "Upgrade to " + p.name} <Lightning size={16} className="ml-2" />
                    </Button>
                  ) : (
                    <Button variant="outline" disabled className="w-full justify-center border-white/5 text-slate-500">
                      Unavailable
                    </Button>
                  )}
                </div>
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
