"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listPublicBlogPosts } from "../../lib/api";

type BlogPost = {
  id: string;
  title: string;
  authorName: string;
  excerpt: string;
  body: string;
  publishedAt: string;
};

export default function CommunityBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    void listPublicBlogPosts()
      .then(setPosts)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load blog."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="company-page">
      <section className="company-shell" style={{ gridTemplateColumns: "1fr", maxWidth: 900, margin: "0 auto" }}>
        <div className="company-main">
          <h1 className="company-title">Scout TPO community blog</h1>
          <p className="company-subtitle">
            Insights from placement officers. <Link href="/login">Back to sign in</Link>
          </p>
          {loading ? <p>Loading…</p> : null}
          {error ? <p className="error">{error}</p> : null}
          {!loading && posts.length === 0 ? <p className="company-subtitle">No public posts yet.</p> : null}
          {posts.map((post) => (
            <article key={post.id} className="company-table-wrap" style={{ marginBottom: 24 }}>
              <h3>{post.title}</h3>
              <p className="table-caption">
                {post.authorName} · {post.publishedAt}
              </p>
              <p>{expanded === post.id ? post.body : post.excerpt}</p>
              {post.body.length > 280 ? (
                <button type="button" className="table-btn secondary" onClick={() => setExpanded(expanded === post.id ? null : post.id)}>
                  {expanded === post.id ? "Show less" : "Read more"}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
