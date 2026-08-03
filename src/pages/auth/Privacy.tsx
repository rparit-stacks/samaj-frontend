import { Link } from "react-router-dom";
import { LegalPage } from "@/components/auth/LegalPage";
import { LEGAL } from "@/lib/legalConfig";

export default function Privacy() {
  const { support } = LEGAL;

  return (
    <LegalPage title="Privacy Policy" updated={LEGAL.lastUpdated}>
      <section>
        <h2>1. Who we are</h2>
        <p>
          {LEGAL.appName} ("the App", "we", "us", "our") is operated by {LEGAL.orgName} for
          members of the Suryavanshi Samaj community. The App provides a member directory, news,
          events, matrimony, jobs, business listings, donations, emergency help, gallery,
          documents, chat, and related community services.
        </p>
        <p>
          This Privacy Policy explains what personal information we collect, how we use and share
          it, and the choices you have. It applies to the Android app ({LEGAL.packageId}), the web
          app at {LEGAL.website}, and related services.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <p>We collect information in the following categories:</p>
        <ul>
          <li>
            <strong>Account &amp; identity</strong> — name, email address, phone number, and
            password (stored as a salted hash; never in plain text).
          </li>
          <li>
            <strong>Google Sign-In</strong> — if you choose Google Sign-In, we receive your name,
            email address, and profile photo from Google to create or match your account.
          </li>
          <li>
            <strong>Profile &amp; directory</strong> — details you add to your member profile
            (including family information, blood group, location/city where you choose to share
            it), and the visibility settings you control.
          </li>
          <li>
            <strong>Approximate / precise location</strong> — where you grant location permission
            (e.g. for emergency help or location-aware community features). You can deny or revoke
            this permission in your device settings at any time.
          </li>
          <li>
            <strong>KYC / identity documents</strong> — documents you upload when a feature
            requires verification, and their verification status. These are accessible to
            authorised admins only for verification and moderation.
          </li>
          <li>
            <strong>Matrimony profiles</strong> — information you voluntarily submit for
            matrimonial purposes, shown only according to the privacy controls you choose.
          </li>
          <li>
            <strong>User content</strong> — community posts, comments, event RSVPs, emergency
            requests, gallery photos, documents, suggestions, job/business listings, and chat
            messages.
          </li>
          <li>
            <strong>Payments &amp; donations</strong> — when you make a donation or paid listing,
            payment processing is handled by our payment partner (e.g. Razorpay). We may receive
            transaction status, order/payment IDs, and amounts; we do not store your full card or
            UPI credentials.
          </li>
          <li>
            <strong>Device &amp; notifications</strong> — a push notification token (e.g. via
            Firebase Cloud Messaging) so we can deliver alerts you have opted into; plus basic
            device/browser type and app version.
          </li>
          <li>
            <strong>Usage &amp; security logs</strong> — IP address, timestamps, and similar
            technical logs used for security, abuse prevention, and diagnosing issues.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we use your information</h2>
        <ul>
          <li>Create, authenticate, and secure your account (including OTP verification).</li>
          <li>Operate community features you use (directory, events, matrimony, jobs, donations, etc.).</li>
          <li>Send in-app and push notifications you have opted into (events, emergencies, chat, security).</li>
          <li>Verify identity where a feature requires KYC.</li>
          <li>Process donations and paid listings through our payment partner.</li>
          <li>Moderate content and prevent fraud, spam, harassment, and misuse.</li>
          <li>Comply with applicable law and respond to lawful requests.</li>
          <li>Improve reliability and user experience of the App.</li>
        </ul>
        <p>
          <strong>We do not sell your personal information</strong> to third parties, and we do not
          use your data for third-party advertising.
        </p>
      </section>

      <section>
        <h2>4. Who can see your information</h2>
        <p>
          Directory and matrimony visibility are controlled by the privacy settings you configure —
          you decide what other members can see. Community posts, gallery items, and events are
          visible according to the audience you select when posting. Contact details (phone/email)
          are shared with other members only when your settings allow, or when you approve a
          contact request.
        </p>
        <p>
          Community admins and sub-admins may access account and content data as needed to moderate
          the platform, verify KYC, and handle support requests.
        </p>
      </section>

      <section>
        <h2>5. Sharing with service providers</h2>
        <p>
          We share data only with processors who help us run the App, under appropriate safeguards:
        </p>
        <ul>
          <li>
            <strong>Google Sign-In</strong> (Google Identity Services) — optional social login.
          </li>
          <li>
            <strong>Firebase Cloud Messaging</strong> — push notifications.
          </li>
          <li>
            <strong>Cloud hosting &amp; storage</strong> — servers and file storage for profile
            images, gallery, and documents you upload.
          </li>
          <li>
            <strong>Payment processors</strong> (e.g. Razorpay) — to process donations and paid
            transactions.
          </li>
          <li>
            <strong>Email delivery</strong> — to send OTPs, security alerts, and support messages.
          </li>
        </ul>
        <p>
          We may disclose information if required by law, court order, or to protect the rights,
          safety, and integrity of {LEGAL.orgName}, our users, or the public.
        </p>
      </section>

      <section>
        <h2>6. Data retention</h2>
        <p>
          We retain your account and content for as long as your account is active. After you delete
          your account, we remove or anonymise personal data within <strong>30 days</strong>, except
          where we must retain limited records for legal, security, fraud-prevention, accounting, or
          dispute-resolution purposes (for example, payment transaction records required by law).
        </p>
        <p>
          Backups may take a short additional period to fully expire. Deleted accounts cannot be
          restored.
        </p>
      </section>

      <section>
        <h2>7. Your rights &amp; choices</h2>
        <ul>
          <li>Update or correct your profile from Settings / Profile at any time.</li>
          <li>Control directory, matrimony, and field-level visibility from Settings → Privacy.</li>
          <li>Disable push notifications from Settings or your device settings.</li>
          <li>Revoke location permission from your device settings.</li>
          <li>
            Delete your account in-app via Settings → Account → Delete Account, or follow the
            instructions on our{" "}
            <Link to={LEGAL.urls.deleteAccount} className="text-primary font-medium underline">
              Account Deletion
            </Link>{" "}
            page.
          </li>
          <li>
            Request access, correction, or deletion by emailing{" "}
            <a href={`mailto:${support.email}`} className="text-primary font-medium underline">
              {support.email}
            </a>
            .
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Account deletion</h2>
        <p>
          You can permanently delete your account and associated personal data from within the App
          (Settings → Delete Account) while logged in. If you cannot access the App, email{" "}
          <a href={`mailto:${support.email}`} className="text-primary font-medium underline">
            {support.email}
          </a>{" "}
          from your registered email with the subject line &quot;Delete my Samaj account&quot;. Full
          steps are published at{" "}
          <Link to={LEGAL.urls.deleteAccount} className="text-primary font-medium underline">
            {LEGAL.website}
            {LEGAL.urls.deleteAccount}
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>9. Children's privacy</h2>
        <p>
          The App is intended for users aged <strong>{LEGAL.minimumAge} and above</strong>. Matrimony
          and related community features are not directed at children. We do not knowingly collect
          personal information from anyone under {LEGAL.minimumAge}. If you believe a minor has
          provided us data, contact us and we will delete it promptly.
        </p>
      </section>

      <section>
        <h2>10. Security</h2>
        <p>
          We use industry-standard measures such as HTTPS/TLS in transit, hashed passwords, and
          access controls for admin tools. No method of transmission or storage is 100% secure; we
          work to protect your information and encourage you to use a strong, unique password.
        </p>
      </section>

      <section>
        <h2>11. International transfers</h2>
        <p>
          Our primary operations are in India. Service providers may process data in other
          jurisdictions; where they do, we take reasonable steps to ensure appropriate protection.
        </p>
      </section>

      <section>
        <h2>12. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be reflected by
          updating the &quot;Last updated&quot; date above. Continued use of the App after changes
          take effect constitutes acceptance of the revised policy where permitted by law.
        </p>
      </section>

      <section>
        <h2>13. Contact us</h2>
        <p>
          For privacy questions, corrections, or deletion requests:
          <br />
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
      </section>
    </LegalPage>
  );
}
