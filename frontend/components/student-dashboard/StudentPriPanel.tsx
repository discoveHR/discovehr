import type { StudentProfileFlags } from "./types";

type StudentPriPanelProps = {
  profileFlags: StudentProfileFlags;
};

const PRI_STEPS = [
  {
    title: "Complete your profile",
    desc: "Fill every required field, upload a resume, and verify your college details.",
  },
  {
    title: "Finish assigned assessments",
    desc: "Complete college-assigned tests and job skill assessments assigned by recruiters.",
  },
  {
    title: "Attend mock interviews",
    desc: "Schedule sessions, attend, and apply feedback within two weeks for a score boost.",
  },
  {
    title: "Stay active on the job board",
    desc: "Consistent and relevant applications signal genuine engagement to the platform.",
  },
  {
    title: "Complete LMS courses",
    desc: "Finish Moodle courses your TPO marks as mandatory or highly recommended.",
  },
];

export function StudentPriPanel({ profileFlags }: StudentPriPanelProps) {
  const cap = profileFlags.publicJobApply.withoutPriCap;

  return (
    <section className="company-table-wrap">
      {/* Hero */}
      <div className="spri-hero">
        <div className="spri-score-ring">
          <span className="spri-score-value">—</span>
          <span className="spri-score-label">PRI</span>
        </div>
        <div className="spri-hero-text">
          <p className="spri-hero-eyebrow">Placement Readiness Index</p>
          <h3 className="spri-hero-title">Build your readiness score</h3>
          <p className="spri-hero-sub">
            After {cap} public job applications without PRI, you need signals from LMS, assessments, or internship activity.
            Complete the checklist below to lift your score.
          </p>
        </div>
      </div>

      {/* Checklist */}
      <div className="spri-steps">
        {PRI_STEPS.map((step, i) => (
          <div key={step.title} className="spri-step">
            <div className="spri-step-num">{i + 1}</div>
            <div className="spri-step-body">
              <span className="spri-step-title">{step.title}</span>
              <span className="spri-step-desc">{step.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
