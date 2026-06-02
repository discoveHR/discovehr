import {
  API_URL,
  frappeGuestPreflight,
  messageFromFrappeBody,
  readScoutApiJson,
  scoutJsonHeaders,
} from "./client";

export type AptitudeAssessment = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  status: string;
  taoTestId: string;
  taoSyncStatus: string;
  taoSyncMessage: string;
  createdByTpo?: boolean;
  assignmentCount: number;
};

export type AptitudeResult = {
  id: string;
  assignmentId: string;
  assessmentId: string;
  overallScore: number;
  scores: Record<string, number | string>;
  traits: Record<string, string>;
  recommendations: string;
  completedAt: string;
};

export type AptitudeAssignment = {
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
  result?: AptitudeResult | null;
};

export type AptitudeModuleConfig = {
  devMode: boolean;
  aptitudeDevMode?: boolean;
  taoConfigured: boolean;
  webhookConfigured: boolean;
  tpoCreateFeeInr?: number;
};

async function callAptitudeApi<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function getAptitudeModuleConfig() {
  return callAptitudeApi<AptitudeModuleConfig>("scout.api.aptitude_api.get_aptitude_config", { method: "GET" });
}

export async function listAdminAptitudeAssessments() {
  const data = await callAptitudeApi<{ assessments: AptitudeAssessment[] }>(
    "scout.api.aptitude_api.list_aptitude_assessments",
    { method: "GET" },
  );
  return data.assessments || [];
}

export async function createAdminAptitudeAssessment(payload: {
  title: string;
  description?: string;
  durationMinutes: number;
  status?: string;
  taoTestId?: string;
}) {
  const data = await callAptitudeApi<{ assessment: AptitudeAssessment }>(
    "scout.api.aptitude_api.create_aptitude_assessment",
    { method: "POST", body: JSON.stringify(payload) },
  );
  return data.assessment;
}

export async function assignAptitudeToStudents(payload: {
  assessmentId: string;
  studentEmails?: string[];
  studentIds?: string[];
  collegeId?: string;
  collegeName?: string;
  assignAllCollegeStudents?: boolean;
  dueAt?: string;
}) {
  return callAptitudeApi<{ created: AptitudeAssignment[]; skipped: { email: string; reason: string }[] }>(
    "scout.api.aptitude_api.assign_aptitude_to_students",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function listAdminAptitudeAssignments(assessmentId?: string) {
  const qs = assessmentId ? `?assessmentId=${encodeURIComponent(assessmentId)}` : "";
  const data = await callAptitudeApi<{ assignments: AptitudeAssignment[] }>(
    `scout.api.aptitude_api.admin_list_assignments${qs}`,
    { method: "GET" },
  );
  return data.assignments || [];
}

export async function simulateAptitudeWebhook(assignmentId: string) {
  if (typeof window !== "undefined") await frappeGuestPreflight();
  const response = await fetch(`${API_URL}/api/method/scout.api.aptitude_api.simulate_aptitude_webhook`, {
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

export async function listStudentAptitudeAssignments() {
  const data = await callAptitudeApi<{ assignments: AptitudeAssignment[] }>(
    "scout.api.student.list_aptitude_assignments",
    { method: "GET" },
  );
  return data.assignments || [];
}

export async function launchStudentAptitudeAssignment(assignmentId: string) {
  return callAptitudeApi<{
    assignmentId: string;
    mode: string;
    launchUrl: string;
    devMode: boolean;
  }>("scout.api.student.launch_aptitude_assignment", {
    method: "POST",
    body: JSON.stringify({ assignmentId }),
  });
}

export async function submitStudentAptitudeDevResult(assignmentId: string) {
  return callAptitudeApi<{ assignmentId: string }>("scout.api.student.submit_aptitude_dev_result", {
    method: "POST",
    body: JSON.stringify({ assignmentId }),
  });
}
