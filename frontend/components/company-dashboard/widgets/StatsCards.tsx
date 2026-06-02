import type { JobItem } from "../../../lib/api";

type StatsCardsProps = {
  jobs: JobItem[];
};

export function StatsCards({ jobs }: StatsCardsProps) {
  const active = jobs.filter((item) => item.status === "Active").length;
  const totalViews = jobs.reduce((acc, item) => acc + item.totalViews, 0);
  const totalApplicants = jobs.reduce((acc, item) => acc + item.applications, 0);

  return (
    <section className="company-stats">
      <article className="stat-card">
        <div className="stat-card-top">
          <p>Active Listings</p>
          <span className="stat-card-icon blue">
            <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          </span>
        </div>
        <strong>{active}</strong>
      </article>
      <article className="stat-card">
        <div className="stat-card-top">
          <p>Total Views</p>
          <span className="stat-card-icon green">
            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
        </div>
        <strong>{totalViews.toLocaleString()}</strong>
      </article>
      <article className="stat-card">
        <div className="stat-card-top">
          <p>New Applicants</p>
          <span className="stat-card-icon amber">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </span>
        </div>
        <strong>{totalApplicants}</strong>
      </article>
    </section>
  );
}

