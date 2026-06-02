import { API_URL, messageFromFrappeBody, readScoutApiJson, scoutJsonHeaders } from "./client";

export type CompanyInterview = {
  id: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  title: string;
  interviewType: "Video" | "In-person" | "Phone" | "Freelancer";
  startDatetime: string;
  endDatetime: string;
  meetingLink: string;
  location: string;
  interviewerName: string;
  interviewerEmail: string;
  freelancerInterviewerUser?: string;
  freelancerInterviewerName?: string;
  hrNotifyEmails: string;
  notes: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  googleCalendarUrl: string;
  icsFilename: string;
};

export type ScheduleInterviewPayload = {
  applicationId: string;
  title?: string;
  interviewType: "Video" | "In-person" | "Phone" | "Freelancer";
  startDatetime: string;
  endDatetime?: string;
  meetingLink?: string;
  location?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  freelancerInterviewerUser?: string;
  hrNotifyEmails?: string;
  notes?: string;
  markShortlisted?: boolean;
};

export async function listCompanyInterviews(jobId?: string) {
  let url = `${API_URL}/api/method/scout.api.company_api.list_company_interviews`;
  if (jobId) {
    url += `?jobId=${encodeURIComponent(jobId)}`;
  }
  const response = await fetch(url, { method: "GET", headers: scoutJsonHeaders(), credentials: "include" });
  const { body, raw } = await readScoutApiJson<{ interviews: CompanyInterview[] }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to load interviews.");
  }
  return body.data?.interviews || [];
}

export async function scheduleCompanyInterview(payload: ScheduleInterviewPayload) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.schedule_company_interview`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<{ interview: CompanyInterview }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to schedule interview.");
  }
  return { interview: body.data?.interview, message: body.message || "Interview scheduled." };
}

export async function cancelCompanyInterview(interviewId: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.cancel_company_interview`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ interviewId }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to cancel interview.");
  }
  return body.message || "Interview cancelled.";
}

export async function downloadCompanyInterviewIcs(interviewId: string) {
  const response = await fetch(
    `${API_URL}/api/method/scout.api.company_api.get_interview_ics?interviewId=${encodeURIComponent(interviewId)}`,
    { method: "GET", headers: scoutJsonHeaders(), credentials: "include" },
  );
  const { body, raw } = await readScoutApiJson<{ ics: string; filename: string }>(response);
  if (!response.ok || !body.ok || !body.data?.ics) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to download calendar file.");
  }
  const blob = new Blob([body.data.ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = body.data.filename || "interview.ics";
  anchor.click();
  URL.revokeObjectURL(url);
}
