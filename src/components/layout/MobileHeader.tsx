import { Bell, Menu, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileDrawer } from "./MobileDrawer";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "@/lib/api";

interface MobileHeaderProps {
  title?: string;
}

export function MobileHeader({ title = "Samaj" }: MobileHeaderProps) {
  const { isAuthenticated } = useAuth();

  const { data: unreadData } = useQuery({
    queryKey: ["notifications", "unreadCount"],
    queryFn: notificationApi.getUnreadCount,
    enabled: isAuthenticated,
  });

  const unread = unreadData?.unread ?? 0;

  return (
    <header className="sticky top-0 z-40 md:hidden">
      <div className="glass border-b border-border/70">
        <div className="grid grid-cols-[2.75rem_1fr_5.5rem] items-center h-14 px-2">
          {/* Left: hamburger */}
          <div className="flex justify-start">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="tap-target rounded-2xl h-10 w-10 bg-muted/40 hover:bg-muted/70 shrink-0"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-screen max-w-none sm:max-w-md">
                <MobileDrawer />
              </SheetContent>
            </Sheet>
          </div>

          {/* Center: page title */}
          <h1 className="min-w-0 text-center text-base font-semibold text-foreground truncate px-1">
            {title}
          </h1>

          {/* Right: Chat + Notifications */}
          <div className="flex items-center justify-end gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="tap-target h-10 w-10 rounded-2xl bg-muted/40 hover:bg-muted/70"
              asChild
              aria-label="Chat"
            >
              <Link to="/chat">
                <MessageCircle className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="tap-target relative h-10 w-10 rounded-2xl bg-muted/40 hover:bg-muted/70"
              asChild
              aria-label="Notifications"
            >
              <Link to="/notifications">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 px-1 min-w-[16px] h-[16px] bg-emergency rounded-full text-[9px] font-bold flex items-center justify-center text-white ring-2 ring-background">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
