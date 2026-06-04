"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function HomePage() {
  const navRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const launcher = launcherRef.current;
    const panel = panelRef.current;

    // Nav border on scroll
    const onScroll = () => {
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 10);
    };
    window.addEventListener("scroll", onScroll);

    // 9-dot launcher toggle
    const onLauncherClick = (e: MouseEvent) => {
      e.stopPropagation();
      panel?.classList.toggle("open");
    };
    const onPanelClick = (e: MouseEvent) => e.stopPropagation();
    const onDocClick = () => panel?.classList.remove("open");
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") panel?.classList.remove("open");
    };

    launcher?.addEventListener("click", onLauncherClick);
    panel?.addEventListener("click", onPanelClick);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeydown);

    // Scroll reveal
    const reveals = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      launcher?.removeEventListener("click", onLauncherClick);
      panel?.removeEventListener("click", onPanelClick);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeydown);
      io.disconnect();
    };
  }, []);

  return (
    <div className="landing-page">
      {/* ===== NAV ===== */}
      <nav ref={navRef} id="nav">
        <div className="nav-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" stroke="#0047ff" strokeWidth="2" fill="none" />
                <circle cx="16" cy="16" r="5" fill="#0047ff" />
                <circle cx="26" cy="9" r="2.6" fill="#0a0a0b" />
              </svg>
            </span>
            <span className="brand-name">
              Discove<b>HR</b>
            </span>
          </Link>

          <div className="nav-center">
            <a href="#platform">Platform</a>
            <a href="#features">Capabilities</a>
            <a href="#scale">Scale</a>
            <a href="#ecosystem">Ecosystem</a>
          </div>

          <div className="nav-right">
            <Link href="/login" className="nav-login">
              Sign in
            </Link>
            <Link href="/signup" className="btn-blue">
              Get started
              <svg viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <button
              ref={launcherRef}
              className="grid-launcher"
              aria-label="Open app launcher"
            >
              <span className="dots">
                <span /><span /><span />
                <span /><span /><span />
                <span /><span /><span />
              </span>
              <div ref={panelRef} className="launcher-panel">
                <div className="launcher-panel-label">Enter the platform</div>
                <div className="launcher-grid">
                  <Link href="/login" className="launcher-item">
                    <span className="launcher-icon">
                      <svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
                    </span>
                    <span className="launcher-name">Students</span>
                  </Link>
                  <Link href="/login" className="launcher-item">
                    <span className="launcher-icon">
                      <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" /></svg>
                    </span>
                    <span className="launcher-name">Institutions</span>
                  </Link>
                  <Link href="/login" className="launcher-item">
                    <span className="launcher-icon">
                      <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 11l-3 3-1.5-1.5" /></svg>
                    </span>
                    <span className="launcher-name">Placement Officers</span>
                  </Link>
                  <Link href="/login" className="launcher-item">
                    <span className="launcher-icon">
                      <svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></svg>
                    </span>
                    <span className="launcher-name">Recruiter Panelists</span>
                  </Link>
                  <Link href="/login" className="launcher-item">
                    <span className="launcher-icon">
                      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    </span>
                    <span className="launcher-name">Recruiters</span>
                  </Link>
                  <Link href="/login" className="launcher-item">
                    <span className="launcher-icon">
                      <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                    </span>
                    <span className="launcher-name">Employers</span>
                  </Link>
                  <Link href="/login" className="launcher-item">
                    <span className="launcher-icon">
                      <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
                    </span>
                    <span className="launcher-name">Assessments</span>
                  </Link>
                  <Link href="/login" className="launcher-item">
                    <span className="launcher-icon">
                      <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                    </span>
                    <span className="launcher-name">Campus Drives</span>
                  </Link>
                  <Link href="/admin/login" className="launcher-item">
                    <span className="launcher-icon">
                      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.4 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.6c.1-.3.1-.7.1-1z" /></svg>
                    </span>
                    <span className="launcher-name">Console</span>
                  </Link>
                </div>
                <div className="launcher-footer">
                  <span>One platform. Every role.</span>
                  <Link href="/login">All logins →</Link>
                </div>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="hero" id="platform">
        <div className="hero-bg" />
        <div className="hero-grid-lines" />
        <div className="hero-inner">
          <div className="hero-tag rise d1">
            <b>New</b>
            <span>The decentralized hiring infrastructure</span>
          </div>
          <h1 className="hero-title rise d2">
            Talent discovery.<br />
            <span className="blue">Simplified.</span>{" "}
            <span className="blue">
              Decentralized<span className="period">.</span>
            </span>
          </h1>
          <p className="hero-sub rise d3">
            DiscoveHR gives enterprise companies the technological edge to hire at scale — across
            geographies, institutions, and assessment networks — on a single, unified platform.
          </p>
          <div className="hero-cta-row rise d4">
            <Link href="/signup" className="btn-blue-lg">
              Get started
              <svg viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <a href="#features" className="btn-ghost-lg">
              <span className="play">
                <svg viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </span>
              See the platform
            </a>
          </div>

          {/* Trust strip */}
          <div className="trust rise d5">
            <p className="trust-label">Built for enterprise hiring at scale</p>
            <div className="trust-row">
              <span className="trust-logo">Enterprises</span>
              <span className="trust-logo">GCCs</span>
              <span className="trust-logo">Institutions</span>
              <span className="trust-logo">Recruiters</span>
              <span className="trust-logo">Campuses</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATEMENT ===== */}
      <section className="statement">
        <div className="wrap">
          <p className="statement-text reveal">
            Hiring at scale is{" "}
            <span className="dim">
              fragmented across job boards, agencies, assessment tools, and campus relationships.
            </span>{" "}
            DiscoveHR unifies all of it into{" "}
            <span className="blue">one decentralized network.</span>
          </p>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="features" id="features">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="sec-eyebrow">Capabilities</span>
            <h2 className="sec-title">
              Everything hiring requires, <em>natively built.</em>
            </h2>
            <p className="sec-body">
              A complete infrastructure layer — not a collection of integrations. Every capability
              is engineered into the platform and works as one.
            </p>
          </div>

          <div className="feature-grid reveal">
            <div className="feature">
              <span className="feature-num">01</span>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
              </div>
              <h3 className="feature-title">Seamless Job Posting</h3>
              <p className="feature-desc">
                Publish roles across the entire network in a single action — reaching candidates,
                institutions, and recruiter panels simultaneously, with structured intake and
                intelligent distribution.
              </p>
            </div>
            <div className="feature">
              <span className="feature-num">02</span>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" /></svg>
              </div>
              <h3 className="feature-title">Native Assessment Infrastructure</h3>
              <p className="feature-desc">
                A fully native assessment engine with an open marketplace of validated tests —
                technical, psychometric, and role-specific — deployed and scored within the
                platform, no external tooling required.
              </p>
            </div>
            <div className="feature">
              <span className="feature-num">03</span>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <h3 className="feature-title">Distributed Recruiter &amp; Interviewer Network</h3>
              <p className="feature-desc">
                Tap a decentralized panel of third-party recruiters and domain interviewers on
                demand — extending hiring capacity without expanding headcount, with quality
                governed by the platform.
              </p>
            </div>
            <div className="feature">
              <span className="feature-num">04</span>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" /></svg>
              </div>
              <h3 className="feature-title">Native Campus Integration</h3>
              <p className="feature-desc">
                Connect directly into institutional placement systems — verified candidate pools,
                real-time eligibility, and a single channel between employers and campuses across
                the country.
              </p>
            </div>
            <div className="feature">
              <span className="feature-num">05</span>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              </div>
              <h3 className="feature-title">Automated Campus Drives</h3>
              <p className="feature-desc">
                Orchestrate end-to-end campus hiring — scheduling, eligibility filtering,
                multi-stage assessment, and interviewer allocation — automated across thousands of
                candidates at once.
              </p>
            </div>
            <div className="feature">
              <span className="feature-num">06</span>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" /></svg>
              </div>
              <h3 className="feature-title">Cross-Geography Hiring</h3>
              <p className="feature-desc">
                Run unified hiring operations across regions and markets — consistent process,
                local reach, and a single source of truth for every requisition, wherever the
                talent is.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SCALE ===== */}
      <section className="scale" id="scale">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="sec-eyebrow">Built for scale</span>
            <h2 className="sec-title">Infrastructure that hires by the thousand.</h2>
            <p className="sec-body">
              DiscoveHR is engineered for the volume and complexity of enterprise and GCC hiring —
              where speed, consistency, and reach decide outcomes.
            </p>
          </div>
          <div className="metrics reveal">
            <div className="metric">
              <div className="metric-num">
                One<span className="blue">.</span>
              </div>
              <div className="metric-label">Unified platform replacing fragmented hiring tools and vendors</div>
            </div>
            <div className="metric">
              <div className="metric-num">
                28<span className="blue">+</span>
              </div>
              <div className="metric-label">States within national institutional and campus reach</div>
            </div>
            <div className="metric">
              <div className="metric-num">
                100<span className="blue">%</span>
              </div>
              <div className="metric-label">Native infrastructure — assessments, panels, and drives built in</div>
            </div>
            <div className="metric">
              <div className="metric-num">∞</div>
              <div className="metric-label">Decentralized recruiter capacity, available on demand</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ECOSYSTEM ===== */}
      <section className="ecosystem" id="ecosystem">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="sec-eyebrow">One platform, every role</span>
            <h2 className="sec-title">
              A network where <em>everyone</em> connects.
            </h2>
            <p className="sec-body">
              Employers lead the platform — but DiscoveHR is built for the entire hiring ecosystem.
              Each role has its own dedicated workspace.
            </p>
          </div>
          <div className="eco-grid reveal">
            <Link href="/login" className="eco-card">
              <span className="eco-card-icon">
                <svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
              </span>
              <div>
                <div className="eco-card-name">Students</div>
                <div className="eco-card-desc">Discover opportunities, complete assessments, and get placed.</div>
              </div>
              <span className="eco-card-link">
                Sign in{" "}
                <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </span>
            </Link>
            <Link href="/login" className="eco-card">
              <span className="eco-card-icon">
                <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" /></svg>
              </span>
              <div>
                <div className="eco-card-name">Institutions</div>
                <div className="eco-card-desc">Connect your talent pool directly to enterprise hiring.</div>
              </div>
              <span className="eco-card-link">
                Sign in{" "}
                <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </span>
            </Link>
            <Link href="/login" className="eco-card">
              <span className="eco-card-icon">
                <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 11l-3 3-1.5-1.5" /></svg>
              </span>
              <div>
                <div className="eco-card-name">Placement Officers</div>
                <div className="eco-card-desc">Run drives, track outcomes, and manage employer relationships.</div>
              </div>
              <span className="eco-card-link">
                Sign in{" "}
                <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </span>
            </Link>
            <Link href="/login" className="eco-card">
              <span className="eco-card-icon">
                <svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></svg>
              </span>
              <div>
                <div className="eco-card-name">Recruiter Panelists</div>
                <div className="eco-card-desc">Interview and assess candidates across the network on demand.</div>
              </div>
              <span className="eco-card-link">
                Sign in{" "}
                <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta" id="demo">
        <div className="wrap">
          <div className="cta-box reveal">
            <div className="cta-content">
              <h2 className="cta-title">
                See how enterprises hire <em>differently.</em>
              </h2>
              <p className="cta-sub">
                Join DiscoveHR and experience decentralized talent discovery at enterprise scale.
              </p>
              <Link href="/signup" className="btn-white">
                Create an account
                <svg viewBox="0 0 24 24">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer>
        <div className="wrap">
          <div className="footer-top">
            <div>
              <div className="footer-brand-name">
                <span className="brand-mark" style={{ width: 24, height: 24 }}>
                  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="14" stroke="#0047ff" strokeWidth="2" fill="none" />
                    <circle cx="16" cy="16" r="5" fill="#0047ff" />
                    <circle cx="26" cy="9" r="2.6" fill="#0a0a0b" />
                  </svg>
                </span>
                Discove<b>HR</b>
              </div>
              <p className="footer-tagline">
                Talent discovery, simplified and decentralized — the hiring infrastructure for enterprise scale.
              </p>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <a href="#features">Job Posting</a>
              <a href="#features">Assessments</a>
              <a href="#features">Recruiter Network</a>
              <a href="#features">Campus Drives</a>
            </div>
            <div className="footer-col">
              <h4>Ecosystem</h4>
              <Link href="/login">Students</Link>
              <Link href="/login">Institutions</Link>
              <Link href="/login">Placement Officers</Link>
              <Link href="/login">Recruiter Panelists</Link>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <Link href="/login">Sign in</Link>
              <Link href="/signup">Register</Link>
              <Link href="/admin/login">Admin console</Link>
              <a href="#demo">Contact</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-copy">© 2026 DiscoveHR. All rights reserved.</span>
            <div className="footer-legal">
              <Link href="/legal#sec-privacy">Privacy</Link>
              <Link href="/legal#sec-tnc">Terms</Link>
              <Link href="/legal">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
