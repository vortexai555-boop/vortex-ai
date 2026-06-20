import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import VortexLogo from "@/components/VortexLogo";
import { Button } from "@/components/ui/button";
import { 
  ChatCircleDots, House, User, Gear, SignOut, 
  List, Globe, Image as ImageIcon, CreditCard, ShieldStar, MagicWand 
} from "@phosphor-icons/react";

const NAV = [
  { to: "/dashboard", icon: House, label: "Home", testid: "nav-home" },
  { to: "/dashboard/chat", icon: ChatCircleDots, label: "AI Chat", testid: "nav-chat" },
  { to: "/dashboard/website", icon: Globe, label: "Website Builder", testid: "nav-website" },
  { to: "/dashboard/images", icon: ImageIcon, label: "Image Generator", testid: "nav-images" },
  { to: "/dashboard/productivity", icon: MagicWand, label: "Productivity", testid: "nav-productivity" },
  { to: "/dashboard/billing", icon: CreditCard, label: "Billing", testid: "nav-billing" },
  { to: "/dashboard/profile", icon: User, label: "Profile", testid: "nav-profile" },
  { to: "/dashboard/settings", icon: Gear, label: "Settings", testid: "nav-settings" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const SidebarInner = (
    <aside className="h-full w-64 bg-vortex-surface border-r border-white/5 flex flex-col">
      <div className="p-5 border-b border-white/5">
        <VortexLogo size={32} />
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            onClick={() => setOpen(false)}
            data-testid={item.testid}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-white/5 text-white border border-white/10 glow-cyan"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`
            }
          >
            <item.icon size={18} weight="duotone" />
            {item.label}
          </NavLink>
        ))}
        {user?.role === "admin" && (
          <>
            <div className="px-3 pt-4 pb-1 text-mono-accent">Admin</div>
            <NavLink
              to="/dashboard/admin"
              onClick={() => setOpen(false)}
              data-testid="nav-admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-vortex-cyan/10 text-vortex-cyan border border-vortex-cyan/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`
              }
            >
              <ShieldStar size={18} weight="duotone" /> Admin Panel
            </NavLink>
          </>
        )}
      </nav>
      <div className="p-4 border-t border-white/5">
        <div className="glass rounded-xl p-4 mb-3">
          <div className="text-mono-accent">Credits</div>
          <div className="mt-1 text-2xl font-light">{user?.credits ?? 0}</div>
          <div className="mt-1 text-xs text-slate-500 capitalize">{user?.plan || "free"} plan</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vortex-cyan/30 to-vortex-purple/30 flex items-center justify-center text-sm font-medium">
            {user?.picture ? <img src={user.picture} alt="" className="w-full h-full rounded-full object-cover" /> : (user?.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate" data-testid="sidebar-user-name">{user?.name || "User"}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-md hover:bg-white/10 text-slate-400 hover:text-white" data-testid="sidebar-logout" title="Sign out">
            <SignOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-full bg-vortex-bg text-white overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block">{SidebarInner}</div>
      {/* Mobile sidebar */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute top-0 left-0 h-full">{SidebarInner}</div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-vortex-surface">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} data-testid="open-sidebar">
            <List size={20} />
          </Button>
          <VortexLogo size={28} />
          <div className="w-9" />
        </header>
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
