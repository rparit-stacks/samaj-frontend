import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  LayoutGrid,
  AlertTriangle,
  MessageSquare,
  User,
  Settings,
  Info,
  Bell,
  Search,
  UserRound,
  LogOut,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SheetClose } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { userApi, type UserProfile } from "@/lib/api";
import { SERVICE_GRID_ITEMS } from "@/lib/serviceGridItems";
import { BrandLogo } from "@/components/BrandLogo";

interface DrawerLinkItem {
  to: string;
  icon: LucideIcon;
  label: string;
  color: string;
}

const DRAWER_QUICK_LINKS: DrawerLinkItem[] = [
  { to: "/", icon: Home, label: "Home", color: "bg-primary/10 text-primary" },
  { to: "/services", icon: LayoutGrid, label: "Services", color: "bg-violet-500/10 text-violet-600" },
  { to: "/emergency", icon: AlertTriangle, label: "Emergency", color: "bg-red-500/10 text-red-600" },
  { to: "/feeds", icon: MessageSquare, label: "Community", color: "bg-blue-500/10 text-blue-600" },
  { to: "/profile", icon: User, label: "Profile", color: "bg-cyan-500/10 text-cyan-600" },
  { to: "/settings", icon: Settings, label: "Settings", color: "bg-muted text-muted-foreground" },
  { to: "/about", icon: Info, label: "About", color: "bg-slate-500/10 text-slate-600" },
  { to: "/notifications", icon: Bell, label: "Alerts", color: "bg-amber-500/10 text-amber-600" },
  { to: "/search", icon: Search, label: "Search", color: "bg-emerald-500/10 text-emerald-600" },
  { to: "/find-members", icon: UserRound, label: "Find people", color: "bg-indigo-500/10 text-indigo-600" },
];

function isRouteActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function DrawerGridCell({ item }: { item: DrawerLinkItem }) {
  const location = useLocation();
  const active = isRouteActive(location.pathname, item.to);

  return (
    <SheetClose asChild>
      <Link
        to={item.to}
        className={cn(
          "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all tap-target min-h-[88px] justify-center",
          active
            ? "border-primary/40 bg-primary/5 ring-1 ring-primary/15"
            : "border-border/60 bg-card hover:bg-muted/50"
        )}
      >
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", item.color)}>
          <item.icon className="h-5 w-5" />
        </div>
        <span className="text-[11px] font-medium text-foreground leading-tight line-clamp-2">{item.label}</span>
      </Link>
    </SheetClose>
  );
}

function ServiceGridCell({ to, icon: Icon, label, color }: (typeof SERVICE_GRID_ITEMS)[0]) {
  const location = useLocation();
  const active = isRouteActive(location.pathname, to);

  return (
    <SheetClose asChild>
      <Link
        to={to}
        className={cn(
          "flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-center transition-all tap-target min-h-[80px] justify-center",
          active
            ? "border-primary/40 bg-primary/5 ring-1 ring-primary/15"
            : "border-border/60 bg-card hover:bg-muted/50"
        )}
      >
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", color)}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <span className="text-[10px] font-medium text-foreground/90 leading-tight line-clamp-2">{label}</span>
      </Link>
    </SheetClose>
  );
}

export function MobileDrawer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: userApi.getProfile,
    enabled: isAuthenticated,
  });

  const name =
    profile?.fullName ||
    (user?.metadata?.name as string) ||
    user?.email?.split("@")[0] ||
    "User";
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  const avatarUrl = profile?.avatarUrl ?? null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-full bg-background max-h-[100dvh]">
      <div className="sticky top-0 z-10 glass border-b border-border/70 shrink-0 pt-safe-top">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-2.5">
            <BrandLogo className="h-9 w-9" rounded="xl" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Menu</p>
              <p className="font-semibold leading-tight truncate">Samaj</p>
            </div>
          </div>
          <SheetClose asChild>
            <button
              type="button"
              className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/40 hover:bg-muted/70"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </SheetClose>
        </div>
      </div>

      <div className="px-4 pt-3 shrink-0">
        <SheetClose asChild>
          <Link
            to="/profile"
            className="block rounded-2xl bg-gradient-primary overflow-hidden shadow-md ring-1 ring-primary/10"
          >
            <div className="relative p-3.5">
              <div className="absolute inset-0 opacity-25" aria-hidden="true">
                <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
              </div>
              <div className="relative flex items-center gap-3">
                <Avatar className="h-11 w-11 border-2 border-primary-foreground/20">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                  <AvatarFallback className="bg-secondary text-secondary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-primary-foreground truncate">
                    {isAuthenticated ? name : "Guest"}
                  </p>
                  <p className="text-xs text-primary-foreground/75 truncate">
                    {isAuthenticated ? user?.email || user?.phone || "View profile" : "Sign in to your account"}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </SheetClose>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 px-0.5">Quick links</p>
          <div className="grid grid-cols-3 gap-2">
            {DRAWER_QUICK_LINKS.map((item) => (
              <DrawerGridCell key={item.to} item={item} />
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 px-0.5">All services</p>
          <div className="grid grid-cols-3 gap-2">
            {SERVICE_GRID_ITEMS.map((item) => (
              <ServiceGridCell key={item.to} {...item} />
            ))}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-border shrink-0 pb-safe-bottom">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 w-full rounded-2xl text-destructive hover:bg-destructive/10 transition-colors tap-target"
          >
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="h-5 w-5" />
            </div>
            <span className="font-medium flex-1 text-left">Logout</span>
          </button>
        ) : (
          <SheetClose asChild>
            <Link
              to="/login"
              className="flex items-center gap-3 px-3 py-3 w-full rounded-2xl text-primary hover:bg-primary/10 transition-colors tap-target"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <span className="font-medium flex-1 text-left">Login</span>
            </Link>
          </SheetClose>
        )}
      </div>
    </div>
  );
}
