import { API_URL, messageFromFrappeBody, readScoutApiJson, scoutJsonHeaders } from "./client";

export type PlacementCalendarEvent = {
  id: string;
  title: string;
  eventType: string;
  startDatetime: string;
  endDatetime: string;
  linkedJobId: string;
  slotsAvailable: number;
  applyOnlyIfSuggested: boolean;
  status: string;
};

export type TrainingSession = {
  id: string;
  title: string;
  department: string;
  startDatetime: string;
  endDatetime: string;
  status: string;
};

export type MockExam = {
  id: string;
  title: string;
  examDatetime: string;
  feeInr: number;
  priPointsOnPass: number;
  status: string;
  registrationCount: number;
  registrations?: Array<{
    name: string;
    student_user: string;
    studentName?: string;
    studentEmail?: string;
    payment_status: string;
    score_percent?: number;
    passed?: number;
  }>;
};

async function tpoCalendarCall<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api/method/${path}`, {
    ...init,
    headers: scoutJsonHeaders({
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<T>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Request failed.");
  }
  return (body.data ?? body) as T;
}

export async function listPlacementCalendarEvents() {
  return tpoCalendarCall<{ events: PlacementCalendarEvent[] }>("scout.api.tpo.list_placement_calendar_events", {
    method: "GET",
  });
}

export async function createPlacementCalendarEvent(payload: Record<string, unknown>) {
  return tpoCalendarCall<{ event: PlacementCalendarEvent }>("scout.api.tpo.create_placement_calendar_event", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listTrainingSessions() {
  return tpoCalendarCall<{ sessions: TrainingSession[] }>("scout.api.tpo.list_training_sessions", {
    method: "GET",
  });
}

export async function createTrainingSession(payload: Record<string, unknown>) {
  return tpoCalendarCall<{ session: TrainingSession }>("scout.api.tpo.create_training_session", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listMockExams() {
  return tpoCalendarCall<{ exams: MockExam[] }>("scout.api.tpo.list_mock_exams", {
    method: "GET",
  });
}

export async function createMockExam(payload: Record<string, unknown>) {
  return tpoCalendarCall<{ exam: MockExam }>("scout.api.tpo.create_mock_exam", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function publishMockExamResults(
  examId: string,
  results: Array<{ registrationId: string; scorePercent: number; passed: boolean }>,
) {
  return tpoCalendarCall<Record<string, never>>("scout.api.tpo.publish_mock_exam_results", {
    method: "POST",
    body: JSON.stringify({ examId, results }),
  });
}

/** Merge HTML date + time fields into API datetime (ISO-like). */
export function mergeDateAndTime(date: string, time: string): string {
  const d = date.trim();
  if (!d) return "";
  const t = (time.trim() || "09:00").slice(0, 5);
  return `${d}T${t}:00`;
}

export function formatDatetimeForDisplay(value: string): string {
  if (!value) return "—";
  const d = new Date(value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value.slice(0, 16);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
