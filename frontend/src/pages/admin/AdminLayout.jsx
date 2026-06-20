import React from "react";
import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { CreditCard, Gear, Users, ListChecks, ShieldStar, List } from "@phosphor-icons/react";

const ADMIN_NAV = [
  { to: "/dashboard/admin/payments", icon: CreditCard, label: "Payments", testid: "admin-nav-payments" },
  { to: "/dashboard/admin/subscriptions", icon: ListChecks, label: "Subscriptions", testid: "admin-nav-subscriptions" },
  { to: "/dashboard/admin/plans", icon: List, label: "Plans", testid: "admin-nav-plans" },
  { to: "/dashboard/admin/settings", icon: Gear, label: "Payment Settings", testid: "admin-nav-settings" },
  { to: "/dashboard/admin/audit", icon: ShieldStar, label: "Audit Log", testid: "admin-nav-audit" },
];

export default function AdminLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="h-full flex items-center justify-center text-mono-accent">Loading…</div>;
  }
  if (!user || user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto p-6 lg:p-10">
        <div className="text-mono-accent mb-2">Admin</div>
        <h1 className="text-4xl font-light tracking-tighter">
          Control <span className="text-gradient-cyan font-medium">Panel</span>
        </h1>

        {/* Sub-nav */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-white/5 pb-3">
          {ADMIN_NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={n.testid}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-vortex-cyan/10 text-vortex-cyan border border-vortex-cyan/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`
              }
            >
              <n.icon size={16} weight="duotone" /> {n.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
