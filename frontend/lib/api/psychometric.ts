import {
  API_URL,
  frappeGuestPreflight,
  messageFromFrappeBody,
  readScoutApiJson,
  scoutJsonHeaders,
} from "./client";

export type PsychometricAssessment = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  status: string;
  taoTestId: string;
  taoSyncStatus: string;
  taoSyncMessage: string;
  assignmentCount: number;
};

export type PsychometricTraitScores = Record<string, number | string>;

export type PsychometricResult = {
  id: string;
  assignmentId: string;
  assessmentId: string;
  overallScore: number;
  scores: PsychometricTraitScores;
  traits: Record<string, string>;
  recommendations: string;
  completedAt: string;
};

export type PsychometricAssignment = {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentDescription?: string;
  durationMinutes?: number;
  assessmentStatus?: string;
  studentUser?: string;
  studentEmail?: string;
  studentName?: string;
  status: string;
  dueAt: string;
  scheduledFrom: string;
  startedAt: string;
  completedAt: string;
  hasResult: boolean;
  launchUrl?: string;
  result?: PsychometricResult | null;
};

export type PsychometricModuleConfig = {
  devMode: boolean;
  taoConfigured: boolean;
  webhookConfigured: boolean;
  coinPriceInr?: number;
};

async function callPsychometricApi<T>(path: string, init?: RequestInit): Promise<T> {
  if (init?.method === "POST") {
    await frappeGuestPreflight();
  }
  const response = await fetch(`${API_URL}/api/method/${path}`, {
    ...init,
    headers: {
      ...scoutJsonHeaders(),
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<T>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Request failed.");
  }
  return (body.data ?? body) as T;
}

export async function getPsychometricModuleConfig() {
  return callPsychometricApi<PsychometricModuleConfig>("scout.api.psychometric_api.get_psychometric_config", {
    method: "GET",
  });
}

export async function listAdminPsychometricAssessments() {
  const data = await callPsychometricApi<{ assessments: PsychometricAssessment[] }>(
    "scout.api.psychometric_api.list_psychometric_assessments",
    { method: "GET" },
  );
  return data.assessments || [];
}

export async function createAdminPsychometricAssessment(payload: {
  title: string;
  description?: string;
  durationMinutes: number;
  status?: string;
  taoTestId?: string;
}) {
  const data = await callPsychometricApi<{ assessment: PsychometricAssessment }>(
    "scout.api.psychometric_api.create_psychometric_assessment",
    { method: "POST", body: JSON.stringify(payload) },
  );
  return data.assessment;
}

export async function assignPsychometricToStudents(payload: {
  assessmentId: string;
  studentEmails?: string[];
  studentIds?: string[];
  collegeId?: string;
  collegeName?: string;
  assignAllCollegeStudents?: boolean;
  dueAt?: string;
}) {
  return callPsychometricApi<{ created: PsychometricAssignment[]; skipped: { email: string; reason: string }[] }>(
    "scout.api.psychometric_api.assign_psychometric_to_students",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function listAdminPsychometricAssignments(assessmentId?: string) {
  const qs = assessmentId ? `?assessmentId=${encodeURIComponent(assessmentId)}` : "";
  const data = await callPsychometricApi<{ assignments: PsychometricAssignment[] }>(
    `scout.api.psychometric_api.admin_list_assignments${qs}`,
    { method: "GET" },
  );
  return data.assignments || [];
}

export async function simulatePsychometricWebhook(assignmentId: string) {
  if (typeof window !== "undefined") await frappeGuestPreflight();
  const response = await fetch(`${API_URL}/api/method/scout.api.psychometric_api.simulate_psychometric_webhook`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ assignmentId }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Simulate failed.");
  }
  return { message: body.message || "Simulated result saved." };
}

export async function listStudentPsychometricAssignments() {
  const data = await callPsychometricApi<{ assignments: PsychometricAssignment[] }>(
    "scout.api.student.list_psychometric_assignments",
    { method: "GET" },
  );
  return data.assignments || [];
}

export async function launchStudentPsychometricAssignment(assignmentId: string) {
  return callPsychometricApi<{
    assignmentId: string;
    mode: string;
    launchUrl: string;
    devMode: boolean;
  }>("scout.api.student.launch_psychometric_assignment", {
    method: "POST",
    body: JSON.stringify({ assignmentId }),
  });
}

export async function submitStudentPsychometricDevResult(assignmentId: string) {
  return callPsychometricApi<{ assignmentId: string }>("scout.api.student.submit_psychometric_dev_result", {
    method: "POST",
    body: JSON.stringify({ assignmentId }),
  });
}

export async function getStudentPsychometricResult(assignmentId: string) {
  const data = await callPsychometricApi<{
    assignment: PsychometricAssignment;
    result: PsychometricResult;
  }>(`scout.api.student.get_psychometric_result?assignmentId=${encodeURIComponent(assignmentId)}`, {
    method: "GET",
  });
  return data;
}
