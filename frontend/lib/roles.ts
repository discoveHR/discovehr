export const loginRoles = [
  { id: "company", label: "Company", enabled: true },
  { id: "campus", label: "Campus", enabled: false },
  { id: "student", label: "Student", enabled: false },
  { id: "tpo", label: "Training & Placement Officer", enabled: false },
  { id: "internal", label: "Internal Team", enabled: false },
  { id: "freelancer", label: "Freelancer Interviewer", enabled: false },
  { id: "admin", label: "Admin", enabled: false },
] as const;

export type LoginRole = (typeof loginRoles)[number]["id"];
