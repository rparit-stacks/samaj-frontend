import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { BrandLogo } from "@/components/BrandLogo";

interface LegalPageProps {
  title: string;
  updated: string;
  children: ReactNode;
}

/** Shared chrome for standalone legal/support pages reachable before login (Privacy, Terms, Help). */
export function LegalPage({ title, updated, children }: LegalPageProps) {
  const navigate = useNavigate();

  return (
    <AuthShell footer={null} className="overflow-y-auto">
      <div className="pt-4 pb-10 animate-fade-in">
        <div className="flex items-center gap-2.5 mb-6">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/login"))}
            className="tap-target inline-flex items-center justify-center -ml-2 rounded-xl text-primary hover:bg-primary/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <BrandLogo className="h-8 w-8" rounded="xl" />
          <span className="text-sm font-bold tracking-[0.18em] text-primary uppercase">Samaj</span>
        </div>

        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">Last updated: {updated}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-2 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_a]:break-words">
          {children}
        </div>
      </div>
    </AuthShell>
  );
}
