import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { QrCode, ArrowLeft, ShieldCheck, Check } from "@phosphor-icons/react";

export default function PaymentPage() {
  const { user, refresh } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planParam = searchParams.get("plan") || "pro";
  const [planId, setPlanId] = useState(planParam);
  const [plans, setPlans] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    utr_number: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const [rSettings, rPlans] = await Promise.all([
          api.get("/payment-settings"),
          api.get("/plans")
        ]);
        setSettings(rSettings.data);
        setPlans(rPlans.data || []);
        
        const decodedParam = decodeURIComponent(planParam);
        const foundPlan = rPlans.data && rPlans.data.find(p => p.id === planParam || p.id === decodedParam || p.id.toLowerCase() === planParam.toLowerCase() || p.name.toLowerCase() === planParam.toLowerCase());
        
        if (foundPlan) {
          setPlanId(foundPlan.id);
        } else {
          setPlanId(decodedParam);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [planParam]);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name || "", email: f.email || user.email || "" }));
  }, [user]);

  const activePlanObj = plans.find(p => p.id === planId) || { name: planId, price: planId === "pro" ? (settings?.pro_price ?? 29) : (settings?.business_price ?? 99), currency: settings?.currency };
  
  const price = activePlanObj.price;
  // Use plan specific currency if set, otherwise global settings currency
  const currency = activePlanObj.currency || settings?.currency || "USD";
  const currencySymbol = currency === "INR" ? "₹" : "$";

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.name.trim() || !form.email.trim() || !form.utr_number.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post("/payments", {
        plan: planId,
        name: form.name.trim(),
        email: form.email.trim(),
        utr_number: form.utr_number.trim(),
      });
      setSubmitted(r.data);
      toast.success(r.data.message || "Payment submitted");
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-mono-accent">Loading payment details…</div>
    );
  }

  const qrSrc = settings?.qr_image
    ? (settings.qr_image.startsWith("data:") ? settings.qr_image : `data:${settings.qr_mime || "image/png"};base64,${settings.qr_image}`)
    : null;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-5xl mx-auto p-6 lg:p-10">
        <Link to="/dashboard/billing" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6" data-testid="payment-back-link">
          <ArrowLeft size={14} /> Back to billing
        </Link>

        <div className="text-mono-accent mb-2">Checkout</div>
        <h1 className="text-4xl font-light tracking-tighter">
          Activate <span className="text-gradient-cyan font-medium capitalize">{activePlanObj.name}</span> plan
        </h1>
        <p className="mt-2 text-slate-400">Pay manually via UPI / bank transfer using the QR code, then submit your transaction details below for verification.</p>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-10 glass-strong rounded-2xl p-10 text-center"
            data-testid="payment-confirmation"
          >
            <div className="w-16 h-16 rounded-full bg-vortex-cyan/10 border border-vortex-cyan/40 mx-auto flex items-center justify-center">
              <Check size={28} weight="bold" className="text-vortex-cyan" />
            </div>
            <h2 className="mt-6 text-2xl font-medium">Payment submitted</h2>
            <p className="mt-2 text-slate-400 max-w-md mx-auto">
              Your payment is now <span className="text-yellow-300">pending verification</span>. We'll review it shortly and unlock your <span className="capitalize">{activePlanObj.name}</span> plan within minutes.
            </p>
            <div className="mt-6 text-xs text-slate-500">Reference ID: <span className="font-mono">{submitted.id}</span></div>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button onClick={() => navigate("/dashboard/billing")} className="btn-primary-vortex" data-testid="payment-back-to-billing">
                Back to billing
              </Button>
              <Button variant="outline" onClick={() => { setSubmitted(null); setForm({ ...form, utr_number: "" }); }} className="btn-ghost-vortex" data-testid="payment-submit-another">
                Submit another
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* QR */}
            <div className="glass rounded-2xl p-8">
              <div className="text-mono-accent mb-1">Step 1</div>
              <div className="text-lg font-medium">Scan to pay {currencySymbol}{price}</div>
              <p className="text-sm text-slate-400 mt-1">{settings?.instructions || "Scan this QR with your UPI / banking app."}</p>

              <div className="mt-6 flex items-center justify-center">
                {qrSrc && settings?.qr_enabled !== false ? (
                  <div className="bg-white rounded-2xl p-5 shadow-2xl">
                    <img src={qrSrc} alt="Payment QR" className="w-56 h-56 object-contain" data-testid="payment-qr-image" />
                  </div>
                ) : (
                  <div className="bg-white/5 border border-dashed border-white/15 rounded-2xl p-10 text-center" data-testid="payment-qr-missing">
                    <QrCode size={40} className="mx-auto text-slate-500" />
                    <p className="mt-3 text-slate-400 text-sm">
                      {settings?.qr_enabled === false
                        ? "QR payments are temporarily disabled. Please contact support."
                        : "QR code not configured yet. Please contact admin."}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                  <div className="text-mono-accent mb-1">Plan</div>
                  <div className="capitalize font-medium" data-testid="payment-plan-label">{activePlanObj.name}</div>
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                  <div className="text-mono-accent mb-1">Amount</div>
                  <div className="font-medium" data-testid="payment-amount">{currencySymbol}{price}</div>
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 col-span-2">
                  <div className="text-mono-accent mb-1">Credits Included</div>
                  <div className="font-medium" data-testid="payment-credits">{activePlanObj.credits?.toLocaleString() ?? 0}</div>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="glass rounded-2xl p-8 space-y-4">
              <div className="text-mono-accent">Step 2</div>
              <div className="text-lg font-medium">Submit your payment details</div>
              <p className="text-sm text-slate-400 -mt-1">We need your UTR / transaction ID to verify the payment.</p>

              <div>
                <Label className="text-slate-300 text-xs uppercase tracking-widest">Full name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 h-11 bg-vortex-elevated border-white/10" data-testid="payment-input-name" />
              </div>
              <div>
                <Label className="text-slate-300 text-xs uppercase tracking-widest">Email</Label>
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 h-11 bg-vortex-elevated border-white/10" data-testid="payment-input-email" />
              </div>
              <div>
                <Label className="text-slate-300 text-xs uppercase tracking-widest">UTR / Transaction ID</Label>
                <Input required value={form.utr_number} onChange={(e) => setForm({ ...form, utr_number: e.target.value })} placeholder="e.g. 414218023765" className="mt-2 h-11 bg-vortex-elevated border-white/10 font-mono" data-testid="payment-input-utr" />
                <div className="mt-1.5 text-xs text-slate-500">From your bank/UPI app after the transfer is complete.</div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full h-12 btn-primary-vortex" data-testid="payment-submit-btn">
                {submitting ? "Submitting…" : "Submit for verification"}
              </Button>
              <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-white/5">
                <ShieldCheck size={14} className="text-vortex-cyan" />
                Your details are encrypted in transit and only visible to the admin.
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
