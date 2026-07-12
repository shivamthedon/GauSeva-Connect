import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Shield, Users, AlertCircle, ArrowLeft, Heart } from 'lucide-react';

type Tab = 'terms' | 'privacy' | 'guidelines' | 'disclaimer';

const LAST_UPDATED = '10 July 2026';
const SITE_NAME = 'GauSeva Connect';
const SITE_URL = 'https://gauseva-connect.pages.dev';
const CONTACT_PATH = '/contact';

export function LegalPage() {
  const { tabId } = useParams<{ tabId: string }>();
  const activeTab = (['terms', 'privacy', 'guidelines', 'disclaimer'].includes(tabId || '')
    ? tabId
    : 'terms') as Tab;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="space-y-2">
      <h4 className="text-base font-bold text-slate-900 tracking-tight">{title}</h4>
      <div className="text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
    </section>
  );

  const List = ({ items }: { items: string[] }) => (
    <ul className="list-disc pl-5 space-y-1.5 marker:text-[#800000]/70">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'terms':
        return (
          <div className="space-y-7">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1">
                Terms &amp; Conditions
              </h3>
              <p className="text-xs text-slate-400 font-medium">Last updated: {LAST_UPDATED}</p>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                These Terms govern your use of <strong className="text-slate-800">{SITE_NAME}</strong>{' '}
                ({SITE_URL}), a community platform for listing, discovering, adopting, and ethically
                exchanging indigenous gaumata (cattle), and related services such as profiles,
                verification, support tickets, and contact messages.
              </p>
            </div>

            <Section title="1. Acceptance of Terms">
              <p>
                By creating an account, browsing listings, posting content, or otherwise using{' '}
                {SITE_NAME}, you confirm that you have read and agree to these Terms, our Privacy
                Policy, Community Guidelines, and Disclaimer. If you do not agree, do not use the
                platform.
              </p>
            </Section>

            <Section title="2. About the Platform">
              <p>
                {SITE_NAME} is a digital marketplace and community hub operated as a web application
                (including Cloudflare-hosted pages and related APIs). We help users:
              </p>
              <List
                items={[
                  'Browse and post gaumata listings for adoption or sale',
                  'Complete onboarding and maintain a user profile',
                  'Optionally request identity verification (ID proof and selfie)',
                  'Save favourites/watchlist (stored on your device)',
                  'Rate and comment on listings where enabled',
                  'Report content, open support tickets, and send contact messages',
                ]}
              />
              <p>
                We may also surface related community categories (for example gaushalas, transport,
                veterinary contacts, sponsorships, or emergency alerts) as those features are
                available.
              </p>
            </Section>

            <Section title="3. Eligibility & Accounts">
              <p>
                You must be at least <strong className="text-slate-800">18 years old</strong> and
                capable of forming a binding contract under applicable Indian law. You agree to:
              </p>
              <List
                items={[
                  'Provide accurate registration and profile details (name, email, phone, address, city, state, pincode as requested)',
                  'Keep your login credentials confidential (email/password via Firebase Authentication)',
                  'Not share your account or impersonate another person or organisation',
                  'Notify us promptly of unauthorised access to your account',
                ]}
              />
              <p>
                We may suspend or terminate accounts that provide false information, abuse the
                platform, or violate these Terms.
              </p>
            </Section>

            <Section title="4. Marketplace Role (Important)">
              <p>
                {SITE_NAME} is a <strong className="text-slate-800">technology intermediary</strong>.
                We do not own, possess, breed, transport, or sell gaumata. Listings are created by
                users. Any adoption, sale, gift, sponsorship, or handover is a private arrangement
                between the parties involved. We are not a party to those transactions and do not
                guarantee payment, delivery, health, pedigree, or ownership of any animal.
              </p>
            </Section>

            <Section title="5. Listings & Content You Post">
              <p>When you create a listing or upload content, you represent that:</p>
              <List
                items={[
                  'You have lawful authority to list the gaumata (owner or authorised agent)',
                  'Details (breed, age, location, milking status, price, photos, description) are truthful to the best of your knowledge',
                  'Photos and documents you upload do not infringe others’ rights',
                  'Contact details you share are correct so interested users can reach you',
                  'You will not list animals for slaughter, smuggling, illegal trade, or cruelty',
                ]}
              />
              <p>
                You grant {SITE_NAME} a non-exclusive, worldwide, royalty-free licence to host,
                display, and distribute your content solely to operate and promote the platform
                (including public listing pages and previews).
              </p>
            </Section>

            <Section title="6. Identity Verification">
              <p>
                Optional identity verification may require government ID proof and a selfie. Submitting
                documents does not guarantee approval. Verification is a trust signal only; it does
                not guarantee character, ownership of animals, or transaction success. Admins may
                approve, reject, or revoke verification at their discretion.
              </p>
            </Section>

            <Section title="7. Prohibited Conduct">
              <List
                items={[
                  'Any activity related to slaughter, meat trade, illegal cattle transport, or animal abuse',
                  'Fraudulent, duplicate, or spam listings; bait-and-switch pricing',
                  'Harassment, hate speech, threats, or scams against other users',
                  'Uploading malware, scraping, reverse engineering, or attacking our systems',
                  'Collecting other users’ personal data for spam or resale',
                  'Circumventing bans, suspensions, or security controls',
                  'Using the platform for any unlawful purpose under Indian law',
                ]}
              />
            </Section>

            <Section title="8. Moderation, Reports & Enforcement">
              <p>
                Users may report listings and open support tickets. Administrators may edit, feature,
                hide, or remove content; ban or delete accounts; and take other actions needed to
                protect the community and animals. We are not obligated to take action on every
                report, but we may act immediately for serious violations without prior notice.
              </p>
            </Section>

            <Section title="9. Payments">
              <p>
                Unless explicitly stated otherwise, {SITE_NAME} does not process payments for
                animal sales or adoptions. Any money exchanged (including UPI or bank transfers
                mentioned by users for sponsorships) is between users. We are not responsible for
                failed payments, refunds, or payment fraud between parties.
              </p>
            </Section>

            <Section title="10. Intellectual Property">
              <p>
                The {SITE_NAME} name, branding, interface design, and original platform content are
                owned by the platform operators. You may not copy or reuse them without permission,
                except for personal non-commercial use of the public website.
              </p>
            </Section>

            <Section title="11. Suspension & Termination">
              <p>
                We may suspend or permanently ban accounts that violate these Terms, Community
                Guidelines, or applicable law. You may stop using the platform at any time. Upon
                termination, your right to access the service ends; we may retain certain records as
                described in the Privacy Policy (including for safety, legal, and audit purposes).
              </p>
            </Section>

            <Section title="12. Changes to the Service & Terms">
              <p>
                We may update features, these Terms, or related policies. Material changes will be
                reflected by updating the “Last updated” date on this page. Continued use after
                changes means you accept the revised Terms.
              </p>
            </Section>

            <Section title="13. Governing Law">
              <p>
                These Terms are governed by the laws of India. Courts in India shall have exclusive
                jurisdiction, subject to any mandatory consumer protections that apply to you.
              </p>
            </Section>

            <Section title="14. Contact">
              <p>
                For questions about these Terms, use the{' '}
                <Link to={CONTACT_PATH} className="text-[#800000] font-semibold hover:underline">
                  Contact
                </Link>{' '}
                page on {SITE_NAME}, or reach out through support tickets if you are signed in.
              </p>
            </Section>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-7">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1">
                Privacy Policy
              </h3>
              <p className="text-xs text-slate-400 font-medium">Last updated: {LAST_UPDATED}</p>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                This Privacy Policy explains how <strong className="text-slate-800">{SITE_NAME}</strong>{' '}
                collects, uses, stores, and shares information when you use our website and related
                services at {SITE_URL}.
              </p>
            </div>

            <Section title="1. Who We Are">
              <p>
                {SITE_NAME} is a web platform for the gaumata / cow-protection community in India.
                Our service is delivered via modern cloud infrastructure (including Cloudflare Pages
                for hosting and APIs, Cloudflare D1 for data storage, Cloudflare R2 for media, and
                Firebase Authentication for sign-in).
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <p><strong className="text-slate-800">Account & profile data</strong></p>
              <List
                items={[
                  'Email address and password (authentication handled by Firebase)',
                  'Display name and profile photo (if provided)',
                  'Onboarding details: mobile number, full address, pincode, state, and city',
                  'Account flags such as onboarded status, verification status, or ban status (admin-managed)',
                ]}
              />
              <p className="pt-1"><strong className="text-slate-800">Listings & community content</strong></p>
              <List
                items={[
                  'Listing details (title, breed, age, location, type adopt/sell, price, description, milking status, yield, etc.)',
                  'Images and files you upload (stored in cloud object storage)',
                  'Seller/contact name and phone number shown on listings',
                  'Reviews, comments, reports, support tickets, and contact-form messages',
                ]}
              />
              <p className="pt-1"><strong className="text-slate-800">Identity verification (optional)</strong></p>
              <List
                items={[
                  'ID type (for example Aadhaar, PAN, Voter ID, Driving Licence, Passport)',
                  'Uploaded ID document and selfie images for manual admin review',
                ]}
              />
              <p className="pt-1"><strong className="text-slate-800">Technical & usage data</strong></p>
              <List
                items={[
                  'IP address, browser/device information, and basic request logs as processed by our hosting provider',
                  'Security challenges (for example Cloudflare Turnstile) where enabled',
                  'Local device data such as watchlist/favourites stored in your browser’s local storage',
                ]}
              />
            </Section>

            <Section title="3. How We Use Information">
              <List
                items={[
                  'Create and secure your account; keep you signed in',
                  'Show and manage marketplace listings and related community features',
                  'Enable contact between interested users and listing owners',
                  'Run identity verification and admin moderation',
                  'Respond to support tickets and contact form messages',
                  'Prevent fraud, abuse, spam, and illegal activity',
                  'Improve reliability, performance, and user experience',
                  'Comply with legal obligations',
                ]}
              />
            </Section>

            <Section title="4. How Information Is Shared">
              <p>We do <strong className="text-slate-800">not sell</strong> your personal data for advertising lists.</p>
              <List
                items={[
                  'Public / other users: Listing content you publish (including name and phone when you include them) is visible to visitors so they can contact you about gaumata.',
                  'Service providers: Firebase (auth), Cloudflare (hosting, database, file storage, security), and similar infrastructure providers process data to run the service.',
                  'Administrators: Platform admins can access user profiles, listings, reports, tickets, contact messages, verification documents, and audit logs to moderate the community.',
                  'Legal & safety: We may disclose information if required by law or to protect users, animals, or the platform from serious harm or crime (including suspected illegal cattle trade or cruelty).',
                ]}
              />
            </Section>

            <Section title="5. Cookies & Local Storage">
              <p>
                We use browser local storage for features such as your watchlist and admin session
                tokens (for administrators only). Essential hosting/security cookies or similar
                technologies may be used by Cloudflare or Firebase. You can clear site data in your
                browser, which may reset preferences like favourites.
              </p>
            </Section>

            <Section title="6. Data Retention">
              <p>
                We retain account, listing, and moderation data for as long as needed to operate the
                platform and for legitimate safety, dispute, and legal reasons. If an admin deletes a
                user account, associated content may be removed or restricted, and a record may be
                kept to prevent re-registration abuse. Verification documents are retained for
                review and security purposes until no longer needed.
              </p>
            </Section>

            <Section title="7. Data Security">
              <p>
                We use industry-standard protections appropriate to a modern web app (HTTPS,
                authenticated APIs, access-controlled admin tools, and cloud security features).
                No method of transmission or storage is 100% secure. Please use a strong unique
                password and do not share sensitive documents outside the intended verification flow.
              </p>
            </Section>

            <Section title="8. Your Choices & Rights">
              <List
                items={[
                  'Update profile information from your account settings where available',
                  'Delete listings you own (subject to platform rules)',
                  'Contact us to request correction or deletion of personal data, subject to legal and safety exceptions',
                  'Stop using the service and request account closure via Contact or support tickets',
                ]}
              />
              <p>
                Depending on applicable Indian law (including the Digital Personal Data Protection
                Act, 2023, as it applies), you may have rights to access, correction, and erasure.
                We will respond to reasonable requests within a practical timeframe.
              </p>
            </Section>

            <Section title="9. Children’s Privacy">
              <p>
                {SITE_NAME} is not directed at children under 18. We do not knowingly collect
                personal data from minors. If you believe a minor has registered, contact us so we
                can take appropriate action.
              </p>
            </Section>

            <Section title="10. International Processing">
              <p>
                Infrastructure providers may process data in data centres inside or outside India.
                By using the service, you understand that your information may be processed in
                jurisdictions where our service providers operate, under their respective
                safeguards.
              </p>
            </Section>

            <Section title="11. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. The “Last updated” date at the
                top will change when we do. Continued use of {SITE_NAME} after an update means you
                accept the revised policy.
              </p>
            </Section>

            <Section title="12. Contact">
              <p>
                Privacy questions or data requests:{' '}
                <Link to={CONTACT_PATH} className="text-[#800000] font-semibold hover:underline">
                  Contact page
                </Link>
                .
              </p>
            </Section>
          </div>
        );

      case 'guidelines':
        return (
          <div className="space-y-7">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1">
                Community Guidelines
              </h3>
              <p className="text-xs text-slate-400 font-medium">Last updated: {LAST_UPDATED}</p>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                {SITE_NAME} exists for compassionate gaumata welfare, ethical rehoming, and seva.
                These guidelines keep the community safe, honest, and respectful.
              </p>
            </div>

            <Section title="1. Welfare Comes First">
              <p>
                Every listing and conversation should prioritise the animal’s wellbeing. Adoption and
                ethical care come before profit. Cruelty, neglect, or intent to harm gaumata is never
                acceptable and will lead to permanent bans and, where appropriate, reporting to
                authorities.
              </p>
            </Section>

            <Section title="2. Be Honest in Listings">
              <List
                items={[
                  'Use clear photos of the actual animal (not stock images of another animal)',
                  'State breed, age, location, health, temperament, and milking status accurately',
                  'If selling, show a fair price; if adoption, do not disguise sale as free adoption',
                  'Disclose known medical issues, injuries, or special care needs',
                  'Do not repost the same animal repeatedly to spam the feed',
                ]}
              />
            </Section>

            <Section title="3. Legal & Ethical Boundaries">
              <List
                items={[
                  'No slaughter, meat trade, smuggling, or illegal interstate cattle transport schemes',
                  'No fake “rescue” listings used to collect money fraudulently',
                  'Follow local laws regarding cattle ownership, movement, and sale in your state',
                  'Do not request or share others’ private documents outside official verification',
                ]}
              />
            </Section>

            <Section title="4. Respectful Communication">
              <List
                items={[
                  'Speak politely with farmers, gaushala volunteers, adopters, and devotees',
                  'No abuse, casteist/religious hate, threats, or sexual harassment',
                  'Do not pressure people into quick deals; allow time for genuine visits and checks',
                  'Keep phone and WhatsApp conversations civil after connecting from a listing',
                ]}
              />
            </Section>

            <Section title="5. Meetings, Transport & Safety">
              <List
                items={[
                  'Prefer meeting in safe, public, or known farm/gaushala locations',
                  'Consider a veterinary check before finalising adoption or purchase',
                  'Do not share OTPs, banking passwords, or Aadhaar numbers with strangers',
                  'Be cautious of advance payment scams; use common sense for any money transfer',
                ]}
              />
            </Section>

            <Section title="6. Verification Badge">
              <p>
                A verified badge means identity documents were reviewed by admins. It does{' '}
                <strong className="text-slate-800">not</strong> guarantee animal quality, ownership
                paperwork, or that a person is free of all risk. Always verify offline for important
                decisions.
              </p>
            </Section>

            <Section title="7. Reviews, Comments & Reports">
              <List
                items={[
                  'Leave fair, experience-based reviews — no fake ratings or revenge spam',
                  'Use Report for scams, abuse, illegal intent, or misleading listings',
                  'Use Support Tickets for account or technical issues',
                  'Do not misuse reporting to harass honest sellers or adopters',
                ]}
              />
            </Section>

            <Section title="8. What Happens If You Break the Rules">
              <p>Depending on severity, we may:</p>
              <List
                items={[
                  'Remove or edit content',
                  'Warn your account',
                  'Temporarily or permanently ban you',
                  'Delete your account and related content',
                  'Preserve evidence and cooperate with law enforcement for serious offences',
                ]}
              />
            </Section>

            <Section title="9. Build the Seva Culture">
              <p>
                Share knowledge kindly. Help first-time adopters understand care, feed, shelter, and
                veterinary needs. Celebrate indigenous breeds and responsible gaushala work. Together
                we uphold: <em>गावो विश्वस्य मातरः</em> — cows are the mothers of the universe.
              </p>
            </Section>
          </div>
        );

      case 'disclaimer':
        return (
          <div className="space-y-7">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1">
                Disclaimer
              </h3>
              <p className="text-xs text-slate-400 font-medium">Last updated: {LAST_UPDATED}</p>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                Please read this Disclaimer carefully. It limits the liability of{' '}
                <strong className="text-slate-800">{SITE_NAME}</strong> regarding your use of the
                platform.
              </p>
            </div>

            <Section title="1. Platform Provided “As Is”">
              <p>
                {SITE_NAME} and all related services are provided on an “as is” and “as available”
                basis. We do not warrant uninterrupted, error-free, or virus-free operation. Features
                may change, break, or be withdrawn without notice.
              </p>
            </Section>

            <Section title="2. Not a Veterinary, Legal, or Financial Service">
              <p>
                Nothing on {SITE_NAME} is professional veterinary advice, legal advice, or financial
                advice. Always consult qualified professionals for animal health, ownership
                documentation, transport permissions, and contracts.
              </p>
            </Section>

            <Section title="3. User-Generated Content">
              <p>
                Listings, photos, prices, claims about milk yield, breed purity, health status, and
                contact details are provided by users. We do not independently inspect every animal
                or farm. Featured or verified status does not mean we guarantee the accuracy of a
                listing or the outcome of any deal.
              </p>
            </Section>

            <Section title="4. Transactions Are Between Users">
              <p>
                {SITE_NAME} is not a broker, escrow agent, courier, or guarantor. We are not
                responsible for:
              </p>
              <List
                items={[
                  'Non-payment, overpayment, or advance-fee fraud',
                  'Animals that do not match photos or descriptions',
                  'Illness, injury, death, or temperament issues after transfer',
                  'Transport accidents or illegal movement of cattle',
                  'Disputes over ownership, dowry of cattle, or family/farm conflicts',
                ]}
              />
              <p>You should perform your own due diligence before any adoption or purchase.</p>
            </Section>

            <Section title="5. Third-Party Services">
              <p>
                Sign-in, hosting, storage, and security rely on third-party providers (including
                Firebase and Cloudflare). Outages, data processing practices, or failures of those
                providers are outside our full control. Your use of linked external sites is at your
                own risk.
              </p>
            </Section>

            <Section title="6. Limitation of Liability">
              <p>
                To the maximum extent permitted by law, {SITE_NAME}, its operators, developers, and
                affiliates shall not be liable for any indirect, incidental, special, consequential,
                exemplary, or punitive damages, or for loss of profits, data, goodwill, animals, or
                business opportunities arising from your use of (or inability to use) the platform.
              </p>
              <p>
                Where liability cannot be excluded, it shall be limited to the greater of (a) the
                amount you paid us for the service in the three months before the claim (if any), or
                (b) INR 1,000.
              </p>
            </Section>

            <Section title="7. Indemnity">
              <p>
                You agree to indemnify and hold harmless {SITE_NAME} and its operators from claims,
                damages, losses, and expenses (including reasonable legal fees) arising from your
                content, your transactions with other users, your violation of these terms or laws,
                or your misuse of the platform.
              </p>
            </Section>

            <Section title="8. No Waiver of Animal Protection Laws">
              <p>
                Nothing in this Disclaimer permits illegal treatment of animals. Users remain fully
                responsible for compliance with the Prevention of Cruelty to Animals Act, state cattle
                protection laws, and all other applicable regulations.
              </p>
            </Section>

            <Section title="9. Contact">
              <p>
                Questions about this Disclaimer:{' '}
                <Link to={CONTACT_PATH} className="text-[#800000] font-semibold hover:underline">
                  Contact {SITE_NAME}
                </Link>
                .
              </p>
            </Section>
          </div>
        );

      default:
        return null;
    }
  };

  const nav: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'terms', label: 'Terms & Conditions', icon: <FileText className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy Policy', icon: <Shield className="w-4 h-4" /> },
    { id: 'guidelines', label: 'Community Guidelines', icon: <Users className="w-4 h-4" /> },
    { id: 'disclaimer', label: 'Disclaimer', icon: <AlertCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="gs-page-bg min-h-screen font-sans">
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80 shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-[#800000] via-amber-500 to-[#800000]" />
        <div className="gs-container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-[#800000] font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#800000] to-[#c2410c] flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">Legal</span>
          </div>
          <Link to="/contact" className="text-xs font-semibold text-slate-500 hover:text-[#800000]">
            Contact
          </Link>
        </div>
      </header>

      <main className="gs-container py-8 max-w-5xl">
        <div className="gs-card overflow-hidden flex flex-col md:flex-row">
          <aside className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-4 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">
              Policies
            </p>
            <nav className="flex flex-row md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {nav.map((item) => (
                <Link
                  key={item.id}
                  to={`/legal/${item.id}`}
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                    activeTab === item.id
                      ? 'bg-[#800000] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
                  }`}
                >
                  <span className={activeTab === item.id ? 'text-white/80' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <div className="flex-1 p-6 md:p-8 bg-white">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
