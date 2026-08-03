import { Link } from "react-router-dom";
import { LegalPage } from "@/components/auth/LegalPage";
import { LEGAL } from "@/lib/legalConfig";

/**
 * Public account-deletion resource required by Google Play
 * (Data safety → Account deletion URL). Must work without login.
 */
export default function DeleteAccount() {
  const { support } = LEGAL;

  return (
    <LegalPage title="Delete your account" updated={LEGAL.lastUpdated}>
      <section>
        <h2>Overview</h2>
        <p>
          You can permanently delete your {LEGAL.appName} account and the personal data associated
          with it. This page explains how — both inside the App and if you no longer have access to
          the App. Google Play requires this information to be publicly available.
        </p>
      </section>

      <section>
        <h2>Option 1 — Delete from inside the App (recommended)</h2>
        <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
          <li>Open the {LEGAL.appName} app and sign in with your account.</li>
          <li>
            Go to <strong className="text-foreground">Settings</strong> (profile / account menu).
          </li>
          <li>
            Open the <strong className="text-foreground">Account</strong> tab.
          </li>
          <li>
            Tap <strong className="text-foreground">Delete Account</strong> under Danger Zone.
          </li>
          <li>Confirm deletion in the dialog. This cannot be undone.</li>
        </ol>
        <p className="mt-2">
          Deep link while logged in:{" "}
          <Link to="/settings#account" className="text-primary font-medium underline">
            {LEGAL.website}/settings#account
          </Link>
        </p>
      </section>

      <section>
        <h2>Option 2 — Request deletion by email</h2>
        <p>
          If you cannot sign in or have uninstalled the App, email us from your{" "}
          <strong>registered email address</strong>:
        </p>
        <ul>
          <li>
            To:{" "}
            <a href={`mailto:${support.email}`} className="text-primary font-medium underline">
              {support.email}
            </a>
          </li>
          <li>
            Subject: <strong>Delete my Samaj account</strong>
          </li>
          <li>
            Body: include your full name, registered phone number (if any), and a clear request to
            delete your account.
          </li>
        </ul>
        <p>
          We will verify ownership of the account and complete deletion within{" "}
          <strong>7 business days</strong> of a verified request (sooner when possible). You may
          also call{" "}
          <a href={support.phoneTel} className="text-primary font-medium underline">
            {support.phoneDisplay}
          </a>{" "}
          during {support.officeHours}.
        </p>
      </section>

      <section>
        <h2>What is deleted</h2>
        <ul>
          <li>Your login credentials and account profile.</li>
          <li>Directory / member profile fields and privacy preferences.</li>
          <li>Matrimony profile linked to your account (if any).</li>
          <li>Personal contact details (email, phone) associated with the account.</li>
          <li>Device push-notification tokens.</li>
          <li>
            Content that is solely yours may be removed or anonymised (see exceptions below).
          </li>
        </ul>
      </section>

      <section>
        <h2>What may be retained</h2>
        <ul>
          <li>
            Content you posted in shared community spaces may be anonymised (author name replaced)
            rather than instantly erased, so community history remains coherent.
          </li>
          <li>
            Limited records required for legal, security, fraud-prevention, accounting, or dispute
            resolution (e.g. donation/payment transaction IDs) may be kept as required by law.
          </li>
          <li>Aggregated, non-identifying analytics may remain.</li>
        </ul>
      </section>

      <section>
        <h2>Timeline</h2>
        <p>
          After an in-app deletion or a verified email request, personal data is deleted or
          anonymised within <strong>30 days</strong>. Backup copies may take a short additional
          period to expire. Deleted accounts cannot be restored.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          <strong>{LEGAL.orgName}</strong>
          <br />
          Email:{" "}
          <a href={`mailto:${support.email}`} className="text-primary font-medium underline">
            {support.email}
          </a>
          <br />
          Phone:{" "}
          <a href={support.phoneTel} className="text-primary font-medium underline">
            {support.phoneDisplay}
          </a>
          <br />
          Address: {support.addressOneLine}
        </p>
        <p className="mt-3">
          Related:{" "}
          <Link to={LEGAL.urls.privacy} className="text-primary font-medium underline">
            Privacy Policy
          </Link>
          {" · "}
          <Link to={LEGAL.urls.terms} className="text-primary font-medium underline">
            Terms of Service
          </Link>
          {" · "}
          <Link to={LEGAL.urls.help} className="text-primary font-medium underline">
            Help Center
          </Link>
        </p>
      </section>
    </LegalPage>
  );
}
