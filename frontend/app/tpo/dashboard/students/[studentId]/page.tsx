"use client";

import { useParams } from "next/navigation";
import { Student360View } from "../../../../../components/tpo-dashboard/Student360View";

export default function TpoStudent360Page() {
  const params = useParams();
  const raw = params?.studentId;
  const studentId = decodeURIComponent(typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] || "" : "");

  if (!studentId) {
    return (
      <main className="tpo-dashboard">
        <div className="tpo-dashboard-main tpo-student360-wrap">
          <p className="empty-state">Invalid student link.</p>
        </div>
      </main>
    );
  }

  return <Student360View studentId={studentId} />;
}
