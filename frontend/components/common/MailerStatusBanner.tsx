"use client";

import { useEffect, useState } from "react";
import { getMailerConfig, sendTestEmail, type MailerConfig } from "../../lib/api/email";

export function MailerStatusBanner() {
  const [config, setConfig] = useState<MailerConfig | null>(null);
  const [toEmail, setToEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        text: `Test email sent to ${result.sentTo || toEmail || "your login email"}.`,
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

  if (config.configured && config.provider === "postmark") {
    return (
      <div style={{ margin: "0 0 12px" }}>
        <p className="table-caption" style={{ margin: "0 0 8px" }}>
          Email delivery: <strong>Postmark</strong>
          {config.fromEmail ? ` · ${config.fromEmail}` : ""}
        </p>
        <MailerTestRow
          toEmail={toEmail}
          onToEmailChange={setToEmail}
          sending={sending}
          onSend={handleSendTest}
          feedback={feedback}
        />
      </div>
    );
  }

  if (config.configured && config.provider === "frappe") {
    return (
      <div style={{ margin: "0 0 12px" }}>
        <p className="table-caption" style={{ margin: "0 0 8px" }}>
          Email delivery: <strong>Frappe outgoing mail</strong> (Postmark not configured).
        </p>
        <MailerTestRow
          toEmail={toEmail}
          onToEmailChange={setToEmail}
          sending={sending}
          onSend={handleSendTest}
          feedback={feedback}
        />
      </div>
    );
  }

  return (
    <p className="error" style={{ margin: "0 0 12px", fontSize: "13px" }}>
      Email is not configured. Invites and notifications may fail until you set{" "}
      <code>SCOUT_POSTMARK_SERVER_TOKEN</code> and <code>SCOUT_MAIL_FROM</code> in{" "}
      <code>backend/.env</code> (see RUNNING.md §12).
    </p>
  );
}

type MailerTestRowProps = {
  toEmail: string;
  onToEmailChange: (value: string) => void;
  sending: boolean;
  onSend: () => void;
  feedback: { type: "success" | "error"; text: string } | null;
};

function MailerTestRow({ toEmail, onToEmailChange, sending, onSend, feedback }: MailerTestRowProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
      <input
        type="email"
        className="input"
        placeholder="Recipient (optional — defaults to your login email)"
        value={toEmail}
        onChange={(e) => onToEmailChange(e.target.value)}
        style={{ minWidth: "220px", flex: "1 1 220px", maxWidth: "360px" }}
        disabled={sending}
      />
      <button type="button" className="btn secondary" onClick={() => void onSend()} disabled={sending}>
        {sending ? "Sending…" : "Send test email"}
      </button>
      {feedback ? (
        <p
          className={feedback.type === "error" ? "error" : "table-caption"}
          style={{ margin: 0, fontSize: "13px", flex: "1 1 100%" }}
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}
