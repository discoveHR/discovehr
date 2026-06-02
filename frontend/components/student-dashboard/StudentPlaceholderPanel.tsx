type StudentPlaceholderPanelProps = {
  title: string;
  caption: string;
  children: React.ReactNode;
};

export function StudentPlaceholderPanel({ title, caption, children }: StudentPlaceholderPanelProps) {
  return (
    <section className="company-table-wrap">
      <div className="company-table-head">
        <h3>{title}</h3>
        <span className="table-caption">{caption}</span>
      </div>
      <div className="sph-body">
        <div className="sph-coming-badge">
          <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Coming soon
        </div>
        {children}
      </div>
    </section>
  );
}
