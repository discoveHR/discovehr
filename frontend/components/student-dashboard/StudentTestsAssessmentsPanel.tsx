"use client";

import { useState } from "react";
import { StudentAptitudePanel } from "./StudentAptitudePanel";
import { StudentPsychometricPanel } from "./StudentPsychometricPanel";

type TestTab = "psychometric" | "aptitude";

export function StudentTestsAssessmentsPanel() {
  const [tab, setTab] = useState<TestTab>("psychometric");

  return (
    <>
      <div className="stab-switcher">
        <button
          type="button"
          className={`stab-btn${tab === "psychometric" ? " stab-btn--active" : ""}`}
          onClick={() => setTab("psychometric")}
        >
          Psychometric
        </button>
        <button
          type="button"
          className={`stab-btn${tab === "aptitude" ? " stab-btn--active" : ""}`}
          onClick={() => setTab("aptitude")}
        >
          Aptitude
        </button>
      </div>
      {tab === "psychometric" ? <StudentPsychometricPanel /> : <StudentAptitudePanel />}
    </>
  );
}
