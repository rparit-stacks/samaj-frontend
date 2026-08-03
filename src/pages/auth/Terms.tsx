import { Link } from "react-router-dom";
import { LegalPage } from "@/components/auth/LegalPage";
import { LEGAL } from "@/lib/legalConfig";

export default function Terms() {
  const { support } = LEGAL;

  return (
    <LegalPage title="Terms of Service" updated={LEGAL.lastUpdated}>
      <section>
        <h2>1. Acceptance of terms</h2>
        <p>
          By creating an account or using the {LEGAL.appName} app or website (&quot;the App&quot;),
          you agree to these Terms of Service and our{" "}
          <Link to={LEGAL.urls.privacy} className="text-primary font-medium underline">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the App.
        </p>
      </section>

      <section>
        <h2>2. Who can use Samaj</h2>
        <p>
          The App is intended for members of the Suryavanshi Samaj community and their families. You
          must be at least <strong>{LEGAL.minimumAge} years old</strong> to create an account. You
          must provide accurate information when registering and keep your login credentials
          confidential.
        </p>
      </section>

      <section>
        <h2>3. Your account</h2>
        <ul>
          <li>
            You must be the rightful owner of the email, phone number, and any Google account used
            to register.
          </li>
          <li>You are responsible for all activity under your account.</li>
          <li>
            We may suspend or terminate accounts that violate these Terms, provide false
            information, or are used for abuse, harassment, fraud, or illegal activity.
          </li>
          <li>
            You may delete your account at any time as described in our{" "}
            <Link to={LEGAL.urls.deleteAccount} className="text-primary font-medium underline">
              Account Deletion
            </Link>{" "}
            page.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Community conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            Post false, defamatory, harassing, hateful, obscene, or abusive content in feed, chat,
            events, gallery, or matrimony sections.
          </li>
          <li>
            Misrepresent your identity, age, or marital status — especially in matrimony profiles.
          </li>
          <li>Use the emergency-help feature for non-genuine requests.</li>
          <li>Upload content that infringes others&apos; intellectual property or privacy.</li>
          <li>
            Attempt to access other members&apos; accounts or non-public data without authorisation.
          </li>
          <li>Scrape, spam, or disrupt the App&apos;s infrastructure.</li>
        </ul>
      </section>

      <section>
        <h2>5. Matrimony section</h2>
        <p>
          The matrimony feature helps community members connect for matrimonial purposes.{" "}
          {LEGAL.orgName} does not verify every claim in a matrimony profile and is not responsible
          for the accuracy of user-provided information, or for the outcome of any introduction,
          match, or relationship. Exercise your own judgment and diligence before sharing personal
          information or meeting anyone in person.
        </p>
      </section>

      <section>
        <h2>6. Donations &amp; payments</h2>
        <p>
          Where the App facilitates donations or paid listings, payments are processed by
          third-party payment providers. You agree to provide accurate payment information.
          Donations are generally non-refundable except as required by law or as stated at the time
          of payment. Payment disputes should first be raised with us at{" "}
          <a href={`mailto:${support.email}`} className="text-primary font-medium underline">
            {support.email}
          </a>
          .
        </p>
      </section>

      <section>
        <h2>7. User-generated content</h2>
        <p>
          You retain ownership of content you post (photos, posts, profiles, documents). By posting,
          you grant {LEGAL.orgName} a limited, worldwide, royalty-free licence to host, display, and
          distribute that content within the App to the audience you select, and to admins for
          moderation and safety.
        </p>
      </section>

      <section>
        <h2>8. Moderation</h2>
        <p>
          Community admins and sub-admins may review, hide, or remove content that violates these
          Terms, and may suspend or terminate accounts to protect the community.
        </p>
      </section>

      <section>
        <h2>9. Third-party services</h2>
        <p>
          The App may integrate Google Sign-In, push notification services, cloud hosting, and
          payment gateways. Your use of those services may also be subject to their own terms and
          privacy policies.
        </p>
      </section>

      <section>
        <h2>10. Disclaimer of warranties</h2>
        <p>
          The App is provided &quot;as is&quot; and &quot;as available&quot;. To the fullest extent
          permitted by law, we disclaim warranties of uninterrupted availability, fitness for a
          particular purpose, and non-infringement. We are not liable for decisions made based on
          information in the directory, matrimony, jobs, or business listing sections.
        </p>
      </section>

      <section>
        <h2>11. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, {LEGAL.orgName} and its officers, volunteers, and
          developers shall not be liable for indirect, incidental, special, consequential, or
          punitive damages arising from your use of the App. Our total liability for any claim
          relating to the App shall not exceed the amount you paid us (if any) in the twelve months
          preceding the claim.
        </p>
      </section>

      <section>
        <h2>12. Governing law</h2>
        <p>
          These Terms are governed by the laws of India. Courts in Indore, Madhya Pradesh shall have
          exclusive jurisdiction, subject to mandatory consumer protections that may apply.
        </p>
      </section>

      <section>
        <h2>13. Changes to these terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the App after changes take
          effect constitutes acceptance of the revised Terms where permitted by law.
        </p>
      </section>

      <section>
        <h2>14. Contact us</h2>
        <p>
          Questions about these Terms:
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
