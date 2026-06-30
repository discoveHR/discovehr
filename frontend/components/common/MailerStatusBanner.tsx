"use client";

import { useEffect, useState } from "react";
import { getMailerConfig, sendTestEmail, type MailerConfig } from "../../lib/api/email";

export function MailerStatusBanner() {
  const [config, setConfig] = useState<MailerConfig | null>(null);
  const [toEmail, setToEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void getMailerConfig()
      .then(setConfig)
      .catch(() => setConfig({ provider: "none", configured: false }));
  }, []);

  async function handleSendTest() {
    setFeedback(null);
    setSending(true);
    try {
      const result = await sendTestEmail(toEmail || undefined);
      setFeedback({
        type: "success",
        text: `Sent to ${result.sentTo || toEmail || "your login email"}.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Test email failed.",
      });
    } finally {
      setSending(false);
    }
  }

  if (!config) return null;

  if (!config.configured) {
    return (
      <div className="msb-root msb-root--warn">
        <span className="msb-dot msb-dot--red" />
        <span className="msb-text">
          Email not configured — invites may fail.{" "}
          <code className="msb-code">SCOUT_POSTMARK_SERVER_TOKEN</code> +{" "}
          <code className="msb-code">SCOUT_MAIL_FROM</code> needed in <code className="msb-code">backend/.env</code>.
        </span>
      </div>
    );
  }

  const providerLabel = config.provider === "postmark" ? "Postmark" : "Frappe Mail";
  const fromLabel = config.fromEmail ?? "";

  return (
    <div className="msb-root">
      {/* Status row */}
      <div className="msb-status-row">
        <div className="msb-status-left">
          <span className="msb-dot msb-dot--green" />
          <span className="msb-provider-badge">{providerLabel}</span>
          {fromLabel && <span className="msb-from">{fromLabel}</span>}
        </div>
        <button
          type="button"
          className={`msb-toggle${open ? " msb-toggle--open" : ""}`}
          onClick={() => { setOpen((p) => !p); setFeedback(null); }}
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="13" height="13">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.38a2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6 6l.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          Test delivery
          <svg className={`msb-chevron${open ? " msb-chevron--up" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="12" height="12">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>

      {/* Expandable test section */}
      {open && (
        <div className="msb-test-body">
          <div className="msb-test-row">
            <div className="msb-input-wrap">
              <svg className="msb-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="14" height="14">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                type="email"
                className="msb-input"
                placeholder="Recipient (optional — defaults to your email)"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                disabled={sending}
                onKeyDown={(e) => e.key === "Enter" && !sending && void handleSendTest()}
              />
            </div>
            <button
              type="button"
              className="msb-send-btn"
              onClick={() => void handleSendTest()}
              disabled={sending}
            >
              {sending ? (
                <><span className="msb-spinner" />Sending…</>
              ) : (
                <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="13" height="13"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Send test</>
              )}
            </button>
          </div>
          {feedback && (
            <div className={`msb-feedback msb-feedback--${feedback.type}`}>
              {feedback.type === "success" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              )}
              {feedback.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
