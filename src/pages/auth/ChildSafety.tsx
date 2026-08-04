import { Link } from "react-router-dom";
import { LegalPage } from "@/components/auth/LegalPage";
import { LEGAL } from "@/lib/legalConfig";

/**
 * Public Child Safety Standards (CSAE) page for Google Play Console.
 * Must remain publicly reachable without login:
 *   https://web.suryavanshisamaj.online/child-safety
 */
export default function ChildSafety() {
  const { support, csamContact } = LEGAL;

  return (
    <LegalPage title="Child Safety Standards" updated={LEGAL.lastUpdated}>
      <section>
        <h2>1. Our commitment</h2>
        <p>
          {LEGAL.orgName} (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the{" "}
          {LEGAL.appName} mobile application (package ID: <code>{LEGAL.packageId}</code>). We are
          committed to preventing child sexual abuse and exploitation (CSAE), including child sexual
          abuse material (CSAM), on our platform.
        </p>
        <p>
          This page publishes our standards against CSAE. It is intended to meet Google Play&apos;s
          child safety standards disclosure requirements for social and dating-category apps.
        </p>
      </section>

      <section>
        <h2>2. Age restriction</h2>
        <p>
          {LEGAL.appName} is for users aged <strong>{LEGAL.minimumAge} and above</strong> only.
          Matrimony, directory, community chat, and related social features are adult-oriented
          community tools. We do not knowingly allow children to create accounts or use the App.
        </p>
        <p>
          If we learn that a user under {LEGAL.minimumAge} has registered, we will remove the account
          and related personal data in accordance with our{" "}
          <Link to={LEGAL.urls.privacy} className="text-primary font-medium underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>3. Prohibited content and conduct</h2>
        <p>The following are strictly prohibited on {LEGAL.appName}:</p>
        <ul>
          <li>
            Any child sexual abuse material (CSAM), including images, videos, audio, text, or links
            that depict, describe, or solicit the sexual exploitation of a minor.
          </li>
          <li>Grooming, solicitation, or sexualization of minors.</li>
          <li>Sharing, requesting, or trafficking CSAM or links to CSAM.</li>
          <li>
            Creating profiles that misrepresent age to contact or exploit minors, or to bypass our
            age restriction.
          </li>
          <li>
            Harassment, exploitation, trafficking, or any other illegal activity involving children.
          </li>
        </ul>
        <p>
          Violations may result in immediate content removal, account suspension or permanent ban,
          and reporting to relevant authorities where required by law.
        </p>
      </section>

      <section>
        <h2>4. Prevention and detection</h2>
        <p>We take reasonable steps to reduce CSAE risk on the App, including:</p>
        <ul>
          <li>
            Minimum age of {LEGAL.minimumAge} communicated in signup, Terms of Service, and Privacy
            Policy.
          </li>
          <li>
            In-app reporting tools so users can flag posts, profiles, and other content for review
            (including reasons related to illegal or harmful content).
          </li>
          <li>User block controls in community and matrimony features.</li>
          <li>
            Admin moderation queues for reviewing reported community content and matrimony safety
            signals.
          </li>
          <li>
            Enforcement actions such as content takedown, account restriction, and permanent bans
            for confirmed violations.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. How to report child safety concerns</h2>
        <p>
          If you see content or behaviour that may involve the exploitation or endangerment of a
          child, report it immediately:
        </p>
        <ul>
          <li>
            <strong>In the App:</strong> use the report option on the post, profile, or chat (where
            available), and include as much detail as possible.
          </li>
          <li>
            <strong>Email (CSAM / child safety):</strong>{" "}
            <a href={`mailto:${csamContact.email}`} className="text-primary font-medium underline">
              {csamContact.email}
            </a>
          </li>
          <li>
            <strong>General support:</strong>{" "}
            <a href={`mailto:${support.email}`} className="text-primary font-medium underline">
              {support.email}
            </a>{" "}
            or call{" "}
            <a href={support.phoneTel} className="text-primary font-medium underline">
              {support.phoneDisplay}
            </a>
          </li>
        </ul>
        <p>
          Please do <strong>not</strong> forward CSAM files to us unless a competent authority or
          lawful process specifically requires it. Describe the location of the content in the App
          (URL, username, post ID, screenshots of the interface without illegal imagery) so we can
          find and remove it.
        </p>
      </section>

      <section>
        <h2>6. Response and escalation</h2>
        <p>When we receive a credible child-safety report, we aim to:</p>
        <ul>
          <li>Prioritise review of the report ahead of routine moderation queues.</li>
          <li>Remove violating content and restrict or ban the responsible account(s).</li>
          <li>
            Preserve relevant records as needed for law-enforcement requests and our own compliance
            obligations.
          </li>
          <li>
            Report to regional or national authorities where required by applicable law (including
            Indian law and any other jurisdictions that apply to our operations).
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Law-enforcement and authority reporting</h2>
        <p>
          We comply with applicable child-safety laws. Where legally required, we report CSAM and
          related offences to the appropriate authorities. In India, this may include mechanisms such
          as reporting through the National Cyber Crime Reporting Portal (
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium underline"
          >
            cybercrime.gov.in
          </a>
          ) and cooperation with law-enforcement agencies.
        </p>
        <p>
          Users who encounter CSAM online are also encouraged to report it directly to local
          authorities and to{" "}
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium underline"
          >
            cybercrime.gov.in
          </a>
          .
        </p>
      </section>

      <section>
        <h2>8. Designated point of contact</h2>
        <p>
          The designated point of contact for questions about {LEGAL.appName}&apos;s CSAM prevention
          practices and child-safety compliance is:
        </p>
        <ul>
          <li>
            <strong>Name / role:</strong> {csamContact.name}
          </li>
          <li>
            <strong>Email:</strong>{" "}
            <a href={`mailto:${csamContact.email}`} className="text-primary font-medium underline">
              {csamContact.email}
            </a>
          </li>
          <li>
            <strong>Organisation:</strong> {LEGAL.orgName}
          </li>
          <li>
            <strong>Address:</strong> {support.addressOneLine}
          </li>
          <li>
            <strong>Phone:</strong>{" "}
            <a href={support.phoneTel} className="text-primary font-medium underline">
              {support.phoneDisplay}
            </a>
          </li>
          <li>
            <strong>Office hours:</strong> {support.officeHours}
          </li>
        </ul>
      </section>

      <section>
        <h2>9. Related policies</h2>
        <ul>
          <li>
            <Link to={LEGAL.urls.terms} className="text-primary font-medium underline">
              Terms of Service
            </Link>
          </li>
          <li>
            <Link to={LEGAL.urls.privacy} className="text-primary font-medium underline">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link to={LEGAL.urls.help} className="text-primary font-medium underline">
              Help Center
            </Link>
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Updates</h2>
        <p>
          We may update these Child Safety Standards from time to time. The &ldquo;Last
          updated&rdquo; date at the top of this page reflects the latest revision. Continued use of
          the App after changes take effect constitutes awareness of the revised standards where
          permitted by law.
        </p>
      </section>
    </LegalPage>
  );
}
