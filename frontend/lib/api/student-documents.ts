import { API_URL, messageFromFrappeBody, readScoutApiJson, scoutJsonHeaders } from "./client";

export type StudentDocItem = {
  docType: string;
  label: string;
  uploaded: boolean;
  fileUrl: string;
};

export type StudentDocumentRequest = {
  requestId: string;
  applicationId: string;
  jobId: string;
  companyUser: string;
  companyName: string;
  jobTitle: string;
  documents: StudentDocItem[];
  status: "Pending" | "Partial" | "Complete";
  sentAt: string;
  note: string;
};

export async function listMyDocumentRequests(): Promise<{
  requests: StudentDocumentRequest[];
  pendingCount: number;
}> {
  const response = await fetch(
    `${API_URL}/api/method/scout.api.student.list_my_document_requests`,
    {
      method: "GET",
      headers: scoutJsonHeaders(),
      credentials: "include",
    },
  );
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to load document requests.");
  }
  const data = body.data as { requests: StudentDocumentRequest[]; pendingCount: number };
  return { requests: data.requests ?? [], pendingCount: data.pendingCount ?? 0 };
}

export async function submitDocumentUpload(payload: {
  requestId: string;
  docType: string;
  fileUrl: string;
}): Promise<{ status: string }> {
  const response = await fetch(
    `${API_URL}/api/method/scout.api.student.submit_document_upload`,
    {
      method: "POST",
      headers: scoutJsonHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    },
  );
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Upload failed.");
  }
  return (body.data as { status: string });
}
