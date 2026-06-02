export type JourneyStageType =
  | "application_received"
  | "psychometric"
  | "technical"
  | "aptitude"
  | "floating_test"
  | "interview"
  | "freelance_interview"
  | "custom";

export type JourneyStageDef = {
  id: string;
  type: JourneyStageType;
  label: string;
};

export const JOURNEY_STAGE_TYPE_OPTIONS: { value: JourneyStageType; label: string }[] = [
  { value: "application_received", label: "Application received" },
  { value: "psychometric", label: "Psychometric test" },
  { value: "technical", label: "Technical test" },
  { value: "aptitude", label: "Aptitude test" },
  { value: "floating_test", label: "Floating test (no schedule)" },
  { value: "interview", label: "Interview" },
  { value: "freelance_interview", label: "Freelance interview" },
  { value: "custom", label: "Custom stage" },
];

const TYPE_LABELS: Record<JourneyStageType, string> = {
  application_received: "Application received",
  psychometric: "Psychometric test",
  technical: "Technical test",
  aptitude: "Aptitude test",
  floating_test: "Floating test (no schedule)",
  interview: "Interview",
  freelance_interview: "Freelance interview",
  custom: "Custom stage",
};

export function defaultJourneyStages(): JourneyStageDef[] {
  return [{ id: newStageId(), type: "application_received", label: TYPE_LABELS.application_received }];
}

export function newStageId() {
  return `st-${Math.random().toString(36).slice(2, 9)}`;
}

export function labelForStageType(type: JourneyStageType, customLabel?: string) {
  if (type === "custom") {
    return (customLabel || "").trim() || TYPE_LABELS.custom;
  }
  return TYPE_LABELS[type];
}

export function normalizeStageDef(raw: { id?: string; type?: string; label?: string; customLabel?: string }): JourneyStageDef {
  const type = (raw.type || "custom") as JourneyStageType;
  const label = (raw.label || "").trim() || labelForStageType(type);
  return {
    id: raw.id || newStageId(),
    type,
    label,
  };
}

export const OFFER_LETTER_MACRO =
  "We are pleased to offer you this role. Our HR team will share joining formalities, compensation breakdown, and start date shortly.";
