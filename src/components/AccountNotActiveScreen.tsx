import { useState } from "react";
import { RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

interface AccountNotActiveScreenProps {
  status: string;
  onRefresh: () => Promise<void>;
  onLogout: () => Promise<void>;
}

export function AccountNotActiveScreen({ onRefresh, onLogout }: AccountNotActiveScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center auth-atmosphere px-6">
      <div className="flex flex-col items-center gap-5 animate-fade-in max-w-sm text-center">
        <BrandLogo className="h-16 w-16 shadow-[var(--shadow-md)]" />
        <p className="font-semibold text-destructive">
          Your profile is not active yet. Please contact the admin or check back later.
        </p>
        <div className="flex flex-col gap-2 w-full">
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={handleRefresh}
            disabled={refreshing || loggingOut}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="ghost"
            className="gap-2 rounded-xl"
            onClick={handleLogout}
            disabled={refreshing || loggingOut}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
