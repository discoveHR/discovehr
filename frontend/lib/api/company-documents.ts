import { API_URL, messageFromFrappeBody, readScoutApiJson, scoutJsonHeaders } from "./client";

export type DocumentRequestItem = {
  requestId: string;
  applicationId: string;
  jobId: string;
  studentUser: string;
  studentName: string;
  requiredDocuments: string[];
  uploadedDocuments: Record<string, string>;
  status: "Pending" | "Partial" | "Complete";
  sentAt: string;
  note: string;
};

export async function requestDocuments(payload: {
  applicationId: string;
  requiredDocuments: string[];
  note?: string;
}): Promise<{ message: string; requestId: string }> {
  const response = await fetch(
    `${API_URL}/api/method/scout.api.company_api.request_documents`,
    {
      method: "POST",
      headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify(payload),
    },
  );
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to send document request.");
  }
  return {
    message: body.message as string,
    requestId: (body.data as { requestId: string }).requestId,
  };
}

export async function listCompanyDocumentRequests(applicationId?: string): Promise<DocumentRequestItem[]> {
  const params = applicationId ? `?applicationId=${encodeURIComponent(applicationId)}` : "";
  const response = await fetch(
    `${API_URL}/api/method/scout.api.company_api.list_document_requests${params}`,
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
  return ((body.data as { requests: DocumentRequestItem[] }).requests) ?? [];
}
