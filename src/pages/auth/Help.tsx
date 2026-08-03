import { Mail, Phone, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { LegalPage } from "@/components/auth/LegalPage";
import { LEGAL } from "@/lib/legalConfig";

const FAQS = [
  {
    q: "I didn't receive my OTP code. What do I do?",
    a: `Check your spam/junk folder if using email. You can request a new code with "Resend code" after 30 seconds. If it still doesn't arrive, contact ${LEGAL.support.email}.`,
  },
  {
    q: "How do I reset my password?",
    a: `Go to the login screen and tap "Forgot Password?". If self-serve reset isn't available, our support team at ${LEGAL.support.email} will help you securely reset it.`,
  },
  {
    q: "Who can see my profile in the directory or matrimony section?",
    a: "You control this from Settings → Privacy. You can restrict visibility to community members only, or hide specific fields.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Settings → Account → Delete Account, or follow the steps on the Account Deletion page linked below. Deletion is permanent and removes your profile data per our Privacy Policy.",
  },
  {
    q: "I signed up with Google — can I also set a password?",
    a: `Contact support at ${LEGAL.support.email} to link a password to a Google-created account.`,
  },
  {
    q: "Why does the app ask for location?",
    a: "Only when you tap Add location on a post. We show a short explanation first, then the system permission. Location is approximate (city/area) for the post label — we do not track you in the background. You can type a place manually instead.",
  },
  {
    q: "Is the app for adults only?",
    a: `Yes. ${LEGAL.appName} is intended for users aged ${LEGAL.minimumAge} and above.`,
  },
];

export default function Help() {
  const { support } = LEGAL;

  return (
    <LegalPage title="Help Center" updated={LEGAL.lastUpdated}>
      <section>
        <h2>Frequently asked questions</h2>
        <div className="space-y-4 mt-3">
          {FAQS.map((item) => (
            <div key={item.q} className="rounded-2xl bg-muted/50 p-4">
              <p className="text-sm font-semibold text-foreground">{item.q}</p>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Legal &amp; account</h2>
        <ul className="mt-2 space-y-1">
          <li>
            <Link to={LEGAL.urls.privacy} className="text-primary font-medium underline">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link to={LEGAL.urls.terms} className="text-primary font-medium underline">
              Terms of Service
            </Link>
          </li>
          <li>
            <Link to={LEGAL.urls.deleteAccount} className="text-primary font-medium underline">
              Delete your account
            </Link>
          </li>
        </ul>
      </section>

      <section>
        <h2>Still need help?</h2>
        <div className="mt-3 space-y-2.5">
          <a
            href={`mailto:${support.email}`}
            className="flex items-center gap-3 rounded-2xl bg-primary/[0.06] px-4 py-4 hover:bg-primary/10 transition-colors"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
              <Mail className="h-5 w-5" />
            </span>
            <span className="text-left min-w-0">
              <span className="block text-sm font-semibold text-foreground">Email support</span>
              <span className="block text-xs text-muted-foreground">{support.email}</span>
            </span>
          </a>

          <a
            href={support.phoneTel}
            className="flex items-center gap-3 rounded-2xl bg-primary/[0.06] px-4 py-4 hover:bg-primary/10 transition-colors"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
              <Phone className="h-5 w-5" />
            </span>
            <span className="text-left min-w-0">
              <span className="block text-sm font-semibold text-foreground">Call support</span>
              <span className="block text-xs text-muted-foreground">{support.phoneDisplay}</span>
            </span>
          </a>

          <a
            href={support.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl bg-primary/[0.06] px-4 py-4 hover:bg-primary/10 transition-colors"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="text-left min-w-0">
              <span className="block text-sm font-semibold text-foreground">WhatsApp</span>
              <span className="block text-xs text-muted-foreground">
                {support.phoneDisplay} · {support.officeHours}
              </span>
            </span>
          </a>

          <div className="rounded-2xl bg-muted/50 px-4 py-4 text-sm text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground text-sm mb-1">{LEGAL.orgName}</p>
            {support.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </section>
    </LegalPage>
  );
}
