import React from "react";
import useSWR from "swr";
import { api } from "@/lib/api";

export default function AdminUsers() {
  const { data, error } = useSWR("/admin/users", (url) => api.get(url).then(r => r.data));

  if (error) return <div className="p-4 text-red-500">Failed to load users</div>;
  if (!data) return <div className="p-4 text-slate-400">Loading...</div>;

  const usersList = Array.isArray(data) ? data : data.users || [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-light">Users</h2>
      <div className="border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Plan</th>
              <th className="p-3 font-medium">Credits</th>
              <th className="p-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {usersList.map((u, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-500/20 text-slate-300'}`}>{u.role}</span>
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-300">{u.plan || 'free'}</span>
                </td>
                <td className="p-3">{u.credits}</td>
                <td className="p-3 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {usersList.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-slate-400">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
