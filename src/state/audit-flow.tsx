"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Client-side audit-flow + auth state. Ported from GEO-UI-Version-5/src/state/AuditFlow.jsx,
// later extended with real email/password auth (see src/lib/session.ts and
// src/app/api/auth/**, proxying geo_pipeline/auth.py).
//
// Holds:
//   • input       — the url/brand/industry the user entered in the wizard
//   • lastAudit   — { id, domain } of the most recent audit, so the results /
//                   report / dashboard screens can recover it without a URL param
//   • account     — the signed-in user (id, name, email, paidAuditIds), or null.
//                   Sourced from the HttpOnly session cookie via GET /api/auth/me
//                   on mount — never persisted to localStorage.
//
// UNLOCK RULE: the "report" plan is a one-time purchase for a single report
// (see src/data/site.ts pricing.plans — cadence: "one-time"), so unlocking is
// scoped per audit id under the signed-in account, not a single account-wide
// flag, and not a client-trusted flag at all — `paidAuditIds` comes back from
// the backend (geo_pipeline/auth.py entitlements table) on every login/me/
// payment call. `unlocked` reflects whether `lastAudit.id` is in that list.
// The only place a new id is ever added to it is a real, signature-verified
// Razorpay payment (POST /api/payment/verify, see src/app/checkout/page.tsx)
// followed by refreshAccount().
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const LAST_AUDIT_KEY = "phazeai-geo-last-audit";

export interface AuditInput {
  url: string;
  brand: string;
  industry: string;
}
export interface LastAudit {
  id: string;
  domain: string;
}
export interface Account {
  id: string;
  name: string;
  email: string;
  paidAuditIds: string[];
  /** Server-provided (GET /api/auth/me). An admin account has full access to
   *  every report without a Razorpay payment or entitlement. Never set from
   *  client input. */
  isAdmin: boolean;
}

interface AuditFlowValue {
  input: AuditInput;
  setInput: (patch: Partial<AuditInput>) => void;
  lastAudit: LastAudit | null;
  setLastAudit: (a: LastAudit | null) => void;
  /** false until localStorage has been read on the client */
  hydrated: boolean;
  /** false until the initial GET /api/auth/me check has completed */
  authLoaded: boolean;
  unlocked: boolean;
  /** Re-pull the signed-in account from GET /api/auth/me (e.g. after a real
   *  Razorpay payment has been verified server-side and entitlement granted). */
  refreshAccount: () => Promise<void>;
  account: Account | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  /** Same session mechanism as signIn/signUp, just a different identity
   *  input — a Google Identity Services ID token (opaque here; verified only
   *  server-side by geo_pipeline/google_auth.py). Posts to /api/auth/google,
   *  which sets the same HttpOnly geo_session cookie and runs the same
   *  anonymous-audit claim step login/signup already do. */
  signInWithGoogle: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const DEFAULT_INPUT: AuditInput = { url: "", brand: "", industry: "B2B SaaS" };

const AuditFlowContext = createContext<AuditFlowValue | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    return raw != null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

type BackendUser = { id: string; name: string; email: string; paid_audit_ids?: string[]; is_admin?: boolean };

function toAccount(user: BackendUser): Account {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    paidAuditIds: user.paid_audit_ids ?? [],
    isAdmin: user.is_admin ?? false,
  };
}

async function readJson(res: Response): Promise<{ error?: string; user?: BackendUser }> {
  return res.json().catch(() => ({}));
}

export function AuditFlowProvider({ children }: { children: React.ReactNode }) {
  const [input, setInputState] = useState<AuditInput>(DEFAULT_INPUT);
  const [lastAudit, setLastAuditState] = useState<LastAudit | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);

  // Hydrate audit-wizard state from localStorage after mount (SSR-safe).
  useEffect(() => {
    setLastAuditState(read<LastAudit | null>(LAST_AUDIT_KEY, null));
    setHydrated(true);
  }, []);

  // Recover the signed-in session from the HttpOnly cookie. Runs once on
  // mount so a page refresh (or a fresh tab) keeps the user logged in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await readJson(res);
        if (!cancelled) setAccount(data.user ? toAccount(data.user) : null);
      } catch {
        if (!cancelled) setAccount(null);
      } finally {
        if (!cancelled) setAuthLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hydrated) write(LAST_AUDIT_KEY, lastAudit);
  }, [lastAudit, hydrated]);

  const setInput = useCallback((patch: Partial<AuditInput>) => setInputState((p) => ({ ...p, ...patch })), []);
  const setLastAudit = useCallback((a: LastAudit | null) => setLastAuditState(a), []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await readJson(res);
    if (!res.ok || !data.user) throw new Error(data.error || "Sign up failed");
    setAccount(toAccount(data.user));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await readJson(res);
    if (!res.ok || !data.user) throw new Error(data.error || "Login failed");
    setAccount(toAccount(data.user));
  }, []);

  const signInWithGoogle = useCallback(async (credential: string) => {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    const data = await readJson(res);
    if (!res.ok || !data.user) throw new Error(data.error || "Google sign-in failed");
    setAccount(toAccount(data.user));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAccount(null);
    }
  }, []);

  const refreshAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await readJson(res);
      setAccount(data.user ? toAccount(data.user) : null);
    } catch {
      /* keep the current account on a transient failure */
    }
  }, []);

  // Admin accounts (flag comes from the backend) bypass the paywall entirely.
  const unlocked =
    !!account?.isAdmin || (!!lastAudit?.id && !!account?.paidAuditIds.includes(lastAudit.id));

  const value = useMemo<AuditFlowValue>(
    () => ({
      input,
      setInput,
      lastAudit,
      setLastAudit,
      hydrated,
      authLoaded,
      unlocked,
      refreshAccount,
      account,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }),
    [
      input, setInput, lastAudit, setLastAudit, hydrated, authLoaded, unlocked, refreshAccount,
      account, signIn, signUp, signInWithGoogle, signOut,
    ]
  );

  return <AuditFlowContext.Provider value={value}>{children}</AuditFlowContext.Provider>;
}

export function useAuditFlow(): AuditFlowValue {
  const ctx = useContext(AuditFlowContext);
  if (!ctx) throw new Error("useAuditFlow must be used within AuditFlowProvider");
  return ctx;
}
