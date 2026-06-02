import { API_URL, messageFromFrappeBody, readScoutApiJson, scoutJsonHeaders } from "./client";

async function parse<T>(response: Response): Promise<T> {
  const { body, raw } = await readScoutApiJson<T>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Request failed.");
  }
  return body.data as T;
}

export type StudentPlacementEvent = {
  id: string;
  title: string;
  eventType: string;
  startDatetime: string;
  endDatetime: string;
  location: string;
  description: string;
  linkedJobId: string;
  canApply: boolean;
  applyOnlyIfSuggested: boolean;
};

export type StudentTrainingSession = {
  id: string;
  title: string;
  department: string;
  startDatetime: string;
  endDatetime: string;
  location: string;
  trainer: string;
  description: string;
};

export type StudentMockExam = {
  id: string;
  title: string;
  examDatetime: string;
  feeInr: number;
  durationMinutes: number;
  instructions: string;
  resultsPublished: boolean;
  registered: boolean;
  registration?: { name: string; payment_status: string; score_percent?: number; passed?: number } | null;
};

export async function listStudentPlacementCalendar() {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.list_student_placement_calendar`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  return parse<{ events: StudentPlacementEvent[] }>(response);
}

export async function listStudentTrainingCalendar() {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.list_student_training_calendar`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  return parse<{ sessions: StudentTrainingSession[] }>(response);
}

export async function listStudentMockExams() {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.list_student_mock_exams`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  return parse<{ exams: StudentMockExam[] }>(response);
}

export type RazorpayOrderPayload = {
  paymentOrderId: string;
  razorpayOrderId: string;
  amountInr: number;
  amountPaise: number;
  currency: string;
  keyId: string;
  devBypass: boolean;
  registrationId: string;
  examId: string;
};

export async function createMockExamPaymentOrder(examId: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.create_mock_exam_payment_order`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ examId }),
    credentials: "include",
  });
  return parse<RazorpayOrderPayload>(response);
}

export async function verifyMockExamPayment(payload: {
  paymentOrderId: string;
  registrationId: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
}) {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.verify_mock_exam_payment`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Payment verification failed.");
  }
  return body.message || "Registered.";
}

export async function registerStudentMockExamDev(examId: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.register_student_mock_exam`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ examId }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Registration failed.");
  }
  return body.message || "Registered.";
}
