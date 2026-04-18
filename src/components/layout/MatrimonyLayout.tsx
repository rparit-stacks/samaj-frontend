import { ReactNode, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Heart, LayoutDashboard, MessageCircle, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MatrimonyLayoutProps {
  children: ReactNode;
  title?: string;
  backTo?: string;
  backMode?: "root" | "history";
}

const navItems = [
  { to: "/matrimony/my", label: "My Profile", icon: UserCircle2 },
  { to: "/matrimony/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/matrimony", label: "Matches", icon: Heart },
  { to: "/matrimony/chats", label: "Chat", icon: MessageCircle },
] as const;

export function MatrimonyLayout({
  children,
  title = "Matrimony",
  backTo = "/",
  // For the matrimony module, the back button should exit matrimony
  // (not go back to a previous matrimony screen in the history stack).
  backMode = "root",
}: MatrimonyLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTo = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/matrimony/chats")) return "/matrimony/chats";
    if (path.startsWith("/matrimony/dashboard")) return "/matrimony/dashboard";
    if (path.startsWith("/matrimony/my")) return "/matrimony/my";
    if (path.startsWith("/matrimony/profile/")) return "/matrimony/my";
    if (path.startsWith("/matrimony/profile/new")) return "/matrimony/my";
    return "/matrimony";
  }, [location.pathname]);

  const handleBack = (mode: "root" | "history") => {
    // History is the default UX for the matrimony header.
    // If history is empty (rare), fall back to `backTo`.
    if (mode === "root") {
      navigate(backTo);
      return;
    }
    const historyLen = typeof window !== "undefined" ? window.history.length : 2;
    if (historyLen <= 1) navigate(backTo);
    else navigate(-1);
  };

  return (
    <div className="h-screen flex w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] bg-sidebar sticky top-0 h-screen border-r border-sidebar-border">
        <div className="flex flex-col h-full">
          <div className="h-16 px-4 border-b border-sidebar-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center flex-shrink-0">
              <Heart className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sidebar-foreground text-lg truncate">Matrimony</h1>
              <p className="text-xs text-sidebar-foreground/60 truncate">Profiles & matching</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTo === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                      !isActive && "group-hover:scale-110",
                    )}
                  />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-3 border-t border-sidebar-border">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleBack(backMode)}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Samaj
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 md:hidden">
          <div className="glass border-b border-border/70">
            <div className="flex items-center justify-between h-16 px-4">
            <Button
              variant="ghost"
              size="icon"
              className="tap-target rounded-2xl bg-muted/40 hover:bg-muted/70"
              onClick={() => handleBack(backMode)}
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="min-w-0 text-center flex-1 px-2">
              <div className="inline-flex items-center gap-2 max-w-full">
                <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-glow ring-1 ring-rose-200/20">
                  <Heart className="h-5 w-5" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-semibold leading-tight truncate">{title}</p>
                  <p className="text-[11px] text-muted-foreground leading-none truncate">Swipe to match</p>
                </div>
              </div>
            </div>

            <div className="w-10" />
            </div>
          </div>
        </header>

        <main className={cn("flex-1 overflow-y-auto", "pb-20 md:pb-6")}>{children}</main>

        {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="glass border-t border-border/70 shadow-[0_-10px_30px_-18px_hsl(var(--foreground)/0.25)]">
            <div className="flex items-center justify-around pb-safe-bottom px-2">
            {navItems.map((item) => {
              const isActive = activeTo === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-2.5 px-2 min-w-[64px] tap-target transition-all duration-200",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "absolute top-0 left-1/2 -translate-x-1/2 h-1 w-10 rounded-b-full transition-all duration-200",
                      isActive ? "bg-primary" : "bg-transparent",
                    )}
                    aria-hidden="true"
                  />
                  <div
                    className={cn(
                      "relative rounded-2xl transition-all duration-200 px-3 py-2",
                      isActive ? "bg-primary/10 ring-1 ring-primary/15" : "bg-transparent",
                    )}
                  >
                    <Icon className={cn("h-[22px] w-[22px] transition-all duration-200", isActive ? "scale-110 -translate-y-[1px]" : "")} />
                  </div>
                  <span className={cn("text-[10.5px] leading-none font-medium mt-1 transition-all duration-200", isActive && "font-semibold")}>{item.label}</span>
                </Link>
              );
            })}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}

