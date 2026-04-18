import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import { 
  AlertTriangle, MessageSquare, MessageCircle, Image, FileText, 
  Lightbulb, Heart, GraduationCap, Info, User, Settings, ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { 
    to: "/emergency", 
    icon: AlertTriangle, 
    label: "Emergency", 
    description: "Urgent help requests",
    color: "bg-emergency/10 text-emergency",
  },
  { 
    to: "/chat", 
    icon: MessageCircle, 
    label: "Chat", 
    description: "Message community members",
    color: "bg-teal-500/10 text-teal-600"
  },
  { 
    to: "/feeds", 
    icon: MessageSquare, 
    label: "Community Wall", 
    description: "Posts and discussions",
    color: "bg-blue-500/10 text-blue-600"
  },
  { 
    to: "/gallery", 
    icon: Image, 
    label: "Photo Gallery", 
    description: "Event photos and albums",
    color: "bg-purple-500/10 text-purple-600"
  },
  { 
    to: "/documents", 
    icon: FileText, 
    label: "Documents", 
    description: "Forms and notices",
    color: "bg-green-500/10 text-green-600"
  },
  { 
    to: "/suggestions", 
    icon: Lightbulb, 
    label: "Suggestions", 
    description: "Share your ideas",
    color: "bg-yellow-500/10 text-yellow-600"
  },
  { 
    to: "/matrimony", 
    icon: Heart, 
    label: "Matrimony", 
    description: "Find suitable matches",
    color: "bg-pink-500/10 text-pink-600"
  },
  { 
    to: "/exams", 
    icon: GraduationCap, 
    label: "Exams & Results", 
    description: "Competitive exams info",
    color: "bg-indigo-500/10 text-indigo-600"
  },
];

const settingsItems = [
  { to: "/about", icon: Info, label: "About Samaj" },
  { to: "/profile", icon: User, label: "My Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function More() {
  return (
    <AppLayout title="More">
      <div className="px-4 pt-4 pb-6 md:p-6 space-y-5 max-w-5xl mx-auto">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-primary text-primary-foreground p-5 shadow-glow ring-1 ring-primary-foreground/15 relative overflow-hidden">
          <div className="absolute -top-16 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-20 -left-12 w-56 h-56 bg-black/10 rounded-full blur-2xl" />
          <div className="relative">
            <h1 className="text-xl md:text-2xl font-bold">More</h1>
            <p className="text-sm text-primary-foreground/85 mt-1">
              Explore all Samaj services in one place
            </p>
          </div>
        </div>

        {/* Mobile-first list; grid on larger screens */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group rounded-3xl border border-border/70 bg-gradient-card shadow-card hover:shadow-card-hover transition-all p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-11 w-11 rounded-2xl flex items-center justify-center ring-1 ring-border/60",
                    item.color
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight truncate">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
        </div>

        {/* Settings & info */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Settings & Info</h2>
          <div className="rounded-3xl border border-border/70 bg-card shadow-card overflow-hidden">
            {settingsItems.map((item, idx) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 hover:bg-muted/50 transition-colors",
                  idx !== 0 && "border-t border-border/60"
                )}
              >
                <div className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center ring-1 ring-border/50">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="font-medium">{item.label}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
              </Link>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-2">
          <p>Samaj v1.0.0</p>
        </div>
      </div>
    </AppLayout>
  );
}
