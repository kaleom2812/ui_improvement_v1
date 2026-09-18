"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuditForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [org, setOrg] = useState("");
  const [industry, setIndustry] = useState("auto");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Run GEO Audit →");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url) { setError("Website URL is required."); return; }
    setLoading(true);
    setProgress(0);
    setError("");

    let progressInterval: NodeJS.Timeout | undefined;

    try {
      const startTime = Date.now();
      const duration = 180000; // 3 minutes
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min((elapsed / duration) * 100, 95); // cap at 95%
        setProgress(pct);
      }, 1000);

      setLoadingText("Starting pipeline...");
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, org, industry, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Audit failed");
      
      const auditId = data.audit_id;
      setLoadingText("Running AI models (2-4 min)...");

      // Poll every 5 seconds
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/audit/${auditId}`);
          const pollData = await pollRes.json();
          
          if (["complete", "incomplete"].includes(pollData.status)) {
            clearInterval(pollInterval);
            if (progressInterval) clearInterval(progressInterval);
            setProgress(100);
            router.push(`/audit/${auditId}`);
          } else if (pollData.status === "failed") {
            clearInterval(pollInterval);
            throw new Error(pollData.error || "Audit failed during processing");
          }
          // if processing, continue
        } catch (pollErr: any) {
          clearInterval(pollInterval);
          if (progressInterval) clearInterval(progressInterval);
          setError(pollErr.message || "Error polling status");
          setLoading(false);
          setProgress(0);
          setLoadingText("Run GEO Audit →");
        }
      }, 5000);

    } catch (err: unknown) {
      if (progressInterval) clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setProgress(0);
      setLoadingText("Run GEO Audit →");
    }
  }

  return (
    <form className="audit-form" onSubmit={handleSubmit}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 900, marginBottom: 6 }}>
          Start a GEO Audit
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>
          We&apos;ll crawl the site, test the configured AI providers, and return a scored report.
        </p>
      </div>

      <div className="audit-form__grid">
        <div className="input-group">
          <label className="input-label" htmlFor="url">Website URL</label>
          <input
            id="url"
            className="input-field"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="org">Organization Name</label>
          <input
            id="org"
            className="input-field"
            type="text"
            placeholder="Acme University"
            value={org}
            onChange={e => setOrg(e.target.value)}
          />
        </div>
      </div>

      <div className="audit-form__row">
        <div className="input-group">
          <label className="input-label" htmlFor="industry">Industry</label>
          <select
            id="industry"
            className="input-field"
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            style={{ cursor: "pointer" }}
          >
            <option value="auto">Auto-detect from website</option>
            <option value="education">Education</option>
            <option value="saas">SaaS</option>
            <option value="ecommerce">E-Commerce</option>
            <option value="healthcare">Healthcare</option>
            <option value="consulting">Consulting</option>
          </select>
        </div>
      </div>

      <div className="audit-form__row">
        <div className="input-group">
          <label className="input-label" htmlFor="description">Core Product / Description (Optional)</label>
          <input
            id="description"
            className="input-field"
            type="text"
            placeholder="e.g. AI-powered CRM for local businesses"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <button
        type="submit"
        className="btn btn--primary btn--lg btn--full audit-form__submit"
        disabled={loading}
        style={{ 
          position: "relative",
          overflow: "hidden",
          opacity: loading ? 0.9 : 1,
          border: loading ? "1px solid rgba(255, 255, 255, 0.4)" : "none"
        }}
      >
        {loading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${progress}%`,
              background: "rgba(255,255,255,0.25)",
              transition: "width 1s linear",
            }}
          />
        )}
        <span style={{ position: "relative", zIndex: 1 }}>
          {loading ? loadingText : "Run GEO Audit →"}
        </span>
      </button>

      <p style={{ fontSize: "0.7rem", color: "var(--gray-400)", marginTop: 12, textAlign: "center" }}>
        Typical audit: 2–4 minutes · Uses configured providers or local mock mode
      </p>
    </form>
  );
}
