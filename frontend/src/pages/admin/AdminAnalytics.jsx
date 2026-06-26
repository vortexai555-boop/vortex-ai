import React from "react";
import useSWR from "swr";
import { api } from "@/lib/api";

export default function AdminAnalytics() {
  const { data, error } = useSWR("/admin/analytics", (url) => api.get(url).then(r => r.data));

  if (error) return <div className="p-4 text-red-500">Failed to load analytics</div>;
  if (!data) return <div className="p-4 text-slate-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-light">Analytics & Revenue</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 border border-white/10 rounded-xl bg-white/5">
          <div className="text-sm text-slate-400">Total Users</div>
          <div className="text-2xl font-medium mt-1">{data.total_users}</div>
        </div>
        <div className="p-4 border border-white/10 rounded-xl bg-white/5">
          <div className="text-sm text-slate-400">Paid Users</div>
          <div className="text-2xl font-medium mt-1">{data.paid_users}</div>
        </div>
        <div className="p-4 border border-white/10 rounded-xl bg-white/5">
          <div className="text-sm text-slate-400">Total Revenue</div>
          <div className="text-2xl font-medium mt-1 text-green-400">${data.total_revenue}</div>
        </div>
        <div className="p-4 border border-white/10 rounded-xl bg-white/5">
          <div className="text-sm text-slate-400">MRR</div>
          <div className="text-2xl font-medium mt-1 text-cyan-400">${data.mrr}</div>
          <div className="text-xs text-green-400 mt-1">{data.growth}</div>
        </div>
      </div>
    </div>
  );
}
