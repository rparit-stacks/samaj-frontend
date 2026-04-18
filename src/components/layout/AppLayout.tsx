import { ReactNode, useState } from "react";
import { MobileHeader } from "./MobileHeader";
import { MobileNav } from "./MobileNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopHeader } from "./DesktopHeader";
import { PullToRefresh } from "./PullToRefresh";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  mobileHeader?: ReactNode;
  /** When set, main area uses pull-to-refresh on mobile (nested scroll container). */
  pullToRefresh?: () => Promise<void>;
}

export function AppLayout({ children, title, mobileHeader, pullToRefresh }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      <DesktopSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        {mobileHeader ?? <MobileHeader title={title} />}
        
        {/* Desktop Header */}
        <DesktopHeader />

        {/* Page Content */}
        <main
          className={cn(
            "flex-1 pb-20 md:pb-6 min-h-0",
            "animate-fade-in",
            pullToRefresh ? "flex flex-col overflow-hidden" : "overflow-y-auto"
          )}
        >
          {pullToRefresh ? (
            <PullToRefresh onRefresh={pullToRefresh} className="min-h-0 flex-1">
              {children}
            </PullToRefresh>
          ) : (
            children
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </div>
  );
}
