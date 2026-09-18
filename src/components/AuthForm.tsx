"use client";

// Shared email/password + Google Sign-In form for /login and /signup.
//
// Visual layout from the GEO-UI-Version-4 reference (split screen: a fixed dark
// brand panel + a themed form panel). Authentication is the production's, real
// and unchanged: signIn / signUp / signInWithGoogle all hit /api/auth/* ->
// FastAPI and set the same HttpOnly session cookie (see
// src/state/audit-flow.tsx, src/lib/session.ts). The `?redirect=` round-trip
// is preserved for every method. No fake auth, no third-party auth provider
// SDK (Google Identity Services only ever hands us an opaque ID token, which
// FastAPI is the sole verifier of — see geo_pipeline/google_auth.py), no
// access codes.

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, WarningCircle, Check } from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { GoogleSignInButton, isGoogleSignInConfigured } from "@/components/GoogleSignInButton";
import { useAuditFlow } from "@/state/audit-flow";
import { socialProof, pricing } from "@/data/site";

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  minLength,
  required,
  optional,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  optional?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-ink-2">
        {label}
        {optional && <span className="ml-1 text-ink-3">(optional)</span>}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field"
        minLength={minLength}
        required={required}
      />
      {hint && <p className="mt-1.5 text-2xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn, signUp, signInWithGoogle, setInput } = useAuditFlow();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const redirect = params.get("redirect") || "";
  const redirectTarget = redirect || "/audit";
  const switchHref = `${mode === "signup" ? "/login" : "/signup"}${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Enter your name.");
        await signUp(name.trim(), email.trim(), password);
        // Optional: seed the audit wizard so /audit is pre-filled. Client-only —
        // the URL is never sent to the auth backend.
        if (url.trim()) setInput({ url: url.trim() });
      } else {
        await signIn(email.trim(), password);
      }
      router.replace(redirectTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  // Same outcome as handleSubmit (an authenticated account + redirect), just
  // a different identity input. signInWithGoogle already posts to
  // /api/auth/google, which sets the same geo_session cookie and runs the
  // same anonymous-audit claim step as login/signup — nothing extra needed
  // here beyond what handleSubmit already does for the password path.
  async function handleGoogleCredential(credential: string) {
    if (submitting || googleSubmitting) return; // one in-flight auth attempt at a time, either method
    setError("");
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle(credential);
      router.replace(redirectTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
      setGoogleSubmitting(false);
    }
  }

  const testimonial = socialProof.testimonials[1];
  const freeFeatures = pricing.plans[0].features;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Fixed dark brand panel (does not theme-shift) */}
      <div className="hidden flex-col justify-between bg-[#0f1729] p-10 text-white lg:flex">
        <Logo tone="dark" />
        {mode === "signup" ? (
          <div>
            <p className="text-2xl font-semibold leading-snug tracking-tight">Start with a free GEO audit.</p>
            <ul className="mt-6 space-y-3 text-sm text-white/70">
              {freeFeatures.slice(0, 4).map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check size={15} weight="bold" className="text-[#8b84f2]" /> {f}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <p className="text-xl font-semibold leading-snug tracking-tight">&ldquo;{testimonial.quote}&rdquo;</p>
            <p className="mt-4 text-sm text-white/55">
              {testimonial.name} — {testimonial.role}
            </p>
          </div>
        )}
        <p className="text-2xs uppercase tracking-[0.1em] text-white/40">
          {socialProof.stat.value} {socialProof.stat.label}
        </p>
      </div>

      {/* Themed form panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink">
            {mode === "signup" ? "Create your account" : "Sign in to phazeAi"}
          </h1>
          <p className="mt-1.5 text-sm text-ink-2">
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <Link href={switchHref} className="link">
              {mode === "signup" ? "Sign in" : "Create an account"}
            </Link>
          </p>

          {error && (
            <p
              role="alert"
              className="mt-6 flex items-start gap-1.5 rounded-lg border border-neg/30 bg-neg-soft px-3 py-2 text-sm text-neg"
            >
              <WarningCircle size={16} weight="bold" className="mt-0.5 shrink-0" /> {error}
            </p>
          )}

          {isGoogleSignInConfigured() && (
            <>
              <div className={error ? "mt-4" : "mt-8"}>
                <GoogleSignInButton
                  onCredential={(credential) => void handleGoogleCredential(credential)}
                  disabled={submitting || googleSubmitting}
                  text={mode === "signup" ? "signup_with" : "signin_with"}
                />
              </div>

              <div className="my-6 flex items-center gap-3 text-2xs uppercase tracking-wide text-ink-3">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className={isGoogleSignInConfigured() ? "space-y-4" : "mt-8 space-y-4"} noValidate>
            {mode === "signup" && (
              <Field id="name" label="Name" autoComplete="name" value={name} onChange={setName} required />
            )}
            <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} required />
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={setPassword}
              minLength={8}
              required
              hint={mode === "signup" ? "At least 8 characters." : undefined}
            />
            {mode === "signup" && (
              <Field
                id="url"
                label="Website to audit"
                optional
                autoComplete="url"
                placeholder="yourcompany.com"
                value={url}
                onChange={setUrl}
              />
            )}

            <button type="submit" disabled={submitting || googleSubmitting} className="btn-primary w-full">
              {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              {!submitting && <ArrowRight size={15} weight="bold" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
