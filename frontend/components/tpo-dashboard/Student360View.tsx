"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchTpoStudent360,
  type StudentProfileData,
  type TpoStudent360Application,
  type TpoStudent360Charts,
  type TpoStudent360Data,
  type TpoStudent360Kpis,
  type TpoStudent360Psychometric,
} from "../../lib/api";

const CHART_COLORS = ["#3b6fd9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

type TabKey = "overview" | "applications" | "assessments";

type Props = {
  studentId: string;
};

export function Student360View({ studentId }: Props) {
  const [data, setData] = useState<TpoStudent360Data | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setData(await fetchTpoStudent360(studentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load student.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <main className="tpo-dashboard">
        <div className="tpo-dashboard-main tpo-student360-wrap">
          <p className="empty-state">Loading student profile…</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="tpo-dashboard">
        <ErrorBlock error={error}>
          <Link href="/tpo/dashboard" className="table-btn secondary tpo-student360-back-btn">
            Back to dashboard
          </Link>
        </ErrorBlock>
      </main>
    );
  }

  const { profile, kpis, charts, tables } = data;
  const displayName = profile.fullName || profile.email || studentId;

  return (
    <main className="tpo-dashboard">
      <div className="tpo-dashboard-main tpo-student360-wrap">
        <header className="tpo-student360-header">
          <StudentHeader displayName={displayName} profile={profile} />
          <button type="button" className="table-btn secondary" onClick={() => void load()}>
            Refresh
          </button>
        </header>

        <KpiRow kpis={kpis} />

        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} tables={tables} />

        {activeTab === "overview" && (
          <>
            <ChartsSection charts={charts} />
            <ProfileSummary profile={profile} kpis={kpis} />
          </>
        )}

        {activeTab === "applications" && <ApplicationsTable rows={tables.applications} />}

        {activeTab === "assessments" && (
          <div className="tpo-student360-split">
            <PsychometricTable rows={tables.psychometricResults} />
            <TrainingAssignmentsTable assignments={tables.trainingAssignments} />
          </div>
        )}
      </div>
    </main>
  );
}

function ErrorBlock({ error, children }: { error: string; children: ReactNode }) {
  return (
    <div className="tpo-dashboard-main tpo-student360-wrap">
      <p className="empty-state">{error || "Student not found."}</p>
      {children}
    </div>
  );
}

function StudentHeader({ displayName, profile }: { displayName: string; profile: StudentProfileData }) {
  return (
    <div>
      <Link href="/tpo/dashboard" className="tpo-student360-back">
        ← Students
      </Link>
      <h1>{displayName}</h1>
      <p className="tpo-student360-sub">
        {profile.email}
        {profile.departmentStream ? ` · ${profile.departmentStream}` : ""}
        {profile.academicYear ? ` · Batch ${profile.academicYear}` : ""}
        {profile.college ? ` · ${profile.college}` : ""}
      </p>
    </div>
  );
}

function KpiRow({ kpis }: { kpis: TpoStudent360Kpis }) {
  return (
    <div className="tpo-home-grid tpo-student360-kpis">
      <div className="tpo-stat-card">
        <h3>PRI score</h3>
        <p className="tpo-stat-value">{Math.round(kpis.priScore)}</p>
      </div>
      <StatCard label="Profile complete" value={`${kpis.profileCompletionPercent}%`} note={kpis.profileComplete ? "All required fields" : "Incomplete"} />
      <StatCard
        label="Applications"
        value={String(kpis.applicationsTotal)}
        note={`${kpis.applicationsShortlisted} shortlisted · ${kpis.applicationsPlaced} placed`}
      />
      <StatCard label="Assessments" value={`${kpis.assessmentsCompleted}/${kpis.assessmentsAssigned}`} note={`${kpis.psychometricResultsCount} scored`} />
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="tpo-stat-card">
      <h3>{label}</h3>
      <p className="tpo-stat-value">{value}</p>
      <p className="tpo-stat-note">{note}</p>
    </div>
  );
}

