"use client";

// Audit input wizard. Visual direction from GEO-UI-Version-4 (audit/Start.jsx):
// a big URL-first field, then a compact brand/industry step. The production
// audit-creation flow is unchanged: on submit it calls the real POST /api/audit
// and, on success, stores the audit id (useAuditFlow) and moves to the polling
// screen. All validation, the 30s abort timeout and error handling are kept.

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Sparkle, MagnifyingGlass, WarningCircle } from "@phosphor-icons/react";
import { useAuditFlow } from "@/state/audit-flow";

const INDUSTRIES = [
  "B2B SaaS",
  "E-commerce / DTC",
  "Financial services",
  "Healthcare",
  "Education",
  "Marketplace",
  "Agency / Services",
  "Media / Publishing",
  "Other",
];

function normalizeUrl(v: string) {
  const s = v.trim();
  if (!s) return s;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}
function cleanDomain(v: string) {
  return v.replace(/^https?:\/\//i, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

export default function AuditStart() {
  const router = useRouter();
  const { input, setInput, setLastAudit } = useAuditFlow();
  const [step, setStep] = useState(1);
  const [values, setValues] = useState(input);
  const [otherIndustry, setOtherIndustry] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const urlRef = useRef<HTMLInputElement>(null);

  const urlError = useMemo(() => {
    const v = values.url.trim();
    if (!v) return "Enter the website you want to check.";
    if (!/^([\w-]+\.)+[\w-]{2,}(\/.*)?$/i.test(v.replace(/^https?:\/\//i, "")))
      return "That doesn't look like a website address.";
    return "";
  }, [values.url]);

  const brandError = values.brand.trim() ? "" : "Enter your brand name so we can find its mentions.";

  const set = (patch: Partial<typeof values>) => setValues((s) => ({ ...s, ...patch }));

  async function startAudit() {
    setApiError("");
    setSubmitting(true);
    const url = normalizeUrl(values.url);
    const domain = cleanDomain(values.url);
    const industry =
      values.industry === "Other" && otherIndustry.trim() ? otherIndustry.trim() : values.industry;
    setInput({ ...values, url, industry });
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      let res: Response;
      try {
        res = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            org: values.brand || domain,
            industry,
            description: "",
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.audit_id) {
        throw new Error(data.error || `Could not start the audit (HTTP ${res.status})`);
      }
      setLastAudit({ id: data.audit_id, domain });
      router.push("/audit/processing");
    } catch (e: unknown) {
      const isAbort = e instanceof DOMException && e.name === "AbortError";
      setApiError(
        isAbort
          ? "The server took too long to respond. Please try again."
          : e instanceof Error
          ? e.message
          : "Something went wrong."
      );
      setSubmitting(false);
    }
  }

  const next = () => {
    if (step === 1) {
      setTouched(true);
      if (urlError) return urlRef.current?.focus();
      set({ url: normalizeUrl(values.url) });
      setTouched(false);
      setStep(2);
    } else {
      setTouched(true);
      if (brandError) return;
      startAudit();
    }
  };

  return (
    <div className="site-container flex min-h-[calc(100vh-3.5rem)] max-w-flow flex-col justify-center py-12">
      <p className="eyebrow text-center">Free GEO audit · Step {step} of 2</p>
      <div className="mx-auto mb-10 mt-3 h-1 w-full max-w-sm rounded-full bg-line">
        <div
          className="h-1 rounded-full bg-brand transition-[width] duration-400"
          style={{ width: `${(step / 2) * 100}%` }}
        />
      </div>

      {step === 1 && (
        <div className="reveal is-in text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">What&apos;s your website?</h1>
          <p className="mx-auto mt-3 max-w-md text-ink-2">
            We&apos;ll crawl your pages and test how GEO Tool sees your brand across the AI models.
          </p>
          <div className="relative mx-auto mt-8 max-w-lg">
            <MagnifyingGlass size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              ref={urlRef}
              type="text"
              inputMode="url"
              autoComplete="url"
              autoFocus
              placeholder="yourcompany.com"
              value={values.url}
              onChange={(e) => set({ url: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && next()}
              aria-invalid={!!(touched && urlError)}
              aria-describedby={touched && urlError ? "url-err" : undefined}
              className={`field h-14 pl-11 text-center text-lg ${touched && urlError ? "field-error" : ""}`}
            />
          </div>
          {touched && urlError && (
            <p id="url-err" className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-neg">
              <WarningCircle size={13} weight="bold" /> {urlError}
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="reveal is-in">
          <h1 className="text-center text-2xl font-bold tracking-tight text-ink sm:text-3xl">Tell us your brand</h1>
          <p className="mt-2 text-center text-sm text-ink-2">We match this against brand mentions in AI answers.</p>
          <div className="mx-auto mt-6 max-w-md space-y-4">
            <div>
              <label htmlFor="brand" className="mb-1.5 block text-sm font-medium text-ink">
                Brand / company name
              </label>
              <input
                id="brand"
                type="text"
                autoFocus
                value={values.brand}
                onChange={(e) => set({ brand: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && next()}
                aria-invalid={!!(touched && brandError)}
                className={`field ${touched && brandError ? "field-error" : ""}`}
              />
              {touched && brandError && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-neg">
                  <WarningCircle size={13} weight="bold" /> {brandError}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="industry" className="mb-1.5 block text-sm font-medium text-ink">
                Industry <span className="font-normal text-ink-3">(optional)</span>
              </label>
              <select id="industry" value={values.industry} onChange={(e) => set({ industry: e.target.value })} className="field">
                {INDUSTRIES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              {values.industry === "Other" && (
                <input
                  type="text"
                  aria-label="Please specify your industry"
                  placeholder="Please specify your industry"
                  value={otherIndustry}
                  onChange={(e) => setOtherIndustry(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                  className="field mt-2"
                />
              )}
            </div>
            <p className="flex items-start gap-2 rounded-lg border border-line bg-subtle px-4 py-3 text-2xs text-ink-2">
              <Sparkle size={13} weight="fill" className="mt-0.5 shrink-0 text-brand" />
              This usually takes 1–4 minutes. No account needed to see your score.
            </p>
            {apiError && (
              <p className="flex items-start gap-1.5 rounded-lg border border-neg/30 bg-neg-soft px-3 py-2 text-xs font-medium text-neg">
                <WarningCircle size={14} weight="bold" className="mt-0.5 shrink-0" /> {apiError}
              </p>
            )}
          </div>
        </div>
      )}

      <div
        className={`mx-auto mt-8 flex w-full max-w-md items-center gap-3 ${
          step > 1 ? "justify-between" : "justify-center"
        }`}
      >
        {step > 1 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-ghost" disabled={submitting}>
            <ArrowLeft size={15} weight="bold" /> Back
          </button>
        )}
        <button type="button" onClick={next} className="btn-primary" disabled={submitting}>
          {step === 2 ? (
            submitting ? (
              <>
                <span className="animate-spin360">
                  <Sparkle size={15} weight="fill" />
                </span>
                Starting…
              </>
            ) : (
              <>
                <Sparkle size={15} weight="fill" /> Run free audit
              </>
            )
          ) : (
            <>
              Continue <ArrowRight size={15} weight="bold" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
