"use client";

import { useCallback, useEffect, useState } from "react";
import {
  inviteHrPartner,
  listCreditPacksTpo,
  listHrInvites,
  listTpoCommunityPosts,
  purchaseStudentCreditsOrder,
  purchaseStudentCreditsVerify,
  upsertTpoCommunityPost,
  type CommunityPost,
  type CreditPack,
} from "../../lib/api";
import { openRazorpayCheckout } from "../../lib/razorpay";
import { MailerStatusBanner } from "../common/MailerStatusBanner";

type Props = { onError: (m: string) => void; onSuccess: (m: string) => void };

type Tab = "credits" | "hr" | "community";

export function TpoEngagementPanel({ onError, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("credits");
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [invites, setInvites] = useState<Array<{ id: string; hrEmail: string; campusDriveTitle: string; expiresAt: string; isActive: boolean }>>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [hrLink, setHrLink] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, i, c] = await Promise.all([listCreditPacksTpo(), listHrInvites(), listTpoCommunityPosts()]);
      setPacks(p.packs);
      setInvites(i.invites);
      setPosts(c.posts);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to load engagement data.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function buyCredits(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const packId = String(fd.get("packId") || "");
    const studentEmail = String(fd.get("studentEmail") || "").trim();
    try {
      const order = await purchaseStudentCreditsOrder(packId, studentEmail);
      if (order.devBypass) {
        const msg = await purchaseStudentCreditsVerify({ paymentOrderId: order.paymentOrderId });
        onSuccess(msg);
        return;
      }
      await openRazorpayCheckout({
        keyId: order.keyId,
        amountPaise: order.amountPaise,
        currency: "INR",
        orderId: order.razorpayOrderId,
        name: "DiscoveHR",
        description: "Student credit pack",
        onSuccess: async (rzp) => {
          const msg = await purchaseStudentCreditsVerify({
            paymentOrderId: order.paymentOrderId,
            razorpayPaymentId: rzp.razorpayPaymentId,
            razorpayOrderId: rzp.razorpayOrderId,
            razorpaySignature: rzp.razorpaySignature,
          });
          onSuccess(msg);
        },
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Purchase failed.");
    }
  }

  async function sendHrInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const res = await inviteHrPartner({
        hrEmail: String(fd.get("hrEmail") || ""),
        hrName: String(fd.get("hrName") || ""),
        campusDriveTitle: String(fd.get("driveTitle") || ""),
        postingId: String(fd.get("postingId") || "") || undefined,
      });
      const path = res.frontendPath || `/hr/special/...`;
      setHrLink(typeof window !== "undefined" ? `${window.location.origin}${path}` : path);
      onSuccess(res.message || "HR invite processed.");
      e.currentTarget.reset();
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Invite failed.");
    }
  }

  async function savePost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await upsertTpoCommunityPost({
        title: String(fd.get("title") || ""),
        body: String(fd.get("body") || ""),
        authorName: String(fd.get("authorName") || ""),
        tags: String(fd.get("tags") || ""),
        isPublished: fd.get("isPublished") === "on",
        isPublicBlog: fd.get("isPublicBlog") === "on",
      });
      onSuccess("Post saved.");
      e.currentTarget.reset();
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  return (
    <section className="company-table-wrap">
      <div className="company-table-head">
        <h3>Engagement & partners</h3>
        <span className="table-caption">Credits, HR campus drives, and TPO community / public blog</span>
      </div>
      <MailerStatusBanner />
      <div className="tpo-tabs" style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["credits", "hr", "community"] as Tab[]).map((t) => (
          <button key={t} type="button" className={`table-btn ${tab === t ? "" : "secondary"}`} onClick={() => setTab(t)}>
            {t === "credits" ? "Student credits" : t === "hr" ? "Invite HR" : "Community"}
          </button>
        ))}
      </div>
      {loading ? <p className="company-subtitle">Loading…</p> : null}

      {tab === "credits" && !loading ? (
        <>
          <p className="company-subtitle" style={{ marginBottom: 12 }}>
            Company applicant links: use Placements → Send access link. Replicate jobs from the company magic dashboard.
          </p>
          <form className="job-form-grid" onSubmit={(e) => void buyCredits(e)}>
            <label>
              Pack
              <select name="packId" required>
                {packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.credits} credits — ₹{p.priceInr}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Student email
              <input name="studentEmail" type="email" required placeholder="student@college.edu" />
            </label>
            <button type="submit" className="table-btn">
              Purchase & grant credits
            </button>
          </form>
        </>
      ) : null}

      {tab === "hr" && !loading ? (
        <>
          <form className="job-form-grid" onSubmit={(e) => void sendHrInvite(e)}>
            <label>
              HR email
              <input name="hrEmail" type="email" required />
            </label>
            <label>
              HR name
              <input name="hrName" />
            </label>
            <label>
              Campus drive title
              <input name="driveTitle" placeholder="Summer internship drive 2026" />
            </label>
            <label>
              TPO posting ID (optional)
              <input name="postingId" placeholder="POST-..." />
            </label>
            <button type="submit" className="table-btn">
              Generate HR magic link
            </button>
          </form>
          {hrLink ? (
            <p className="company-subtitle" style={{ marginTop: 12 }}>
              Link: <a href={hrLink}>{hrLink}</a>
            </p>
          ) : null}
          <table className="company-table" style={{ marginTop: 24 }}>
            <thead>
              <tr>
                <th>HR</th>
                <th>Drive</th>
                <th>Expires</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.hrEmail}</td>
                  <td>{inv.campusDriveTitle}</td>
                  <td>{inv.expiresAt}</td>
                  <td>{inv.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {tab === "community" && !loading ? (
        <>
          <form className="job-form-grid" onSubmit={(e) => void savePost(e)}>
            <label>
              Title
              <input name="title" required />
            </label>
            <label>
              Author display name
              <input name="authorName" />
            </label>
            <label>
              Tags (comma separated)
              <input name="tags" />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Body
              <textarea name="body" rows={6} required />
            </label>
            <label>
              <input type="checkbox" name="isPublished" defaultChecked /> Publish to TPO community
            </label>
            <label>
              <input type="checkbox" name="isPublicBlog" /> Show on public blog (/community)
            </label>
            <button type="submit" className="table-btn">
              Save post
            </button>
          </form>
          <table className="company-table" style={{ marginTop: 24 }}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Community</th>
                <th>Public blog</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>{post.title}</td>
                  <td>{post.isPublished ? "Yes" : "Draft"}</td>
                  <td>{post.isPublicBlog ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
