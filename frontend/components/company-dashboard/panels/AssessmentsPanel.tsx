import type { FormEvent } from "react";
import type {
  AssessmentFormPayload,
  AssessmentItem,
  AssessmentProctoringLevel,
  AssessmentQuestionClass,
  AssessmentScheduleMode,
  CompanyCreditWallet,
} from "../../../lib/api";

type AssessmentsPanelProps = {
  value: AssessmentFormPayload;
  items: AssessmentItem[];
  walletRates?: CompanyCreditWallet["rates"];
  error: string;
  publishingId: string | null;
  onChange: <K extends keyof AssessmentFormPayload>(key: K, val: AssessmentFormPayload[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onPublish: (assessmentId: string) => void;
};

function estimateCoins(
  rates: CompanyCreditWallet["rates"] | undefined,
  proctoringLevel: AssessmentProctoringLevel,
): number {
  let cost = rates?.assessment ?? 1;
  if (proctoringLevel === "Full") cost += rates?.fullProctoring ?? 3;
  else if (proctoringLevel === "Standard") cost += rates?.standardProctoring ?? 1;
  return cost;
}

function mcqOptionsForClass(questionClass: AssessmentQuestionClass): string[] {
  if (questionClass === "MCQ Multi") return ["Multiple Correct"];
  if (questionClass === "MCQ Weighted") return ["Weighted Options", "Independent Marks"];
  return ["Single Correct"];
}

const PROCTORING_DESCRIPTIONS: Record<AssessmentProctoringLevel, string> = {
  None: "No monitoring",
  Standard: "Tab focus + warnings",
  Full: "Full proctoring + coins",
};

const SCHEDULE_MODE_META: Record<AssessmentScheduleMode, { icon: string; desc: string }> = {
  Scheduled: { icon: "📅", desc: "Fixed start–end window" },
  Floating: { icon: "⏱", desc: "Candidate starts anytime" },
};

export function AssessmentsPanel({
  value,
  items,
  walletRates,
  error,
  publishingId,
  onChange,
  onSubmit,
  onReset,
  onPublish,
}: AssessmentsPanelProps) {
  const statusClassMap: Record<AssessmentItem["status"], string> = {
    Draft: "draft",
    Published: "active",
    Closed: "closed",
  };
  const estimatedCoins = estimateCoins(walletRates, value.proctoringLevel);
  const mcqOptions = mcqOptionsForClass(value.questionClass);
  const isMcq =
    value.questionClass === "MCQ Single" ||
    value.questionClass === "MCQ Multi" ||
    value.questionClass === "MCQ Weighted";

  return (
    <section className="company-table-wrap company-assessments-wrap">
      {/* ── Page header ── */}
      <div className="company-table-head">
        <h3>Assessments</h3>
        <span className="table-caption">
          Build a draft first, then publish when ready. Publishing spends coins from your wallet.
        </span>
      </div>

      {/* ── Assessment builder form ── */}
      <form className="asm-builder" onSubmit={onSubmit}>

        {/* Section 1 — Basic setup */}
        <div className="asm-section">
          <p className="asm-section-label">Basic Setup</p>
          <div className="asm-section-body">
            <div className="job-form-row">
              <label>Assessment title</label>
              <input
                value={value.title}
                onChange={(e) => onChange("title", e.target.value)}
                placeholder="e.g. Aptitude Round 1"
              />
            </div>
            <div className="job-form-row">
              <label>Description / instructions</label>
              <textarea
                value={value.description}
                onChange={(e) => onChange("description", e.target.value)}
                placeholder="Instructions shown to candidates before they start…"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Section 2 — Schedule & question type */}
        <div className="asm-section">
          <p className="asm-section-label">Schedule & Question Type</p>
          <div className="asm-section-body">
            {/* Schedule mode — radio cards */}
            <div className="job-form-row">
              <label>Schedule mode</label>
              <div className="asm-mode-cards">
                {(["Scheduled", "Floating"] as AssessmentScheduleMode[]).map((mode) => (
                  <label
                    key={mode}
                    className={`asm-mode-card${value.scheduleMode === mode ? " selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="scheduleMode"
                      value={mode}
                      checked={value.scheduleMode === mode}
                      onChange={() => onChange("scheduleMode", mode)}
                    />
                    <span className="asm-mode-icon">{SCHEDULE_MODE_META[mode].icon}</span>
                    <span className="asm-mode-name">{mode}</span>
                    <span className="asm-mode-desc">{SCHEDULE_MODE_META[mode].desc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="job-form-dual">
              <div className="job-form-row">
                <label>Question class</label>
                <select
                  value={value.questionClass}
                  onChange={(e) => {
                    const qc = e.target.value as AssessmentQuestionClass;
                    onChange("questionClass", qc);
                    onChange("mcqScoringMode", mcqOptionsForClass(qc)[0]);
                  }}
                >
                  <option value="MCQ Single">MCQs — single correct</option>
                  <option value="MCQ Multi">MCQs — multiple correct</option>
                  <option value="MCQ Weighted">MCQs — weightage / psychometric</option>
                  <option value="Descriptive">Descriptive</option>
                  <option value="Coding">Coding</option>
                </select>
              </div>

              {isMcq && (
                <div className="job-form-row">
                  <label>MCQ scoring</label>
                  <select
                    value={value.mcqScoringMode}
                    onChange={(e) => onChange("mcqScoringMode", e.target.value)}
                  >
                    {mcqOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3 — Window (Scheduled only) */}
        {value.scheduleMode === "Scheduled" && (
          <div className="asm-section">
            <p className="asm-section-label">Test Window</p>
            <div className="asm-section-body">
              <div className="job-form-dual">
                <div className="job-form-row">
                  <label>Window start</label>
                  <input
                    type="datetime-local"
                    value={value.windowStart}
                    onChange={(e) => onChange("windowStart", e.target.value)}
                  />
                </div>
                <div className="job-form-row">
                  <label>Window end</label>
                  <input
                    type="datetime-local"
                    value={value.windowEnd}
                    onChange={(e) => onChange("windowEnd", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4 — Test parameters */}
        <div className="asm-section">
          <p className="asm-section-label">Test Parameters</p>
          <div className="asm-section-body">
            <div className="asm-params-row">
              <div className="job-form-row">
                <label>Duration</label>
                <div className="asm-input-unit">
                  <input
                    type="number"
                    min={0}
                    value={value.durationMinutes || ""}
                    placeholder="60"
                    onChange={(e) => onChange("durationMinutes", Number.parseInt(e.target.value || "0", 10))}
                  />
                  <span className="asm-unit">min</span>
                </div>
              </div>
              <div className="job-form-row">
                <label>Questions</label>
                <div className="asm-input-unit">
                  <input
                    type="number"
                    min={0}
                    value={value.totalQuestions || ""}
                    placeholder="30"
                    onChange={(e) => onChange("totalQuestions", Number.parseInt(e.target.value || "0", 10))}
                  />
                  <span className="asm-unit"># Q</span>
                </div>
              </div>
              <div className="job-form-row">
                <label>Pass mark</label>
                <div className="asm-input-unit">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={value.passingScore || ""}
                    placeholder="60"
                    onChange={(e) => onChange("passingScore", Number.parseFloat(e.target.value || "0"))}
                  />
                  <span className="asm-unit">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5 — Proctoring & Integration */}
        <div className="asm-section">
          <p className="asm-section-label">Proctoring &amp; Integration</p>
          <div className="asm-section-body">
            {/* Proctoring — pill toggles */}
            <div className="job-form-row">
              <label>Proctoring level</label>
              <div className="asm-pill-group">
                {(["None", "Standard", "Full"] as AssessmentProctoringLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`asm-pill${value.proctoringLevel === lvl ? " selected" : ""}`}
                    onClick={() => onChange("proctoringLevel", lvl)}
                  >
                    {lvl}
                    <span className="asm-pill-sub">{PROCTORING_DESCRIPTIONS[lvl]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="job-form-row">
              <label>Integration mode</label>
              <select
                value={value.integrationMode}
                onChange={(e) => onChange("integrationMode", e.target.value as typeof value.integrationMode)}
              >
                <option value="Frappe Native">Frappe native (window monitoring + GIF capture)</option>
                <option value="TAO">TAO — assessments at scale</option>
                <option value="Frappe + TAO">Frappe + TAO (hybrid)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 6 — Questions JSON (optional / advanced) */}
        <details className="asm-advanced">
          <summary className="asm-advanced-toggle">
            Questions JSON <span className="asm-badge-opt">optional</span>
          </summary>
          <div className="asm-section-body">
            <div className="job-form-row">
              <textarea
                value={value.questionsJson}
                onChange={(e) => onChange("questionsJson", e.target.value)}
                placeholder='[{"prompt":"…","options":["A","B","C","D"],"correct":0}]'
                rows={5}
                className="asm-json-area"
              />
            </div>
          </div>
        </details>

        {/* Cost preview card */}
        <div className="asm-cost-card">
          <div className="asm-cost-icon">🪙</div>
          <div className="asm-cost-body">
            <span className="asm-cost-label">Estimated publish cost</span>
            <span className="asm-cost-value">{estimatedCoins} coin{estimatedCoins !== 1 ? "s" : ""}</span>
          </div>
          <p className="asm-cost-note">
            Save as draft first. Coins are deducted only when you click Publish.
          </p>
        </div>

        {error ? <p className="error form-error">{error}</p> : null}

        <div className="job-form-actions">
          <button type="button" className="table-btn secondary" onClick={onReset}>
            Reset
          </button>
          <button type="submit" className="table-btn">
            Save draft
          </button>
        </div>
      </form>

      {/* ── Assessments table ── */}
      <div className="company-table-head" style={{ marginTop: 32 }}>
        <h3>Your assessments</h3>
        <span className="table-caption">{items.length} total</span>
      </div>
      <table className="company-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Mode</th>
            <th>Class</th>
            <th>Proctoring</th>
            <th>Integration</th>
            <th>Status</th>
            <th>Coins</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", color: "var(--dhr-muted)" }}>
                No assessments yet. Create one above.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.title}</strong></td>
                <td>{item.scheduleMode}</td>
                <td>{item.questionClass}</td>
                <td>
                  <span className={`asm-badge-proctoring asm-proctor-${item.proctoringLevel.toLowerCase()}`}>
                    {item.proctoringLevel}
                  </span>
                </td>
                <td>{item.integrationMode}</td>
                <td>
                  <span className={`status-pill ${statusClassMap[item.status]}`}>{item.status}</span>
                  {item.taoSyncStatus && item.taoSyncStatus !== "Pending" ? (
                    <span className="table-caption"> TAO: {item.taoSyncStatus}</span>
                  ) : null}
                </td>
                <td>{item.coinsSpent || "—"}</td>
                <td>
                  {item.status === "Draft" ? (
                    <button
                      type="button"
                      className="table-btn secondary"
                      disabled={publishingId === item.id}
                      onClick={() => onPublish(item.id)}
                    >
                      {publishingId === item.id ? "Publishing…" : "Publish"}
                    </button>
                  ) : item.taoLaunchUrl ? (
                    <a href={item.taoLaunchUrl} target="_blank" rel="noreferrer" className="table-btn secondary">
                      TAO link
                    </a>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
