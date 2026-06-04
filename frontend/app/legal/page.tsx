"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PolicyKey = "tnc" | "privacy" | "cookie" | "refund";

const POLICIES: Record<PolicyKey, { label: string; toc: { href: string; label: string }[] }> = {
  tnc: {
    label: "Terms & Conditions",
    toc: [
      { href: "#tnc-1",  label: "Definitions & Parties" },
      { href: "#tnc-2",  label: "Eligibility & Registration" },
      { href: "#tnc-3",  label: "Services & Features" },
      { href: "#tnc-4",  label: "Fees & Payments" },
      { href: "#tnc-5",  label: "Conduct & Prohibitions" },
      { href: "#tnc-6",  label: "Intellectual Property" },
      { href: "#tnc-7",  label: "Limitation of Liability" },
      { href: "#tnc-8",  label: "Termination" },
      { href: "#tnc-9",  label: "Governing Law" },
      { href: "#tnc-10", label: "Modifications" },
    ],
  },
  privacy: {
    label: "Privacy Policy",
    toc: [
      { href: "#priv-1", label: "Data We Collect" },
      { href: "#priv-2", label: "Purpose of Processing" },
      { href: "#priv-3", label: "Data Sharing" },
      { href: "#priv-4", label: "Retention Periods" },
      { href: "#priv-5", label: "Your Rights (DPDP)" },
      { href: "#priv-6", label: "Data Security" },
    ],
  },
  cookie: {
    label: "Cookie Policy",
    toc: [
      { href: "#cookie-1", label: "What Are Cookies?" },
      { href: "#cookie-2", label: "Cookie Categories" },
      { href: "#cookie-3", label: "Your Cookie Choices" },
      { href: "#cookie-4", label: "Cookie Consent" },
    ],
  },
  refund: {
    label: "Refund Policy",
    toc: [
      { href: "#refund-1", label: "Candidate Payments" },
      { href: "#refund-2", label: "Institutional Payments" },
      { href: "#refund-3", label: "Recruiter Earnings" },
      { href: "#refund-4", label: "Company Payments" },
      { href: "#refund-5", label: "Dispute Resolution" },
      { href: "#refund-6", label: "Contact & Grievance" },
    ],
  },
};

const HASH_TO_KEY: Record<string, PolicyKey> = {
  "#sec-tnc":     "tnc",
  "#sec-privacy": "privacy",
  "#sec-cookie":  "cookie",
  "#sec-refund":  "refund",
};

