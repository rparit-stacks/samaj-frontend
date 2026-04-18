import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, Calendar, AlertTriangle,
  MessageSquare, Image, Heart, GraduationCap, Settings, Bell,
  LogOut, Search, Menu, X, ChevronDown, Shield, History, Trophy, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isAdminKycEnabled } from "@/lib/featureFlags";
import { adminSystemApi, clearAdminTokensClientSide, startAdminSessionKeepAlive } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const sidebarItemsAll = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/users", icon: Users, label: "User Management" },
  { to: "/admin/kyc", icon: Shield, label: "KYC Verification" },
  { to: "/admin/content", icon: FileText, label: "News & Content" },
  { to: "/admin/directory", icon: Users, label: "Directory" },
  { to: "/admin/events", icon: Calendar, label: "Events" },
  { to: "/admin/emergency", icon: AlertTriangle, label: "Emergency", badge: 3 },
  { to: "/admin/community", icon: MessageSquare, label: "Community Posts" },
  { to: "/admin/gallery", icon: Image, label: "Gallery" },
  { to: "/admin/documents", icon: FileText, label: "Documents" },
  { to: "/admin/matrimony", icon: Heart, label: "Matrimony" },
  { to: "/admin/exams", icon: GraduationCap, label: "Exams & Scholarships" },
  { to: "/admin/achievements", icon: Trophy, label: "Achievers" },
  { to: "/admin/history", icon: BookOpen, label: "Samaj History" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
  { to: "/admin/audit-logs", icon: History, label: "Audit Logs" },
];

function sidebarItemsForBuild(): typeof sidebarItemsAll {
  if (isAdminKycEnabled()) return sidebarItemsAll;
  return sidebarItemsAll.filter((i) => i.to !== "/admin/kyc");
}

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: me } = useQuery({
    queryKey: ["admin", "system", "me"],
    queryFn: adminSystemApi.me,
  });

  const { allowedItems, isParentAdmin } = useMemo(() => {
    const sidebarItems = sidebarItemsForBuild();
    if (!me) {
      // Fallback: show minimum until `/admin/system/me` loads.
      const minimal = sidebarItems.filter((i) => i.to === "/admin/dashboard" || i.to === "/admin/settings");
      return { allowedItems: minimal, isParentAdmin: false };
    }
    if (me.fullAccess || me.parentAdmin || String(me.role).toUpperCase() === "ADMIN") {
      return { allowedItems: sidebarItems, isParentAdmin: true };
    }
    const keys = new Set((me.assignedServiceKeys ?? []).map((k) => String(k).toUpperCase()));
    const allowed = sidebarItems.filter((i) => {
      if (i.to === "/admin/dashboard" || i.to === "/admin/settings") return true;
      if (i.to === "/admin/content") return keys.has("NEWS");
      if (i.to === "/admin/documents") return keys.has("DOCUMENTS");
      if (i.to === "/admin/emergency") return keys.has("EMERGENCY");
      if (i.to === "/admin/events") return keys.has("EVENTS");
      if (i.to === "/admin/kyc") return keys.has("KYC");
      if (i.to === "/admin/community") return keys.has("COMMUNITY");
      if (i.to === "/admin/gallery") return keys.has("GALLERY");
      if (i.to === "/admin/matrimony") return keys.has("MATRIMONY");
      if (i.to === "/admin/exams") return keys.has("EXAM");
      if (i.to === "/admin/achievements") return keys.has("ACHIEVER");
      if (i.to === "/admin/history") return keys.has("HISTORY");
      // User management is parent-only until backend endpoints exist.
      if (i.to === "/admin/users") return false;
      return false;
    });
    return { allowedItems: allowed, isParentAdmin: false };
  }, [me]);

  useEffect(() => {
    const stop = startAdminSessionKeepAlive();
    return stop;
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 bg-white">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="text-primary font-semibold text-lg">स</span>
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-semibold text-slate-900">Samaj Admin</h1>
                <p className="text-xs text-slate-500">Control panel</p>
              </div>
            )}
          </Link>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {allowedItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm",
                  sidebarOpen ? "" : "justify-center",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500/10 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 bg-white">
          <button 
            onClick={() => {
              clearAdminTokensClientSide();
              navigate("/admin/login");
            }}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all text-sm",
              sidebarOpen ? "" : "justify-center"
            )}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn(
        "flex-1 transition-all duration-300",
        sidebarOpen ? "ml-64" : "ml-20"
      )}>
        {/* Top Header */}
        <header className="h-16 bg-white/80 border-b border-slate-200 sticky top-0 z-40 backdrop-blur">
          <div className="flex items-center justify-between h-full px-6 max-w-6xl mx-auto">
            {/* Search */}
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search users, content, events..."
                className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary text-sm font-medium">A</span>
                    </div>
                    <div className="text-left hidden lg:block">
                      <p className="text-sm font-medium text-slate-900">Admin User</p>
                      <p className="text-xs text-slate-500">{isParentAdmin ? "Parent Admin" : "Sub Admin"}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200">
                  <DropdownMenuLabel className="text-slate-700">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuItem className="text-slate-700 focus:bg-slate-50 focus:text-slate-900">
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-slate-700 focus:bg-slate-50 focus:text-slate-900">
                    Activity Log
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuItem 
                    className="text-red-600 focus:bg-red-50 focus:text-red-600"
                    onClick={() => {
                      clearAdminTokensClientSide();
                      navigate("/admin/login");
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