function TabBar({
  activeTab,
  setActiveTab,
  tables,
}: {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  tables: TpoStudent360Data["tables"];
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "applications", label: `Applications (${tables.applications.length})` },
    { key: "assessments", label: `Assessments (${tables.psychometricResults.length})` },
  ];
  return (
    <div className="tpo-student360-tabs">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`table-btn secondary ${activeTab === key ? "company-filter-active" : ""}`}
          onClick={() => setActiveTab(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ChartsSection({ charts }: { charts: TpoStudent360Charts }) {
  return (
    <div className="tpo-student360-charts">
      <ChartCard title="Applications by status">
        {charts.applicationsByStatus.length === 0 ? (
          <p className="empty-state">No applications yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={charts.applicationsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={72} label>
                {charts.applicationsByStatus.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Assessment scores">
        {charts.psychometricScores.length === 0 ? (
          <p className="empty-state">No completed assessments.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.psychometricScores} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="title" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={56} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" fill="#3b6fd9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Profile completion by section">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={charts.profileSections} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="section" width={88} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${v ?? 0}%`, "Complete"]} />
            <Bar dataKey="percent" fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="tpo-panel tpo-student360-chart-card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function ProfileSummary({ profile, kpis }: { profile: StudentProfileData; kpis: TpoStudent360Kpis }) {
  const rows: { label: string; value: string }[] = [
    { label: "Phone", value: profile.phone },
    { label: "CGPA", value: profile.currentCgpa },
    { label: "Skills", value: profile.skills },
    { label: "Preferred role", value: profile.preferredJobRole },
    { label: "Areas of interest", value: profile.areasOfInterest },
    { label: "Internship", value: profile.internshipExperience },
    { label: "LinkedIn", value: profile.linkedinProfile },
  ].filter((r) => r.value);

  return (
    <div className="tpo-panel tpo-student360-profile">
      <h3>Profile summary</h3>
      <p className="table-caption">
        Submitted: {profile.profileSubmitted ? "Yes" : "No"} · Profile complete: {kpis.profileComplete ? "Yes" : "No"}
        {profile.resumeFile ? (
          <>
            {" "}
            ·{" "}
            <a href={profile.resumeFile} target="_blank" rel="noreferrer">
              Resume
            </a>
          </>
        ) : null}
      </p>
      <dl className="tpo-student360-dl">
        {rows.map(({ label, value }) => (
          <DlEntry key={label} label={label} value={value} />
        ))}
      </dl>
    </div>
  );
}

function DlEntry({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function ApplicationsTable({ rows }: { rows: TpoStudent360Application[] }) {
  return (
    <div className="company-table-wrap tpo-panel">
      <table className="company-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Company</th>
            <th>Status</th>
            <th>Applied</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4}>No applications.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.applicationId}>
                <td>{row.jobTitle}</td>
                <td>{row.companyName || "—"}</td>
                <td>{row.applicationStatus}</td>
                <td>{row.appliedOn || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PsychometricTable({ rows }: { rows: TpoStudent360Psychometric[] }) {
  return (
    <div className="company-table-wrap tpo-panel">
      <h3>Psychometric results</h3>
      <table className="company-table">
        <thead>
          <tr>
            <th>Assessment</th>
            <th>Score</th>
            <th>Completed</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3}>No results.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.resultId}>
                <td>{row.assessmentTitle}</td>
                <td>{row.overallScore}</td>
                <td>{row.completedAt || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TrainingAssignmentsTable({
  assignments,
}: {
  assignments: TpoStudent360Data["tables"]["trainingAssignments"];
}) {
  return (
    <div className="company-table-wrap tpo-panel">
      <h3>Training assignments</h3>
      <table className="company-table">
        <thead>
          <tr>
            <th>Assessment</th>
            <th>Status</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {assignments.length === 0 ? (
            <tr>
              <td colSpan={3}>No assignments.</td>
            </tr>
          ) : (
            assignments.map((row) => (
              <tr key={row.assignmentId}>
                <td>{row.assessmentTitle}</td>
                <td>{row.status}</td>
                <td>{row.dueAt || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
