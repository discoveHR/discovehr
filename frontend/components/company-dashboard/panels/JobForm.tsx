import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { JobFormPayload } from "../../../lib/api";
import type { JourneyStageDef } from "../../../lib/journey-stages";
import {
  JOURNEY_STAGE_TYPE_OPTIONS,
  defaultJourneyStages,
  labelForStageType,
  newStageId,
  normalizeStageDef,
  type JourneyStageType,
} from "../../../lib/journey-stages";

type JobFormProps = {
  value: JobFormPayload;
  error: string;
  onChange: <K extends keyof JobFormPayload>(key: K, val: JobFormPayload[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  focusTrigger?: number;
};

type DraftState = {
  activeStep: number;
  department: string;
  jobLocations: string[];
  qualification: string;
  genderPreference: string;
  candidateIndustries: string[];
  languagesKnown: string[];
  questionDraft: string;
  questions: string[];
  skillChips: string[];
};

const DRAFT_KEY = "scout_company_post_job_draft_v1";

function ChipInput({
  label,
  value,
  onChange,
  chips,
  onAddChip,
  onRemoveChip,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  chips: string[];
  onAddChip: () => void;
  onRemoveChip: (chip: string) => void;
  placeholder: string;
}) {
  return (
    <div className="job-form-row">
      <label>{label}</label>
      <div className="chip-input-wrap">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              onAddChip();
            }
          }}
          placeholder={placeholder}
        />
        <button type="button" className="table-btn secondary chip-add-btn" onClick={onAddChip}>
          Add
        </button>
      </div>
      {chips.length > 0 ? (
        <div className="chip-list">
          {chips.map((chip) => (
            <button key={chip} type="button" className="chip-item" onClick={() => onRemoveChip(chip)}>
              {chip} <span>&times;</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const INDIA_CITIES = [
  "Agra", "Ahmedabad", "Ajmer", "Aligarh", "Allahabad", "Amritsar", "Aurangabad",
  "Bangalore", "Bareilly", "Belgaum", "Bhopal", "Bhubaneswar",
  "Chandigarh", "Chennai", "Coimbatore",
  "Dehradun", "Delhi", "Dhanbad", "Durgapur",
  "Faridabad", "Ghaziabad", "Gorakhpur", "Gurugram", "Guwahati",
  "Howrah", "Hubli", "Hyderabad",
  "Indore",
  "Jabalpur", "Jaipur", "Jalandhar", "Jammu", "Jamshedpur", "Jodhpur",
  "Kanpur", "Kochi", "Kolhapur", "Kolkata",
  "Lucknow", "Ludhiana",
  "Madurai", "Meerut", "Mumbai", "Mysuru",
  "Nagpur", "Nashik", "Navi Mumbai", "Noida",
  "Pan India", "Patna", "Pune",
  "Raipur", "Rajkot", "Ranchi", "Remote",
  "Salem", "Srinagar", "Surat",
  "Thane", "Thiruvananthapuram", "Tiruchirappalli",
  "Udaipur",
  "Vadodara", "Varanasi", "Vijayawada", "Visakhapatnam",
  "Warangal",
];

function LocationChipInput({
  chips,
  onAddChip,
  onRemoveChip,
}: {
  chips: string[];
  onAddChip: (city: string) => void;
  onRemoveChip: (chip: string) => void;
}) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return [];
    return INDIA_CITIES.filter(
      (c) => c.toLowerCase().includes(q) && !chips.includes(c),
    ).slice(0, 7);
  }, [input, chips]);

  useEffect(() => {
    setShowDropdown(suggestions.length > 0);
  }, [suggestions]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function commit(city: string) {
    const trimmed = city.trim();
    if (!trimmed || chips.includes(trimmed)) return;
    onAddChip(trimmed);
    setInput("");
    setShowDropdown(false);
  }

  return (
    <div className="job-form-row">
      <label>Job location</label>
      <div className="location-input-wrap" ref={containerRef}>
        <div className="chip-input-wrap">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(input); }
              if (e.key === "Escape") setShowDropdown(false);
              if (e.key === "ArrowDown" && showDropdown) {
                e.preventDefault();
                (containerRef.current?.querySelector(".loc-suggestion-item") as HTMLElement)?.focus();
              }
            }}
            placeholder="Search city — e.g. Bangalore, Remote"
            autoComplete="off"
          />
          <button type="button" className="table-btn secondary chip-add-btn" onClick={() => commit(input)}>
            Add
          </button>
        </div>

        {showDropdown && (
          <ul className="loc-suggestions">
            {suggestions.map((city) => (
              <li
                key={city}
                className="loc-suggestion-item"
                tabIndex={-1}
                onMouseDown={(e) => { e.preventDefault(); commit(city); }}
                onKeyDown={(e) => { if (e.key === "Enter") commit(city); }}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {city}
              </li>
            ))}
          </ul>
        )}
      </div>

      {chips.length > 0 && (
        <div className="chip-list">
          {chips.map((chip) => (
            <button key={chip} type="button" className="chip-item" onClick={() => onRemoveChip(chip)}>
              {chip} <span>&times;</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function JobForm({ value, error, onChange, onSubmit, onReset, focusTrigger = 0 }: JobFormProps) {
  const steps = useMemo(
    () => [
      { id: "job-details", label: "Job Details" },
      { id: "candidate-preferences", label: "Candidate Preferences" },
      { id: "screening-questions", label: "Criteria Questions" },
      { id: "job-description", label: "Job Description" },
      { id: "recruitment-journey", label: "Journey Setup" },
    ],
    [],
  );
  const journeyStages = value.journeyStages?.length ? value.journeyStages : defaultJourneyStages();
  const [activeStep, setActiveStep] = useState(0);
  const [department, setDepartment] = useState("");
  const [jobLocations, setJobLocations] = useState<string[]>([]);
  const [qualification, setQualification] = useState("Graduate");
  const [genderPreference, setGenderPreference] = useState("Any");
  const [candidateIndustryInput, setCandidateIndustryInput] = useState("");
  const [candidateIndustries, setCandidateIndustries] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");
  const [languagesKnown, setLanguagesKnown] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [skillChips, setSkillChips] = useState<string[]>(
    value.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const [questionDraft, setQuestionDraft] = useState("");
  const [questions, setQuestions] = useState<string[]>(value.screeningQuestion ? [value.screeningQuestion] : []);
  const [stepError, setStepError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string>("");
  const formRootRef = useRef<HTMLElement | null>(null);
  const jobTitleRef = useRef<HTMLInputElement | null>(null);

  function addChip(input: string, chips: string[], setInput: (val: string) => void, setChips: (val: string[]) => void) {
    const next = input.trim();
    if (!next || chips.includes(next)) return;
    setChips([...chips, next]);
    setInput("");
  }

  function removeChip(chip: string, chips: string[], setChips: (val: string[]) => void) {
    setChips(chips.filter((item) => item !== chip));
  }

  function validateStep(step: number) {
    if (step === 0) {
      if (!value.title.trim()) return "Job title is required.";
      if (!value.openings || value.openings <= 0) return "Please enter valid openings.";
      if (!value.minSalary.trim() || !value.maxSalary.trim()) return "Please enter salary range.";
      return "";
    }
    if (step === 1) {
      if (!department.trim()) return "Department is required.";
      if (jobLocations.length === 0) return "Add at least one job location.";
      if (skillChips.length === 0) return "Add at least one skill.";
      return "";
    }
    if (step === 2) {
      if (questions.length === 0) return "Add at least one screening question.";
      return "";
    }
    if (step === 3) {
      if (!value.description.trim()) return "Job description is required.";
      return "";
    }
    if (step === 4) {
      if (!journeyStages.length) return "Add at least one journey stage.";
      return "";
    }
    return "";
  }

  function updateJourneyStage(index: number, patch: Partial<JourneyStageDef>) {
    const next = [...journeyStages];
    const merged = { ...next[index], ...patch };
    if (patch.type && patch.type !== "custom") {
      merged.label = labelForStageType(patch.type as JourneyStageType);
    }
    next[index] = normalizeStageDef(merged);
    onChange("journeyStages", next);
  }

  function addJourneyStage() {
    onChange("journeyStages", [...journeyStages, { id: newStageId(), type: "psychometric", label: labelForStageType("psychometric") }]);
  }

  function removeJourneyStage(index: number) {
    if (journeyStages.length <= 1) return;
    onChange(
      "journeyStages",
      journeyStages.filter((_, i) => i !== index),
    );
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as DraftState;
      setActiveStep(draft.activeStep || 0);
      setDepartment(draft.department || "");
      setJobLocations(draft.jobLocations || []);
      setQualification(draft.qualification || "Graduate");
      setGenderPreference(draft.genderPreference || "Any");
      setCandidateIndustries(draft.candidateIndustries || []);
      setLanguagesKnown(draft.languagesKnown || []);
      setQuestionDraft(draft.questionDraft || "");
      setQuestions(draft.questions || []);
      setSkillChips(draft.skillChips || []);
    } catch {
      // ignore corrupt drafts
    }
  }, []);

  useEffect(() => {
    const payload: DraftState = {
      activeStep,
      department,
      jobLocations,
      qualification,
      genderPreference,
      candidateIndustries,
      languagesKnown,
      questionDraft,
      questions,
      skillChips,
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    setLastSavedAt(new Date().toLocaleTimeString());
  }, [activeStep, department, jobLocations, qualification, genderPreference, candidateIndustries, languagesKnown, questionDraft, questions, skillChips]);

  useEffect(() => {
    onChange("skills", skillChips.join(", "));
  }, [skillChips, onChange]);

  useEffect(() => {
    formRootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      jobTitleRef.current?.focus();
    }, 150);
  }, [focusTrigger]);

  function nextStep() {
    const validation = validateStep(activeStep);
    if (validation) {
      setStepError(validation);
      return;
    }
    setStepError("");
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  }

  function previousStep() {
    setStepError("");
    setActiveStep((prev) => Math.max(prev - 1, 0));
  }

  function handleAddQuestion() {
    const cleaned = questionDraft.trim();
    if (!cleaned) return;
    const updated = [...questions, cleaned];
    setQuestions(updated);
    onChange("screeningQuestion", updated.join("\n"));
    setQuestionDraft("");
  }

  function handleRemoveQuestion(index: number) {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    onChange("screeningQuestion", updated.join("\n"));
  }

  function handleResetForm() {
    onReset();
    window.localStorage.removeItem(DRAFT_KEY);
    setDepartment("");
    setJobLocations([]);
    setQualification("Graduate");
    setGenderPreference("Any");
    setCandidateIndustryInput("");
    setCandidateIndustries([]);
    setLanguageInput("");
    setLanguagesKnown([]);
    setSkillInput("");
    setSkillChips([]);
    setQuestionDraft("");
    setQuestions([]);
    setStepError("");
    setActiveStep(0);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const preferencesBundle = [
      department ? `Department: ${department}` : "",
      jobLocations.length ? `Job Locations: ${jobLocations.join(", ")}` : "",
      qualification ? `Qualification: ${qualification}` : "",
      genderPreference ? `Gender Preference: ${genderPreference}` : "",
      candidateIndustries.length ? `Candidate Industries: ${candidateIndustries.join(", ")}` : "",
      languagesKnown.length ? `Languages Known: ${languagesKnown.join(", ")}` : "",
      value.preferences,
    ]
      .filter(Boolean)
      .join("\n");

    if (preferencesBundle !== value.preferences) {
      onChange("preferences", preferencesBundle);
    }

    if (questions.length > 0) {
      onChange("screeningQuestion", questions.join("\n"));
    }

    window.localStorage.removeItem(DRAFT_KEY);
    onSubmit(event);
  }

  return (
    <section className="company-table-wrap" ref={formRootRef}>
      <div className="job-wizard-topbar">
        <div className="job-wizard-topbar-title">
          <h3>Post a job</h3>
          <span className="job-wizard-free-badge">Free</span>
        </div>
        <span className="table-caption">Job details, criteria questions, description, and recruitment journey</span>
      </div>

      <div className="company-table-head">
        <div className="job-wizard-company-row">
          <span>Company you&apos;re hiring for</span>
          <strong>Scout Express</strong>
          <button type="button">Change</button>
        </div>
      </div>

      <form className="job-wizard-layout" onSubmit={handleSubmit}>
        <aside className="job-wizard-steps">
          {steps.map((step, index) => {
            const state = index === activeStep ? "active" : index < activeStep ? "complete" : "pending";
            return (
              <button key={step.id} type="button" className={`wizard-step ${state}`} onClick={() => setActiveStep(index)}>
                <span className="wizard-step-track">
                  <span className="wizard-step-dot">{index < activeStep ? "✓" : index + 1}</span>
                  {index < steps.length - 1 ? <span className="wizard-step-line" /> : null}
                </span>
                <span className="wizard-step-label">{step.label}</span>
              </button>
            );
          })}
        </aside>

        <div className="job-wizard-panel">
          <p className="draft-note">Draft autosave: {lastSavedAt || "just now"}</p>
          {activeStep === 0 && (
            <>
              <div className="job-form-row">
                <label>Company you are hiring for</label>
                <input value="Scout Express" readOnly />
              </div>

              <div className="job-form-row">
                <label>Opportunity type</label>
                <select value={value.opportunityType} onChange={(e) => onChange("opportunityType", e.target.value as JobFormPayload["opportunityType"])}>
                  <option>Job</option>
                  <option>Internship</option>
                </select>
              </div>

              <div className="job-form-row">
                <label>Job title</label>
                <input ref={jobTitleRef} value={value.title} onChange={(e) => onChange("title", e.target.value)} placeholder="e.g. Freelancer" />
              </div>

              <div className="job-form-dual">
                <div className="job-form-row">
                  <label>Work experience</label>
                  <select value={value.minExperience} onChange={(e) => onChange("minExperience", e.target.value)}>
                    <option>0 year</option>
                    <option>1 year</option>
                    <option>2 years</option>
                    <option>3 years</option>
                    <option>5 years</option>
                  </select>
                </div>
                <div className="job-form-row">
                  <label>Openings</label>
                  <input
                    value={value.openings ? String(value.openings) : ""}
                    onChange={(e) => onChange("openings", Number.parseInt(e.target.value || "0", 10))}
                    placeholder="e.g. 4"
                  />
                </div>
              </div>

              <div className="job-form-dual">
                <div className="job-form-row">
                  <label>Salary per month (min)</label>
                  <input value={value.minSalary} onChange={(e) => onChange("minSalary", e.target.value)} placeholder="e.g. 5000" />
                </div>
                <div className="job-form-row">
                  <label>Salary per month (max)</label>
                  <input value={value.maxSalary} onChange={(e) => onChange("maxSalary", e.target.value)} placeholder="e.g. 10000" />
                </div>
              </div>

              <div className="job-form-row">
                <label>Perks and benefits (optional)</label>
                <input
                  value={value.preferences}
                  onChange={(e) => onChange("preferences", e.target.value)}
                  placeholder="e.g. Health insurance, Annual bonus"
                />
              </div>
            </>
          )}

          {activeStep === 1 && (
            <>
              <div className="job-form-row">
                <label>Department</label>
                <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Data Science & Machine Learning" />
              </div>

              <LocationChipInput
                chips={jobLocations}
                onAddChip={(city) => { if (!jobLocations.includes(city)) setJobLocations([...jobLocations, city]); }}
                onRemoveChip={(chip) => setJobLocations(jobLocations.filter((l) => l !== chip))}
              />

              <div className="job-form-row">
                <label>Candidate qualification</label>
                <select value={qualification} onChange={(e) => setQualification(e.target.value)}>
                  <option>12th Pass</option>
                  <option>Diploma</option>
                  <option>Graduate</option>
                  <option>Post-Graduate</option>
                </select>
              </div>

              <div className="job-form-row">
                <label>Gender preference</label>
                <select value={genderPreference} onChange={(e) => setGenderPreference(e.target.value)}>
                  <option>Any</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>

              <ChipInput
                label="Add skills"
                value={skillInput}
                onChange={setSkillInput}
                chips={skillChips}
                onAddChip={() => addChip(skillInput, skillChips, setSkillInput, setSkillChips)}
                onRemoveChip={(chip) => removeChip(chip, skillChips, setSkillChips)}
                placeholder="Skills needed for this job"
              />

              <ChipInput
                label="Candidate industry you want to hire from"
                value={candidateIndustryInput}
                onChange={setCandidateIndustryInput}
                chips={candidateIndustries}
                onAddChip={() => addChip(candidateIndustryInput, candidateIndustries, setCandidateIndustryInput, setCandidateIndustries)}
                onRemoveChip={(chip) => removeChip(chip, candidateIndustries, setCandidateIndustries)}
                placeholder="Search for candidate industries"
              />

              <ChipInput
                label="Languages known (optional)"
                value={languageInput}
                onChange={setLanguageInput}
                chips={languagesKnown}
                onAddChip={() => addChip(languageInput, languagesKnown, setLanguageInput, setLanguagesKnown)}
                onRemoveChip={(chip) => removeChip(chip, languagesKnown, setLanguagesKnown)}
                placeholder="e.g. English, Hindi, Tamil"
              />
            </>
          )}

          {activeStep === 2 && (
            <>
              <div className="job-form-row">
                <label>Add a screening question</label>
                <div className="screening-add">
                  <input value={questionDraft} onChange={(e) => setQuestionDraft(e.target.value)} placeholder="Type question and click Add" />
                  <button type="button" className="table-btn secondary" onClick={handleAddQuestion}>
                    Add
                  </button>
                </div>
              </div>

              <div className="screening-list">
                {(questions.length ? questions : ["What is your current salary?", "What is your expected salary?", "What is your notice period?"]).map(
                  (question, index) => (
                    <div key={`${question}-${index}`} className="screening-item">
                      <span>{question}</span>
                      {questions.length ? (
                        <button type="button" onClick={() => handleRemoveQuestion(index)}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ),
                )}
              </div>
            </>
          )}

          {activeStep === 3 && (
            <div className="job-form-row">
              <label>Job description</label>
              <textarea value={value.description} onChange={(e) => onChange("description", e.target.value)} placeholder="Responsibilities, expectations, and outcomes..." />
            </div>
          )}

          {activeStep === 4 && (
            <>
              <p className="table-caption">Journey steps: application received, then add psychometric, aptitude, technical, floating, or interview stages.</p>
              <div className="journey-stage-list">
                {journeyStages.map((stage, index) => (
                  <div key={stage.id} className="journey-stage-row">
                    <span className="journey-stage-index">{index + 1}</span>
                    <select
                      value={stage.type}
                      onChange={(e) => updateJourneyStage(index, { type: e.target.value as JourneyStageType })}
                      disabled={stage.type === "application_received" && index === 0}
                    >
                      {JOURNEY_STAGE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {stage.type === "custom" ? (
                      <input value={stage.label} onChange={(e) => updateJourneyStage(index, { label: e.target.value })} placeholder="Custom stage" />
                    ) : (
                      <input value={stage.label} readOnly className="readonly-field" />
                    )}
                    <button type="button" className="table-btn secondary" onClick={() => removeJourneyStage(index)} disabled={journeyStages.length <= 1}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="table-btn secondary" onClick={addJourneyStage}>
                Add stage
              </button>
            </>
          )}

          {stepError ? <p className="error form-error">{stepError}</p> : null}
          {error ? <p className="error form-error">{error}</p> : null}

          <div className="job-form-actions">
            <button type="button" className="table-btn secondary" onClick={handleResetForm}>
              Reset
            </button>
            {activeStep > 0 ? (
              <button type="button" className="table-btn secondary" onClick={previousStep}>
                Back
              </button>
            ) : null}
            {activeStep < steps.length - 1 ? (
              <button type="button" className="table-btn" onClick={nextStep}>
                Next
              </button>
            ) : (
              <button type="submit" className="table-btn">
                Post job
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}

