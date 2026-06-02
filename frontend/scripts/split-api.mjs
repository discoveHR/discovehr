import fs from "fs";
import path from "path";

const root = path.resolve("lib/api");
const s = fs.readFileSync(path.join(root, "_bundle.ts"), "utf8");

function slice(start, end) {
  const a = s.indexOf(start);
  const b = end ? s.indexOf(end) : s.length;
  if (a < 0) throw new Error(`Missing: ${start}`);
  return s.slice(a, b);
}

const typesEnd = s.indexOf("type FrappeEnvelope");
const clientEnd = s.indexOf("export async function companyLogin");

fs.writeFileSync(
  path.join(root, "types.ts"),
  s.slice(0, typesEnd).replace(/^declare const process[\s\S]*?^const API_URL = .*\n\n/m, ""),
);

fs.writeFileSync(
  path.join(root, "client.ts"),
  `import type { CompanyLoginResponse } from "./types";\n\nexport const API_URL = process.env.NEXT_PUBLIC_API_URL || "/frappe";\n\n${s.slice(typesEnd, clientEnd)}`,
);

fs.writeFileSync(
  path.join(root, "auth.ts"),
  `import {
  API_URL,
  frappeCsrfHeaders,
  frappeGuestPreflight,
  isTransientNetworkError,
  messageFromFrappeBody,
  parseFrappeResponse,
  sleep,
  type FrappeEnvelope,
} from "./client";
import type { CompanyLoginPayload, RegisterPayload } from "./types";

${slice("export async function companyLogin", "export async function getStudentDashboardData")}
${slice("export async function registerUser", "export async function searchIndianColleges")}
${slice("export async function acceptStudentInvite", "export async function listTpoStudentInvites")}
`,
);

fs.writeFileSync(
  path.join(root, "student.ts"),
  `import { API_URL, parseFrappeResponse, type FrappeEnvelope } from "./client";
import type {
  StudentDashboardData,
  StudentLmsContext,
  StudentProfileData,
  StudentProfileUpdatePayload,
} from "./types";

${slice("export async function getStudentDashboardData", "export async function listStudentProfileEditRequests")}
${slice("export async function applyToJob", "export async function registerUser")}
`,
);

fs.writeFileSync(
  path.join(root, "tpo-profile-edits.ts"),
  `import { API_URL } from "./client";
import type { StudentProfileEditRequestItem } from "./types";

${slice("export async function listStudentProfileEditRequests", "export async function uploadStudentResume")}
`,
);

fs.writeFileSync(
  path.join(root, "uploads.ts"),
  `import { API_URL } from "./client";

${slice("export async function uploadStudentResume", "export async function applyToJob")}
`,
);

fs.writeFileSync(path.join(root, "colleges.ts"), slice("export async function searchIndianColleges", "export async function getCompanyMe"));

fs.writeFileSync(
  path.join(root, "company.ts"),
  `import { API_URL, parseFrappeResponse, type FrappeEnvelope } from "./client";
import type {
  ApplicationStatus,
  AssessmentFormPayload,
  AssessmentItem,
  CompanyApplicantItem,
  CompanyCollegeInviteItem,
  JobFormPayload,
  JobItem,
  ShortlistSchedulePayload,
} from "./types";

${slice("export async function getCompanyMe", "export async function createTpoPosting")}
`,
);

fs.writeFileSync(
  path.join(root, "tpo.ts"),
  `import { API_URL } from "./client";
import type {
  TpoAddStudentPayload,
  TpoApplicant,
  TpoBulkUploadSummary,
  TpoListedStudent,
  TpoPosting,
  TpoPostingPayload,
  TpoProfile,
  TpoStudentInvite,
} from "./types";

${slice("export async function createTpoPosting", "export async function acceptStudentInvite")}
${slice("export async function listTpoStudentInvites", "export async function getCompanyMagicDashboard")}
`,
);

fs.writeFileSync(
  path.join(root, "magic.ts"),
  `import { API_URL } from "./client";
import type { CompanyMagicDashboard } from "./types";

${slice("export async function getCompanyMagicDashboard", null)}
`,
);

fs.writeFileSync(
  path.join(root, "index.ts"),
  `export * from "./types";
export * from "./client";
export * from "./auth";
export * from "./student";
export * from "./tpo-profile-edits";
export * from "./uploads";
export * from "./colleges";
export * from "./company";
export * from "./tpo";
export * from "./magic";
`,
);

console.log("split-api: done");
