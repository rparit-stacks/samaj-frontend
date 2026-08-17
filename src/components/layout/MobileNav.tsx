import { Link, useLocation } from "react-router-dom";
import {
  Home,
  LayoutGrid,
  AlertTriangle,
  MessageSquare,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  isEmergency?: boolean;
  match: (pathname: string) => boolean;
}

const navItems: NavItem[] = [
  {
    to: "/",
    icon: Home,
    label: "Home",
    match: (p) => p === "/",
  },
  {
    to: "/services",
    icon: LayoutGrid,
    label: "Services",
    match: (p) => p === "/services",
  },
  {
    to: "/emergency",
    icon: AlertTriangle,
    label: "Emergency",
    isEmergency: true,
    match: (p) => p.startsWith("/emergency"),
  },
  {
    to: "/feeds",
    icon: MessageSquare,
    label: "Community",
    match: (p) => p.startsWith("/feeds"),
  },
  {
    to: "/profile",
    icon: User,
    label: "Profile",
    match: (p) => p.startsWith("/profile") || p === "/settings",
  },
];

export function MobileNav() {
  const location = useLocation();
  const keyboardInset = useKeyboardInset();

  // Hide the bar entirely while the keyboard is open — a fixed-position bar
  // combined with a resizing viewport otherwise leaves a stale gap between
  // where the bar renders and where the reserved content padding expects it.
  if (keyboardInset > 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="glass border-t border-border/70 shadow-[0_-10px_30px_-18px_hsl(var(--foreground)/0.25)]">
        <div className="flex items-stretch justify-between pb-safe-bottom px-1">
          {navItems.map((item) => {
            const isActive = item.match(location.pathname);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center py-2 min-w-0 max-w-[20%] tap-target transition-all duration-200",
                  isActive
                    ? item.isEmergency
                      ? "text-red-600"
                      : "text-primary"
                    : item.isEmergency
                      ? "text-red-500/70 hover:text-red-600"
                      : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 h-1 w-8 rounded-b-full transition-all duration-200",
                    isActive
                      ? item.isEmergency
                        ? "bg-red-600"
                        : "bg-primary"
                      : "bg-transparent"
                  )}
                  aria-hidden="true"
                />

                <div
                  className={cn(
                    "relative rounded-2xl transition-all duration-200 px-2 py-1.5",
                    isActive
                      ? item.isEmergency
                        ? "bg-red-100/90 dark:bg-red-950/35 ring-1 ring-red-200/60 dark:ring-red-900/40"
                        : "bg-primary/10 ring-1 ring-primary/15"
                      : "bg-transparent"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[20px] w-[20px] mx-auto transition-all duration-200",
                      isActive ? "scale-110 -translate-y-[1px]" : "scale-100"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] leading-tight font-medium mt-0.5 text-center px-0.5 transition-all duration-200 line-clamp-2",
                    isActive && "font-semibold"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
