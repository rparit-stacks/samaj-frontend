import { Link, useLocation } from "react-router-dom";
import { 
  Home, Newspaper, Users, Calendar, AlertTriangle, LayoutGrid,
  MessageSquare, MessageCircle, Image, FileText, Lightbulb, Heart, 
  GraduationCap, Settings, Info, ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BrandLogo } from "@/components/BrandLogo";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/services", icon: LayoutGrid, label: "Services" },
  { to: "/news", icon: Newspaper, label: "News" },
  { to: "/directory", icon: Users, label: "Directory" },
  { to: "/events", icon: Calendar, label: "Events" },
  { to: "/emergency", icon: AlertTriangle, label: "Emergency", badge: 2 },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/feeds", icon: MessageSquare, label: "Community" },
  { to: "/gallery", icon: Image, label: "Gallery" },
  { to: "/documents", icon: FileText, label: "Documents" },
  { to: "/suggestions", icon: Lightbulb, label: "Suggestions" },
  { to: "/matrimony", icon: Heart, label: "Matrimony" },
  { to: "/exams", icon: GraduationCap, label: "Exams" },
];

const bottomNavItems = [
  { to: "/about", icon: Info, label: "About" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

interface DesktopSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function DesktopSidebar({ collapsed, onToggle }: DesktopSidebarProps) {
  const location = useLocation();

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = location.pathname === item.to || 
      (item.to !== "/" && location.pathname.startsWith(item.to));

    const content = (
      <Link
        to={item.to}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
          collapsed ? "justify-center" : "",
          isActive 
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className={cn(
          "h-5 w-5 flex-shrink-0 transition-transform duration-200",
          !isActive && "group-hover:scale-110"
        )} />
        {!collapsed && (
          <>
            <span className="font-medium flex-1">{item.label}</span>
            {item.badge && (
              <span className="bg-emergency text-emergency-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {item.badge && (
              <span className="bg-emergency text-emergency-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside className={cn(
      "hidden md:flex flex-col h-screen sticky top-0 bg-sidebar transition-all duration-300",
      collapsed ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border",
        collapsed ? "justify-center" : "gap-3"
      )}>
        <BrandLogo className="w-10 h-10 flex-shrink-0" rounded="xl" />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sidebar-foreground text-lg truncate">Samaj</h1>
            <p className="text-xs text-sidebar-foreground/60 truncate">Community Platform</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-2 space-y-1 border-t border-sidebar-border">
        {bottomNavItems.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "w-full text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed ? "px-0 justify-center" : ""
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
