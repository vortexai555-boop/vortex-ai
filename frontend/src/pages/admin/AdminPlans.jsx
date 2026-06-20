import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, PencilSimple, Trash, CheckCircle } from "@phosphor-icons/react";

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    id: "", name: "", price: 0, currency: "USD", credits: 0, purchasable: false, features: ""
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/plans");
      setPlans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEdit = (p) => {
    setEditing(p.id);
    setAdding(false);
    setForm({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency || "USD",
      credits: p.credits,
      purchasable: p.purchasable,
      features: (p.features || []).join(", ")
    });
    setError(""); MESSAGE("");
  };

  const MESSAGE = (msg) => { setMessage(msg); setTimeout(() => setMessage(""), 3000); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.id || !form.name) return setError("ID and name required");
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        credits: Number(form.credits),
        features: form.features.split(",").map(s => s.trim()).filter(Boolean)
      };
      await api.post("/admin/plans", payload);
      setEditing(null);
      setAdding(false);
      MESSAGE("Plan saved");
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to save plan");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this plan?")) return;
    try {
      await api.delete(`/admin/plans/${id}`);
      MESSAGE("Plan deleted");
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to delete plan");
    }
  };

  if (loading) return <div className="p-6">Loading plans...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">Subscription Plans</h2>
        <button
          onClick={() => {
            setAdding(true); setEditing(null); setError("");
            setForm({ id: "", name: "", price: 0, currency: "USD", credits: 0, purchasable: true, features: "" });
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-vortex-cyan text-black rounded hover:opacity-90 transition text-sm font-medium"
        >
          <Plus /> Add Plan
        </button>
      </div>

      {message && <div className="text-green-400 text-sm">{message}</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      {(adding || editing) && (
        <div className="glass p-6 rounded-2xl border border-white/5 space-y-4 max-w-xl">
          <h3 className="text-lg font-medium">{adding ? "New Plan" : "Edit Plan"}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Plan ID</label>
                <input
                  value={form.id} onChange={e => setForm({ ...form, id: e.target.value })}
                  disabled={!adding}
                  className="w-full bg-[#07080d] border border-white/10 rounded overflow-hidden px-3 py-2 text-sm focus:outline-none"
                  placeholder="e.g. premium"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Plan Name</label>
                <input
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#07080d] border border-white/10 rounded overflow-hidden px-3 py-2 text-sm focus:outline-none"
                  placeholder="e.g. Premium"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Price</label>
                <div className="flex gap-2">
                  <select
                    value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                    className="w-24 bg-[#07080d] border border-white/10 rounded px-2 py-2 text-sm focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                  </select>
                  <input
                    type="number" step="0.01"
                    value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                    className="flex-1 min-w-0 bg-[#07080d] border border-white/10 rounded overflow-hidden px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Monthly Credits</label>
                <input
                  type="number"
                  value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })}
                  className="w-full bg-[#07080d] border border-white/10 rounded overflow-hidden px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
               <label className="flex items-center gap-2 mt-2">
                 <input type="checkbox" checked={form.purchasable} onChange={e => setForm({ ...form, purchasable: e.target.checked })} />
                 <span className="text-sm">Available for Purchase</span>
               </label>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Features (comma-separated)</label>
              <textarea
                value={form.features} onChange={e => setForm({ ...form, features: e.target.value })}
                className="w-full bg-[#07080d] border border-white/10 rounded overflow-hidden px-3 py-2 text-sm focus:outline-none h-20"
                placeholder="Feature 1, Feature 2"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" className="px-4 py-2 bg-vortex-cyan text-black rounded text-sm font-medium hover:opacity-90">
                Save Plan
              </button>
              <button type="button" onClick={() => { setAdding(false); setEditing(null); }} className="px-4 py-2 hover:bg-white/5 rounded text-sm transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(p => (
          <div key={p.id} className="glass p-6 rounded-2xl border border-white/5 relative group">
            <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => handleEdit(p)} className="p-1.5 hover:text-white text-slate-400 transition"><PencilSimple size={16} /></button>
              {!["free", "pro", "business", "enterprise"].includes(p.id) && (
                <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:text-red-400 text-slate-400 transition"><Trash size={16} /></button>
              )}
            </div>
            <div className="text-xs text-vortex-cyan/80 font-mono mb-1">{p.id}</div>
            <h3 className="text-2xl font-light">{p.name}</h3>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl">{p.currency === "INR" ? "₹" : "$"}{p.price}</span>
              <span className="text-sm text-slate-400 pb-1">/mo</span>
            </div>
            <div className="text-sm text-mono-accent mt-3">{p.credits} Credits / month</div>
            
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
               {p.features?.map((f, i) => (
                 <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                   <CheckCircle className="text-vortex-cyan shrink-0 mt-0.5" />
                   <span>{f}</span>
                 </div>
               ))}
            </div>

            <div className="mt-4 flex">
              {p.purchasable ? (
                 <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded">Purchasable</span>
              ) : (
                 <span className="text-xs bg-white/5 text-slate-400 px-2 py-1 rounded">Internal</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