export default function LegalPage() {
  const router = useRouter();
  const [active, setActive]       = useState<PolicyKey>("tnc");
  const [scrollPct, setScrollPct] = useState(0);
  const [activeToc, setActiveToc] = useState("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Read hash on mount to determine initial tab
  useEffect(() => {
    const hash = window.location.hash;
    const key = HASH_TO_KEY[hash];
    if (key) setActive(key);

    const onHashChange = () => {
      const k = HASH_TO_KEY[window.location.hash];
      if (k) setActive(k);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Scroll progress bar
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      setScrollPct((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // TOC highlight via IntersectionObserver, reset when tab changes
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveToc("#" + e.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    document.querySelectorAll(".lp-article[id]").forEach((el) =>
      observerRef.current!.observe(el)
    );
    return () => observerRef.current?.disconnect();
  }, [active]);

  function showPolicy(key: PolicyKey) {
    setActive(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const toc = POLICIES[active].toc;

  return (
    <div className="lp-wrap">
      <div className="lp-progress-bar" style={{ width: `${scrollPct}%` }} />

      {/* ── Header ── */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-header-left">
            <button
              className="lp-back-btn"
              onClick={() => window.history.length > 1 ? router.back() : router.push("/")}
              aria-label="Go back"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back
            </button>
            <Link href="/" className="lp-logo">
              <div className="lp-logo-mark">D</div>
              <div>
                <div className="lp-logo-text">DiscoveHR</div>
                <div className="lp-logo-sub">by Ensynapse Technique</div>
              </div>
            </Link>
          </div>
          <div className="lp-header-badge">Legal Policies · v1.0 · June 2026</div>
        </div>
      </header>

      {/* ── Policy nav tabs ── */}
      <div className="lp-policy-nav">
        <div className="lp-policy-nav-inner">
          {(Object.keys(POLICIES) as PolicyKey[]).map((key) => (
            <button
              key={key}
              className={`lp-nav-btn${active === key ? " active" : ""}`}
              onClick={() => showPolicy(key)}
            >
              {POLICIES[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="lp-hero">
        <div className="lp-hero-eyebrow">Legal Documentation</div>
        <h1>Platform Policies<br />&amp; User Agreements</h1>
        <p>
          These documents govern your use of the DiscoveHR platform (discovehr.com), operated by
          Ensynapse Technique Pvt. Ltd. Please read them carefully before using the platform.
        </p>
        <div className="lp-hero-meta">
          <div className="lp-meta-item"><div className="lp-meta-dot" />Ensynapse Technique Pvt. Ltd., Kerala, India</div>
          <div className="lp-meta-item"><div className="lp-meta-dot" />CIN: [●] · GST: [●]</div>
          <div className="lp-meta-item"><div className="lp-meta-dot" />Effective: June 2026</div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="lp-content-wrap">

        {/* Sidebar TOC */}
        <aside className="lp-toc">
          <div className="lp-toc-label">Contents</div>
          {toc.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`lp-toc-item${activeToc === item.href ? " active" : ""}`}
            >
              {item.label}
            </a>
          ))}
        </aside>

        {/* Policy sections */}
        <main className="lp-policy-content">

          {/* ══════════════ TERMS & CONDITIONS ══════════════ */}
          <div className={`lp-policy-section${active === "tnc" ? " active" : ""}`} id="sec-tnc">
            <div className="lp-policy-header">
              <div className="lp-policy-tag">01 — Terms &amp; Conditions</div>
              <h1 className="lp-policy-title">Platform Terms of Use</h1>
              <p className="lp-policy-subtitle">
                These Terms govern all access to and use of the DiscoveHR platform by every category
                of user. By registering on or using discovehr.com, you agree to these Terms in full.
              </p>
              <div className="lp-policy-dates">
                <span className="lp-date-chip">Effective: 1 June 2026</span>
                <span className="lp-date-chip">Last Updated: June 2026</span>
                <span className="lp-date-chip">Jurisdiction: Kerala High Court, India</span>
              </div>
              <div className="lp-applies-to" style={{ marginTop: 16 }}>
                <span className="lp-pill lp-pill-candidate">Candidates</span>
                <span className="lp-pill lp-pill-tpo">Training &amp; Placement Officers</span>
                <span className="lp-pill lp-pill-recruiter">Freelance Recruiters / Interviewers</span>
                <span className="lp-pill lp-pill-company">Companies / Organisations</span>
              </div>
            </div>

            <div className="lp-article" id="tnc-1">
              <span className="lp-article-num">Article 1</span>
              <h2>Definitions and Parties</h2>
              <p><strong>&quot;Platform&quot;</strong> means the DiscoveHR web application and associated services accessible at discovehr.com, including all subdomains (portal.discovehr.com, learn.discovehr.com, challenges.discovehr.com).</p>
              <p><strong>&quot;Ensynapse&quot;</strong> or <strong>&quot;Company&quot;</strong> means Ensynapse Technique Pvt. Ltd., a private limited company incorporated under the Companies Act, 2013, with its registered office in Kerala, India.</p>
              <p><strong>&quot;User&quot;</strong> means any individual or entity accessing the Platform, in one or more of the following roles:</p>
              <div className="lp-stakeholder-block">
                <div className="lp-sb-header candidate">👨‍🎓 Candidate</div>
                <div className="lp-sb-body"><ul>
                  <li>A student, fresher, or early-career professional who registers to discover job opportunities, build a Placement Readiness Index (PRI) score, undertake XPrep assessments, and apply for roles posted on the Platform.</li>
                  <li>May be enrolled individually (self-pay) or through an institutional subscription managed by a TPO.</li>
                </ul></div>
              </div>
              <div className="lp-stakeholder-block">
                <div className="lp-sb-header tpo">🏫 Training &amp; Placement Officer (TPO)</div>
                <div className="lp-sb-body"><ul>
                  <li>A duly authorised representative of an educational institution (college, university, or polytechnic) who manages the institution&apos;s subscription, onboards students, and interfaces with the Platform on behalf of the institution.</li>
                  <li>The TPO accepts these Terms on behalf of both the institution and the students it enrolls, and is responsible for obtaining student consent.</li>
                </ul></div>
              </div>
              <div className="lp-stakeholder-block">
                <div className="lp-sb-header recruiter">🤝 Freelance Recruiter / Interviewer</div>
                <div className="lp-sb-body"><ul>
                  <li>An independent contractor registered on the Platform to conduct mock interviews, screening calls, and/or HR rounds for candidates or on behalf of client companies, and to earn commission-based fees.</li>
                  <li>Must hold a valid Genvarsity Certified Recruiter Programme (CRP) credential (or be in active supervised practicum) to access paid assignments.</li>
                </ul></div>
              </div>
              <div className="lp-stakeholder-block">
                <div className="lp-sb-header company">🏢 Company / Organisation</div>
                <div className="lp-sb-body"><ul>
                  <li>Any corporate entity, startup, or organisation that registers to post job opportunities, access PRI-ranked candidate shortlists, conduct campus drives, or procure managed recruitment or interview services.</li>
                </ul></div>
              </div>
            </div>

            <div className="lp-article" id="tnc-2">
              <span className="lp-article-num">Article 2</span>
              <h2>Eligibility and Account Registration</h2>
              <h3>2.1 General Eligibility</h3>
              <p>The Platform is available to individuals who are at least 18 years of age, or students who are at least 16 years of age with verifiable institutional enrollment. Use of the Platform by persons below these thresholds without institutional mediation (via a TPO) is not permitted.</p>
              <h3>2.2 Account Accuracy</h3>
              <p>All Users must provide accurate, current, and complete registration information. You are solely responsible for maintaining the confidentiality of your credentials and for all activity conducted under your account.</p>
              <h3>2.3 Institutional Accounts (TPO)</h3>
              <p>Institutions agree to use the Platform solely for legitimate educational and placement facilitation purposes. The TPO designee represents and warrants that they have authority to bind the institution to these Terms.</p>
              <h3>2.4 Company Accounts</h3>
              <p>Company representatives must be authorised employees or agents of the registered entity. Posting roles on behalf of entities other than your employer, or misrepresenting the nature of employment offered, constitutes a material breach of these Terms.</p>
              <h3>2.5 Recruiter / Interviewer Accounts</h3>
              <p>Freelance Recruiters and Interviewers are independent contractors, not employees of Ensynapse. Registration, practicum completion, and CRP certification are prerequisites before access to paid assignments is granted.</p>
            </div>

            <div className="lp-article" id="tnc-3">
              <span className="lp-article-num">Article 3</span>
              <h2>Platform Services and Features</h2>
              <h3>3.1 Core Services</h3>
              <table className="lp-policy-table">
                <thead><tr><th>Service</th><th>Available To</th><th>Access Model</th></tr></thead>
                <tbody>
                  <tr><td><strong>Job Discovery &amp; Application</strong></td><td>Candidates</td><td>Institutional or self-pay subscription</td></tr>
                  <tr><td><strong>PRI Score</strong></td><td>Candidates</td><td>Generated via XPrep assessments; gate for job applications</td></tr>
                  <tr><td><strong>XPrep Assessments</strong></td><td>Candidates</td><td>Included in subscription; platform-delivered</td></tr>
                  <tr><td><strong>Mock Interviews</strong></td><td>Candidates (paid); Recruiters (earn)</td><td>Marketplace booking on Platform</td></tr>
                  <tr><td><strong>Campus Drive Management</strong></td><td>TPOs, Companies</td><td>Free for Companies; institutional subscription for TPOs</td></tr>
                  <tr><td><strong>Managed Recruitment</strong></td><td>Companies, Recruiters</td><td>Outcome-based commercial agreement</td></tr>
                  <tr><td><strong>Grand AI Challenge (GAIC)</strong></td><td>Candidates</td><td>₹199 certificate; open registration</td></tr>
                  <tr><td><strong>DCAT Psychometric Assessment</strong></td><td>Recruiters (intake)</td><td>Part of CRP process</td></tr>
                </tbody>
              </table>
              <h3>3.2 PRI as a Gating Mechanism</h3>
              <p>Candidates must have a live, valid PRI score to apply for job roles on the Platform. The PRI is generated through XPrep assessments and refreshed on completion of subsequent modules.</p>
              <h3>3.3 Company Access — Free Tier</h3>
              <p>Companies may register and post jobs, access PRI-ranked shortlists, schedule campus drives, and use the Assessment Studio at no charge.</p>
              <div className="lp-callout lp-callout-info">
                Certain platform components are powered by third-party open-source software. Ensynapse Technique Pvt. Ltd. operates these as a managed service and remains the sole data fiduciary for all personal data processed through the Platform.
              </div>
            </div>

            <div className="lp-article" id="tnc-4">
              <span className="lp-article-num">Article 4</span>
              <h2>Fees, Payments, and Billing</h2>
              <h3>4.1 Institutional Subscriptions (Colleges)</h3>
              <p>Platform access for institutions is subject to a one-time setup fee and an annual per-student access fee as agreed in the institution&apos;s subscription agreement (typically ₹25,000 setup + ₹999/student/year from Year 2).</p>
              <h3>4.2 Candidate Self-Pay</h3>
              <p>Individual candidates not covered by an institutional subscription may subscribe at ₹1,000 per year for full platform access. Payments are processed via Razorpay.</p>
              <h3>4.3 Freelance Recruiter / Interviewer Earnings</h3>
              <p>Earnings are governed by the Freelance Recruiter Independent Contractor Agreement entered into separately. Indicative fee structures: ₹200–300 for screening rounds, ₹350–500 for HR rounds, and up to ₹10,000 for specialised domain assessments.</p>
              <h3>4.4 All Fees are Exclusive of GST</h3>
              <p>All published prices are exclusive of applicable Goods and Services Tax (GST). GST will be charged at the rate applicable at the time of transaction.</p>
            </div>

            <div className="lp-article" id="tnc-5">
              <span className="lp-article-num">Article 5</span>
              <h2>Conduct and Prohibited Activities</h2>
              <p>Users agree not to:</p>
              <ul>
                <li>Submit false, misleading, or fabricated profiles, credentials, or information;</li>
                <li>Impersonate any person, institution, or company;</li>
                <li>Harvest, scrape, or systematically extract candidate or company data;</li>
                <li>Post discriminatory, unlawful, or abusive job descriptions or communications;</li>
                <li>Circumvent the PRI gate or any access-control mechanism;</li>
                <li>Use AI-generated content to deceive the Platform&apos;s assessment or verification systems;</li>
                <li>Conduct or solicit off-platform transactions that exploit introductions made through DiscoveHR;</li>
                <li>Upload malicious code, scripts, or any content that may damage Platform integrity;</li>
                <li>Share login credentials or allow third parties to use your account.</li>
              </ul>
              <div className="lp-callout lp-callout-danger">
                <strong>Recruiter-Specific Prohibition:</strong> Freelance Recruiters and Interviewers must not solicit or accept direct payments from candidates or companies for services rendered through the Platform. Breach results in immediate account termination and forfeiture of pending earnings.
              </div>
              <div className="lp-callout lp-callout-warn">
                <strong>Company-Specific Obligation:</strong> Companies posting roles must only post genuine vacancies. Ghost listings, salary misrepresentation, or roles used for data collection without genuine hiring intent constitute a material breach.
              </div>
            </div>

            <div className="lp-article" id="tnc-6">
              <span className="lp-article-num">Article 6</span>
              <h2>Intellectual Property</h2>
              <p>All platform software, the PRI algorithm, XPrep curriculum, DCAT psychometric instrument, assessment item banks, branding, and visual design are the exclusive intellectual property of Ensynapse Technique Pvt. Ltd. or its licensors.</p>
              <p>Users are granted a limited, non-exclusive, non-transferable, revocable licence to access the Platform solely for their registered purpose. No User acquires any ownership interest in Platform IP by virtue of using the service.</p>
              <p>Candidates retain ownership of content they submit (CVs, projects, portfolios) but grant Ensynapse a worldwide, royalty-free licence to display and process that content for the purpose of providing Platform services. This licence terminates when you delete your account.</p>
            </div>

            <div className="lp-article" id="tnc-7">
              <span className="lp-article-num">Article 7</span>
              <h2>Limitation of Liability and Disclaimers</h2>
              <div className="lp-callout lp-callout-info">
                <strong>Employment Outcomes:</strong> Ensynapse does not guarantee job placement, interview selection, offer issuance, or employment continuity for any Candidate. The Platform is a discovery and matching tool; outcomes depend on Candidate merit, market conditions, and Company hiring decisions.
              </div>
              <p>To the maximum extent permitted by applicable law, Ensynapse&apos;s aggregate liability to any User for any cause of action shall not exceed the fees paid by that User to Ensynapse in the three (3) calendar months preceding the claim.</p>
              <p>Ensynapse is not liable for: (a) losses arising from a Recruiter&apos;s or Interviewer&apos;s acts or omissions; (b) losses arising from a Company&apos;s hiring or rejection decisions; (c) indirect, consequential, or incidental damages of any kind; (d) service interruptions caused by force majeure, infrastructure providers, or third-party integrations.</p>
            </div>

            <div className="lp-article" id="tnc-8">
              <span className="lp-article-num">Article 8</span>
              <h2>Termination and Suspension</h2>
              <p>Ensynapse may suspend or terminate any account, without notice, for breach of these Terms, fraudulent activity, or where continued access poses a risk to the Platform or other Users. Upon termination:</p>
              <ul>
                <li><strong>Candidates:</strong> Access to the Platform, PRI scores, and assessment history will be restricted. Data export requests may be made within 30 days.</li>
                <li><strong>TPOs:</strong> All linked student accounts will be suspended. Outstanding fees remain due.</li>
                <li><strong>Recruiters:</strong> Pending escrow amounts for completed, verified milestones will be paid out within 30 days.</li>
                <li><strong>Companies:</strong> Active job listings will be removed. Data access to candidate shortlists will cease immediately.</li>
              </ul>
              <p>Users may also terminate their accounts voluntarily by submitting a written request to legal@discovehr.com.</p>
            </div>

            <div className="lp-article" id="tnc-9">
              <span className="lp-article-num">Article 9</span>
              <h2>Governing Law and Dispute Resolution</h2>
              <p>These Terms are governed by and construed in accordance with the laws of India, including the Information Technology Act, 2000, the Digital Personal Data Protection Act, 2023 (DPDP Act), and the Consumer Protection Act, 2019.</p>
              <p>All disputes shall be subject to the exclusive jurisdiction of the courts at Ernakulam, Kerala, India. Before initiating formal proceedings, parties agree to engage in a 30-day good-faith negotiation. Contact: legal@discovehr.com.</p>
            </div>

            <div className="lp-article" id="tnc-10">
              <span className="lp-article-num">Article 10</span>
              <h2>Modifications to Terms</h2>
              <p>Ensynapse reserves the right to amend these Terms at any time. Material changes will be communicated to registered Users via email and a platform notification not less than 15 days prior to the effective date. Continued use of the Platform after the effective date constitutes acceptance of the revised Terms.</p>
            </div>
          </div>
          {/* ══ END TERMS ══ */}

          {/* ══════════════ PRIVACY POLICY ══════════════ */}
          <div className={`lp-policy-section${active === "privacy" ? " active" : ""}`} id="sec-privacy">
            <div className="lp-policy-header">
              <div className="lp-policy-tag">02 — Privacy Policy</div>
              <h1 className="lp-policy-title">Privacy Policy &amp;<br />Data Processing Notice</h1>
              <p className="lp-policy-subtitle">
                Ensynapse Technique Pvt. Ltd. is committed to protecting your personal data in accordance with the Digital Personal Data Protection Act, 2023 (DPDP Act), and applicable Indian laws.
              </p>
              <div className="lp-policy-dates">
                <span className="lp-date-chip">Effective: 1 June 2026</span>
                <span className="lp-date-chip">Data Fiduciary: Ensynapse Technique Pvt. Ltd.</span>
                <span className="lp-date-chip">DPO Contact: privacy@discovehr.com</span>
              </div>
            </div>

            <div className="lp-article" id="priv-1">
              <span className="lp-article-num">Section 1</span>
              <h2>Data We Collect, By Stakeholder</h2>
              <div className="lp-stakeholder-block">
                <div className="lp-sb-header candidate">👨‍🎓 Candidates — Data Collected</div>
                <div className="lp-sb-body"><ul>
                  <li><strong>Identity:</strong> Full name, date of birth, email address, phone number, gender (optional).</li>
                  <li><strong>Academic:</strong> Institution name, course, graduation year, academic scores (CGPA/percentage).</li>
                  <li><strong>Career:</strong> CV/resume, skills, internship history, portfolio links, preferred job domains and locations.</li>
                  <li><strong>Assessment:</strong> XPrep scores, DCAT psychometric results (if applicable), Grand AI Challenge submissions, and aggregated PRI score.</li>
                  <li><strong>Behavioural:</strong> Login activity, page views, time spent on modules, application history, mock interview bookings.</li>
                  <li><strong>Device &amp; Technical:</strong> IP address, browser type, device fingerprint, session tokens.</li>
                </ul></div>
              </div>
              <div className="lp-stakeholder-block">
                <div className="lp-sb-header tpo">🏫 TPOs — Data Collected</div>
                <div className="lp-sb-body"><ul>
                  <li><strong>Identity:</strong> Name, official email, phone, designation, employee ID.</li>
                  <li><strong>Institutional:</strong> Institution name, address, NAAC grade, NIRF rank (if applicable).</li>
                  <li><strong>Operational:</strong> Subscription agreement details, student enrollment records, campus drive history, placement statistics.</li>
                </ul></div>
              </div>
              <div className="lp-stakeholder-block">
                <div className="lp-sb-header recruiter">🤝 Freelance Recruiters / Interviewers — Data Collected</div>
                <div className="lp-sb-body"><ul>
                  <li><strong>Identity:</strong> Name, email, phone, LinkedIn profile URL, PAN (for TDS compliance).</li>
                  <li><strong>Professional:</strong> Work experience, domain expertise, CRP certification status, DCAT psychometric results.</li>
                  <li><strong>Financial:</strong> Bank account / UPI details for earnings disbursement, earnings history, TDS records.</li>
                  <li><strong>Performance:</strong> Candidate ratings of interviews conducted, quality flags, dispute history.</li>
                </ul></div>
              </div>
              <div className="lp-stakeholder-block">
                <div className="lp-sb-header company">🏢 Companies — Data Collected</div>
                <div className="lp-sb-body"><ul>
                  <li><strong>Entity:</strong> Company name, CIN/GSTIN, registered address, website.</li>
                  <li><strong>Contact:</strong> Authorised representative name, email, phone, designation.</li>
                  <li><strong>Operational:</strong> Job postings, shortlist actions, drive schedules, assessment slot usage, managed recruitment contracts.</li>
                </ul></div>
              </div>
            </div>

            <div className="lp-article" id="priv-2">
              <span className="lp-article-num">Section 2</span>
              <h2>Lawful Basis and Purpose of Processing</h2>
              <table className="lp-policy-table">
                <thead><tr><th>Purpose</th><th>Lawful Basis</th><th>Applies To</th></tr></thead>
                <tbody>
                  <tr><td>Platform registration and authentication</td><td>Contractual necessity</td><td>All users</td></tr>
                  <tr><td>PRI computation and display to employers</td><td>Consent (at registration)</td><td>Candidates</td></tr>
                  <tr><td>Sharing candidate profiles with companies on application</td><td>Consent (per application)</td><td>Candidates, Companies</td></tr>
                  <tr><td>Processing payments and issuing tax invoices</td><td>Legal obligation / Contract</td><td>All paying users</td></tr>
                  <tr><td>TDS deduction and filing for recruiter earnings</td><td>Legal obligation (Income Tax Act)</td><td>Recruiters</td></tr>
                  <tr><td>NIRF-compatible placement reporting for institutions</td><td>Legitimate interest / Contract</td><td>TPOs, Institutions</td></tr>
                  <tr><td>Product analytics and platform improvement</td><td>Legitimate interest (anonymised)</td><td>All users</td></tr>
                  <tr><td>Marketing communications (optional)</td><td>Consent (opt-in)</td><td>All users</td></tr>
                </tbody>
              </table>
            </div>

            <div className="lp-article" id="priv-3">
              <span className="lp-article-num">Section 3</span>
              <h2>Data Sharing and Third Parties</h2>
              <p>We do not sell personal data. We share data only as follows:</p>
              <ul>
                <li><strong>Companies (on application):</strong> When a Candidate applies to a role, their profile (name, PRI score, CV, domain scores) is shared with that Company.</li>
                <li><strong>Assessment and Learning Infrastructure:</strong> Certain platform components are powered by third-party software operated as managed services by Ensynapse. No third-party software provider receives your data for their own commercial purposes.</li>
                <li><strong>Razorpay:</strong> Payment processing. Razorpay processes only the data necessary to complete your transaction.</li>
                <li><strong>Transactional Email Provider:</strong> Email addresses and names are shared solely for platform communications.</li>
                <li><strong>Regulatory Authorities:</strong> TDS data and legally required disclosures are shared with statutory bodies as required by law.</li>
              </ul>
            </div>

            <div className="lp-article" id="priv-4">
              <span className="lp-article-num">Section 4</span>
              <h2>Data Retention</h2>
              <table className="lp-policy-table">
                <thead><tr><th>Data Category</th><th>Retention Period</th></tr></thead>
                <tbody>
                  <tr><td>Candidate profile and PRI score</td><td>5 years from last active login, or on deletion request</td></tr>
                  <tr><td>Assessment scores (XPrep, DCAT)</td><td>7 years (for credential verification purposes)</td></tr>
                  <tr><td>Financial records (invoices, payment logs)</td><td>8 years (as required by tax law)</td></tr>
                  <tr><td>Recruiter earnings and TDS records</td><td>8 years</td></tr>
                  <tr><td>Job application records</td><td>3 years from application date</td></tr>
                  <tr><td>Server and access logs</td><td>90 days (rolling)</td></tr>
                  <tr><td>Marketing consent records</td><td>Until consent is withdrawn</td></tr>
                </tbody>
              </table>
            </div>

            <div className="lp-article" id="priv-5">
              <span className="lp-article-num">Section 5</span>
              <h2>Your Rights Under the DPDP Act, 2023</h2>
              <p>As a Data Principal under the DPDP Act, you have the following rights:</p>
              <ul>
                <li><strong>Right to Access:</strong> Obtain a summary of your personal data processed by us.</li>
                <li><strong>Right to Correction and Erasure:</strong> Request correction of inaccurate data or erasure of data we are no longer obligated to retain.</li>
                <li><strong>Right to Grievance Redressal:</strong> Raise complaints through our in-platform grievance mechanism or by writing to our Data Protection Officer.</li>
                <li><strong>Right to Nominate:</strong> Nominate an individual to exercise your rights in the event of your death or incapacity.</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for non-essential processing at any time.</li>
              </ul>
              <p>To exercise any of these rights, contact our DPO at <strong>privacy@discovehr.com</strong>. We will respond within 30 days.</p>
            </div>

            <div className="lp-article" id="priv-6">
              <span className="lp-article-num">Section 6</span>
              <h2>Data Security</h2>
              <p>We implement industry-standard technical and organisational measures to protect your data, including:</p>
              <ul>
                <li>TLS/SSL encryption in transit across all Platform subdomains;</li>
                <li>At-rest encryption for sensitive fields (PAN, bank details) in the database;</li>
                <li>HMAC-SHA256 webhook signature verification for third-party integrations;</li>
                <li>Role-based access controls within the platform backend limiting staff access to personal data;</li>
                <li>UFW firewall and regular security patching on cloud infrastructure;</li>
                <li>Session token expiry and anomaly detection for suspicious login patterns.</li>
              </ul>
              <p>In the event of a personal data breach affecting your rights, we will notify you within 72 hours of becoming aware, where required by law.</p>
            </div>
          </div>
          {/* ══ END PRIVACY ══ */}

          {/* ══════════════ COOKIE POLICY ══════════════ */}
          <div className={`lp-policy-section${active === "cookie" ? " active" : ""}`} id="sec-cookie">
            <div className="lp-policy-header">
              <div className="lp-policy-tag">03 — Cookie Policy</div>
              <h1 className="lp-policy-title">Cookie &amp; Tracking<br />Technologies Policy</h1>
              <p className="lp-policy-subtitle">
                This policy explains how DiscoveHR uses cookies, session tokens, and similar technologies across its web properties. It applies to all Users of discovehr.com and its subdomains.
              </p>
              <div className="lp-policy-dates">
                <span className="lp-date-chip">Effective: 1 June 2026</span>
                <span className="lp-date-chip">Scope: discovehr.com and all subdomains</span>
              </div>
            </div>

            <div className="lp-article" id="cookie-1">
              <span className="lp-article-num">Section 1</span>
              <h2>What Are Cookies?</h2>
              <p>Cookies are small text files placed on your device by a web server when you visit a website. They allow the site to remember your preferences, maintain your session, and understand how you use the Platform. We also use similar technologies including local storage, session storage, and server-side session tokens.</p>
            </div>

            <div className="lp-article" id="cookie-2">
              <span className="lp-article-num">Section 2</span>
              <h2>Categories of Cookies We Use</h2>
              <h3>2.1 Strictly Necessary Cookies</h3>
              <p>These cookies are essential for the Platform to function and cannot be disabled.</p>
              <table className="lp-policy-table">
                <thead><tr><th>Cookie / Token</th><th>Purpose</th><th>Duration</th></tr></thead>
                <tbody>
                  <tr><td><strong>session_id</strong></td><td>Authenticates your logged-in session on portal.discovehr.com</td><td>Session / 24 hours</td></tr>
                  <tr><td><strong>csrftoken</strong></td><td>Protects against cross-site request forgery attacks</td><td>Session</td></tr>
                  <tr><td><strong>razorpay_*</strong></td><td>Required for payment flow continuity during checkout</td><td>Session</td></tr>
                  <tr><td><strong>assessment_session</strong></td><td>Maintains session state during XPrep and psychometric assessments</td><td>Duration of test</td></tr>
                </tbody>
              </table>
              <h3>2.2 Functional Cookies</h3>
              <table className="lp-policy-table">
                <thead><tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr></thead>
                <tbody>
                  <tr><td><strong>ui_theme</strong></td><td>Stores your UI theme preference</td><td>1 year</td></tr>
                  <tr><td><strong>lang_pref</strong></td><td>Remembers your language preference</td><td>1 year</td></tr>
                  <tr><td><strong>lms_session</strong></td><td>Maintains session on learn.discovehr.com for course access</td><td>Session</td></tr>
                </tbody>
              </table>
              <h3>2.3 Analytical / Performance Cookies</h3>
              <table className="lp-policy-table">
                <thead><tr><th>Cookie</th><th>Provider</th><th>Purpose</th><th>Duration</th></tr></thead>
                <tbody>
                  <tr><td><strong>_ga, _gid</strong></td><td>Google Analytics (if active)</td><td>Page views, user flow, feature usage</td><td>2 years / 24 hours</td></tr>
                  <tr><td><strong>platform_analytics</strong></td><td>DiscoveHR (first-party)</td><td>Module engagement, PRI assessment completion rates</td><td>90 days</td></tr>
                </tbody>
              </table>
              <div className="lp-callout lp-callout-info">
                <strong>Note on GHL Forms:</strong> GoHighLevel (GHL) embedded forms on certain pages may set their own functional cookies governed by GHL&apos;s privacy policy.
              </div>
              <h3>2.4 Cookies We Do Not Use</h3>
              <ul>
                <li>Advertising or retargeting cookies (we are ad-free);</li>
                <li>Cross-site tracking cookies that follow you beyond the DiscoveHR domain;</li>
                <li>Third-party social media tracking pixels.</li>
              </ul>
            </div>

            <div className="lp-article" id="cookie-3">
              <span className="lp-article-num">Section 3</span>
              <h2>Your Cookie Choices</h2>
              <ul>
                <li><strong>Browser settings:</strong> Most browsers allow you to block or delete cookies. Disabling strictly necessary cookies will prevent you from logging in.</li>
                <li><strong>Cookie preference centre:</strong> On first visit to discovehr.com, a consent banner allows you to accept or reject non-essential cookie categories.</li>
                <li><strong>Opt-out of analytics:</strong> If Google Analytics is active, you may install the Google Analytics Opt-out Browser Add-on.</li>
              </ul>
              <div className="lp-callout lp-callout-warn">
                <strong>Important for Candidates:</strong> Disabling or blocking cookies during an XPrep or DCAT assessment session may cause the session to terminate unexpectedly.
              </div>
            </div>

            <div className="lp-article" id="cookie-4">
              <span className="lp-article-num">Section 4</span>
              <h2>Cookie Consent</h2>
              <p>Strictly necessary cookies do not require your consent and are deployed on page load. All other cookie categories are deployed only upon your explicit consent via the cookie preference centre. Consent is recorded with a timestamp and can be withdrawn at any time.</p>
            </div>
          </div>
          {/* ══ END COOKIE ══ */}

          {/* ══════════════ REFUND POLICY ══════════════ */}
          <div className={`lp-policy-section${active === "refund" ? " active" : ""}`} id="sec-refund">
            <div className="lp-policy-header">
              <div className="lp-policy-tag">04 — Refund Policy</div>
              <h1 className="lp-policy-title">Refund, Cancellation<br />&amp; Dispute Policy</h1>
              <p className="lp-policy-subtitle">
                This policy governs refund eligibility, cancellation rights, and dispute resolution for all fee-bearing transactions on the DiscoveHR platform.
              </p>
              <div className="lp-policy-dates">
                <span className="lp-date-chip">Effective: 1 June 2026</span>
                <span className="lp-date-chip">Currency: Indian Rupees (₹) inclusive of applicable GST unless stated otherwise</span>
              </div>
            </div>

            <div className="lp-article" id="refund-1">
              <span className="lp-article-num">Section 1</span>
              <h2>Candidate Payments</h2>
              <h3>1.1 Self-Pay Annual Subscription (₹1,000/year)</h3>
              <table className="lp-policy-table">
                <thead><tr><th>Scenario</th><th>Refund Entitlement</th></tr></thead>
                <tbody>
                  <tr><td>Cancellation within 7 days of payment, <em>with no assessment attempts made</em></td><td>Full refund (less Razorpay gateway charges, typically 2%)</td></tr>
                  <tr><td>Cancellation within 7 days, <em>after at least one assessment attempt</em></td><td>No refund. The assessment service has been rendered.</td></tr>
                  <tr><td>Cancellation after 7 days, any usage level</td><td>No refund. Annual subscriptions are non-refundable after the 7-day window.</td></tr>
                  <tr><td>Technical failure by Ensynapse preventing all access for &gt;72 hours</td><td>Pro-rata refund for days of verified downtime.</td></tr>
                </tbody>
              </table>
              <h3>1.2 Mock Interview Booking</h3>
              <table className="lp-policy-table">
                <thead><tr><th>Scenario</th><th>Refund Entitlement</th></tr></thead>
                <tbody>
                  <tr><td>Cancellation by Candidate &gt;24 hours before scheduled interview</td><td>Full refund within 5–7 business days</td></tr>
                  <tr><td>Cancellation by Candidate &lt;24 hours before scheduled interview</td><td>50% refund; 50% remitted to the Interviewer</td></tr>
                  <tr><td>Candidate no-show (did not join within 10 minutes of start time)</td><td>No refund. Interviewer is paid their full session fee.</td></tr>
                  <tr><td>Interviewer no-show or cancellation (any time)</td><td>Full refund to Candidate. No fee to Interviewer.</td></tr>
                </tbody>
              </table>
              <h3>1.3 Grand AI Challenge Certificate (₹199)</h3>
              <p>The GAIC certificate fee is non-refundable once a submission has been evaluated and a result issued.</p>
            </div>

            <div className="lp-article" id="refund-2">
              <span className="lp-article-num">Section 2</span>
              <h2>Institutional Payments (TPO / Colleges)</h2>
              <h3>2.1 Setup Fee</h3>
              <p>The one-time platform setup fee (typically ₹25,000) is non-refundable once onboarding has commenced. Prior to any student enrollment, a full refund may be requested within 15 days of payment.</p>
              <h3>2.2 Annual Per-Student Access Fee</h3>
              <table className="lp-policy-table">
                <thead><tr><th>Scenario</th><th>Refund Entitlement</th></tr></thead>
                <tbody>
                  <tr><td>Student withdraws from institution within 30 days of enrollment on Platform</td><td>Full per-student fee refunded for that student</td></tr>
                  <tr><td>Student withdraws after 30 days</td><td>No refund. Access may be transferred to a replacement student.</td></tr>
                  <tr><td>Institution discontinues subscription mid-year</td><td>No pro-rata refund. Access continues until expiry.</td></tr>
                  <tr><td>Platform discontinuation by Ensynapse</td><td>Pro-rata refund for remaining subscription months.</td></tr>
                </tbody>
              </table>
              <h3>2.3 Success Fees</h3>
              <p>Success fees (charged per confirmed placement above ₹3 LPA) are non-refundable once invoiced and verified.</p>
            </div>

            <div className="lp-article" id="refund-3">
              <span className="lp-article-num">Section 3</span>
              <h2>Freelance Recruiter / Interviewer — Earnings Policy</h2>
              <div className="lp-callout lp-callout-info">
                <strong>Earnings are not &quot;refunds&quot; in the consumer sense.</strong> This section governs when platform-held earnings are disbursed or withheld.
              </div>
              <h3>3.1 Mock Interview Earnings</h3>
              <p>Earnings for completed mock interviews are credited to the Interviewer&apos;s platform wallet within 48 hours of session completion, pending absence of a Candidate dispute.</p>
              <h3>3.2 Managed Recruitment Earnings (Escrow)</h3>
              <ul>
                <li><strong>Tranche 1 (50%):</strong> Released within 7 business days of client acceptance of the candidate shortlist.</li>
                <li><strong>Tranche 2 (50%):</strong> Released on Day 91 of confirmed employment.</li>
              </ul>
              <h3>3.3 Withdrawal to Bank Account</h3>
              <p>Wallet balances of ₹500 or above may be withdrawn to the registered bank account or UPI handle. Withdrawals are processed within 5 business days. TDS certificates (Form 16A) will be issued quarterly.</p>
            </div>

            <div className="lp-article" id="refund-4">
              <span className="lp-article-num">Section 4</span>
              <h2>Company Payments</h2>
              <p>Company use of the core Platform is currently provided at no charge. This section applies to premium services if and when introduced, and to managed recruitment commercial agreements.</p>
              <h3>4.1 Assessment Slot Pre-Purchase</h3>
              <p>Assessment slots (e.g. ₹10,000 per 1,000 candidates) are non-refundable once any candidates have been invited to take assessments. Unused slots may be carried forward.</p>
              <h3>4.2 Fully Managed Campus Drive Fee</h3>
              <p>Standard terms: 50% non-refundable upon signing; 50% on completion of the drive. Cancellation by the Company within 14 days of the drive date forfeits 100% of the fee.</p>
            </div>

            <div className="lp-article" id="refund-5">
              <span className="lp-article-num">Section 5</span>
              <h2>Dispute Resolution Process</h2>
              <p>All refund disputes must be raised within <strong>7 calendar days</strong> of the transaction or service date via email to <strong>support@discovehr.com</strong> with the subject line <em>&quot;Refund Dispute — [Transaction ID]&quot;</em>.</p>
              <ol>
                <li><strong>Acknowledgment:</strong> Within 24 hours of receipt.</li>
                <li><strong>Review:</strong> Platform logs, session records, and communications reviewed within 5 business days.</li>
                <li><strong>Decision:</strong> Written decision communicated by email. Decisions are final for amounts below ₹5,000.</li>
                <li><strong>Grievance Officer Escalation:</strong> Write to <strong>grievance@discovehr.com</strong> within 7 days of the initial decision.</li>
              </ol>
              <h3>5.2 Refund Processing Time</h3>
              <p>Approved refunds are processed within <strong>7–10 business days</strong> to the original payment method. Gateway charges (typically 2%) are deducted from refunds unless the refund is due to Ensynapse&apos;s fault.</p>
            </div>

            <div className="lp-article" id="refund-6">
              <span className="lp-article-num">Section 6</span>
              <h2>Contact and Grievance Officer</h2>
              <table className="lp-policy-table">
                <thead><tr><th>Purpose</th><th>Contact</th></tr></thead>
                <tbody>
                  <tr><td>General support and refund requests</td><td>support@discovehr.com</td></tr>
                  <tr><td>Privacy and data requests</td><td>privacy@discovehr.com</td></tr>
                  <tr><td>Legal and compliance</td><td>legal@discovehr.com</td></tr>
                  <tr><td>Grievance escalation</td><td>grievance@discovehr.com</td></tr>
                  <tr><td>Registered address</td><td>Ensynapse Technique Pvt. Ltd., Kerala, India</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          {/* ══ END REFUND ══ */}

        </main>
      </div>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div>
            <div className="lp-footer-brand">DiscoveHR · Legal Policies</div>
            <div className="lp-footer-sub">
              Owned and operated by Ensynapse Technique Pvt. Ltd., Kerala, India<br />
              © 2026 Ensynapse Technique Pvt. Ltd. All rights reserved.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--lp-text-faint)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Quick Links</div>
            <div className="lp-footer-links">
              {(Object.keys(POLICIES) as PolicyKey[]).map((key) => (
                <button key={key} className="lp-footer-link" onClick={() => showPolicy(key)}>
                  {POLICIES[key].label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
