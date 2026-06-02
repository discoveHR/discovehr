"use client";

import Link from "next/link";
import { tpoStudent360Path } from "../../lib/api";

type Props = {
  studentId: string;
  title?: string;
};

export function StudentViewLink({ studentId, title = "View student profile" }: Props) {
  if (!studentId) return null;
  return (
    <Link
      href={tpoStudent360Path(studentId)}
      className="tpo-student-view-btn"
      title={title}
      aria-label={title}
    >
      <svg className="tpo-student-view-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    </Link>
  );
}
