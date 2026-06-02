import { API_URL, frappeCsrfHeaders, messageFromFrappeBody } from "./client";

type UploadAttachTarget = {
  doctype: string;
  docname: string;
};

function extractUploadedFileUrl(raw: Record<string, unknown>): string | undefined {
  const nested = raw.message;
  if (nested && typeof nested === "object" && nested !== null && "file_url" in nested) {
    const url = (nested as { file_url?: string }).file_url;
    return url?.trim() || undefined;
  }
  if (typeof nested === "string" && nested.trim()) {
    try {
      const parsed = JSON.parse(nested) as { file_url?: string };
      return parsed.file_url?.trim() || undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

async function uploadFileToFrappe(file: File, errorMessage: string, attachTo?: UploadAttachTarget) {
  const form = new FormData();
  form.append("file", file);
  form.append("is_private", "0");
  if (attachTo?.doctype && attachTo?.docname) {
    form.append("doctype", attachTo.doctype);
    form.append("docname", attachTo.docname);
  }
  const response = await fetch(`${API_URL}/api/method/upload_file`, {
    method: "POST",
    headers: frappeCsrfHeaders(),
    body: form,
    credentials: "include",
  });
  let raw: Record<string, unknown>;
  try {
    raw = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error(errorMessage);
  }
  const url = extractUploadedFileUrl(raw);

  if (!response.ok || !url) {
    const detail = messageFromFrappeBody(raw);
    if (detail?.includes("PermissionError") || raw.exc_type === "PermissionError") {
      throw new Error("Upload denied. Sign in again as a student, then retry the upload.");
    }
    throw new Error(detail || errorMessage);
  }
  return url;
}

export async function uploadStudentResume(file: File, profileDocname?: string) {
  const allowedExtensions = [".pdf", ".doc", ".docx"];
  const lowerName = file.name.toLowerCase();
  const isAllowed = allowedExtensions.some((ext) => lowerName.endsWith(ext));
  if (!isAllowed) {
    throw new Error("Only PDF, DOC, and DOCX resumes are allowed.");
  }

  const attachTo = profileDocname
    ? { doctype: "Scout Student Profile", docname: profileDocname }
    : undefined;
  return uploadFileToFrappe(file, "Unable to upload resume.", attachTo);
}

export async function uploadStudentPhoto(file: File, profileDocname?: string) {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WEBP images are allowed.");
  }

  const attachTo = profileDocname
    ? { doctype: "Scout Student Profile", docname: profileDocname }
    : undefined;
  return uploadFileToFrappe(file, "Unable to upload profile photo.", attachTo);
}

export async function uploadFreelancerFile(
  file: File,
  profileDocname: string,
  options?: { imagesOnly?: boolean },
) {
  if (options?.imagesOnly) {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      throw new Error("Only JPG, PNG, and WEBP images are allowed.");
    }
  }

  const attachTo = { doctype: "Scout Freelancer Profile", docname: profileDocname };
  return uploadFileToFrappe(file, "Unable to upload file.", attachTo);
}

export async function uploadFreelancerResume(file: File, profileDocname: string) {
  const allowedExtensions = [".pdf", ".doc", ".docx"];
  const lowerName = file.name.toLowerCase();
  const isAllowed = allowedExtensions.some((ext) => lowerName.endsWith(ext));
  if (!isAllowed) {
    throw new Error("Only PDF, DOC, and DOCX resumes are allowed.");
  }
  return uploadFreelancerFile(file, profileDocname);
}

export async function uploadFreelancerPhoto(file: File, profileDocname: string) {
  return uploadFreelancerFile(file, profileDocname, { imagesOnly: true });
}

export async function uploadTpoStudentSheet(file: File) {
  const lowerName = file.name.toLowerCase();
  if (!(lowerName.endsWith(".csv") || lowerName.endsWith(".xlsx"))) {
    throw new Error("Only CSV and XLSX files are allowed.");
  }

  return uploadFileToFrappe(file, "Unable to upload student sheet.");
}

export async function uploadDocumentFile(file: File, requestDocname: string) {
  const lowerName = file.name.toLowerCase();
  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"];
  if (!allowedExtensions.some((ext) => lowerName.endsWith(ext))) {
    throw new Error("Allowed formats: PDF, JPG, PNG, WEBP, DOC, DOCX.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File size must be under 10 MB.");
  }
  const attachTo = { doctype: "Scout Document Request", docname: requestDocname };
  return uploadFileToFrappe(file, "Unable to upload document.", attachTo);
}


