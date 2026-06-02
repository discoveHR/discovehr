"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { acceptStudentInvite } from "../../../../lib/api";

export default function AcceptStudentInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token || "";
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!token) {
      setError("Invalid invite link.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      const message = await acceptStudentInvite({ token, fullName, password });
      setSuccess(message);
      window.setTimeout(() => router.push("/login"), 900);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to accept invite.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="panel">
        <div className="left">
          <span className="badge">Scout Platform</span>
          <h1 className="title">Student Invite</h1>
          <p className="subtitle">Create your account, then open Profile to confirm department, branch, and batch with your college.</p>
        </div>
        <div className="right">
          <h2 className="card-title">Accept Invite</h2>
          <p className="card-subtitle">Set your details to activate your account.</p>
          <form className="form" onSubmit={handleSubmit}>
            <label className="label">
              Full Name
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
            <label className="label">
              Password
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <label className="label">
              Confirm Password
              <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </label>
            <button className="btn" type="submit" disabled={isLoading}>
              {isLoading ? "Please wait..." : "Accept Invite"}
            </button>
          </form>
          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}
        </div>
      </section>
    </main>
  );
}
