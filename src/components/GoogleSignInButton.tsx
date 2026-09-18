"use client";

// Google Identity Services (GIS) button. Email/password remains the primary,
// unchanged authentication mechanism (see AuthForm.tsx) — this component's
// only job is to hand the opaque ID token GIS returns up to its caller via
// `onCredential`. It never decodes the token, never inspects its claims,
// never persists it anywhere (not localStorage/sessionStorage, not React
// state beyond the instant it's forwarded), and never logs it. Verification
// happens exclusively server-side (see geo_pipeline/google_auth.py).
//
// Follows the same "Script component + declared window global" pattern
// already used for Razorpay's checkout.js in app/checkout/page.tsx, rather
// than adding a GIS npm dependency.

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  ux_mode?: "popup" | "redirect";
}

interface GoogleButtonOptions {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: number;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
          cancel: () => void;
        };
      };
    };
  }
}

/** Whether NEXT_PUBLIC_GOOGLE_CLIENT_ID is set. NEXT_PUBLIC_* vars are
 *  inlined at build time, so this is safe to read on the server too —
 *  nothing here touches `window`. */
export function isGoogleSignInConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}

export function GoogleSignInButton({
  onCredential,
  disabled = false,
  text = "signin_with",
}: {
  onCredential: (credential: string) => void;
  disabled?: boolean;
  text?: "signin_with" | "signup_with";
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);

  // Always the latest onCredential, read from inside the stable callback
  // below, so GIS is initialized once per mount — never re-wired just
  // because the parent re-rendered with a new closure.
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  // Second layer of protection against a duplicate/simultaneous callback,
  // local to this component. The parent's `disabled` prop is the first
  // layer (see the pointer-events overlay below, and AuthForm's own submit
  // guard) — this ref resets only once the parent says it's safe again.
  const busyRef = useRef(false);
  useEffect(() => {
    if (!disabled) busyRef.current = false;
  }, [disabled]);

  // If the GIS script is already present (e.g. this component remounted
  // after a client-side nav from /login to /signup), don't wait for a
  // <Script onLoad> that will never fire again.
  useEffect(() => {
    if (window.google?.accounts?.id) setScriptReady(true);
  }, []);

  useEffect(() => {
    if (!scriptReady || !clientId || !containerRef.current) return;
    const google = window.google;
    if (!google) return;

    google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: "popup",
      callback: (response) => {
        if (busyRef.current) return;
        busyRef.current = true;
        onCredentialRef.current(response.credential);
      },
    });
    google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text,
      shape: "rectangular",
      width: 320,
    });

    return () => {
      google.accounts.id.cancel();
    };
  }, [scriptReady, clientId, text]);

  if (!clientId) return null; // Quietly unavailable — email/password is unaffected.

  return (
    <div>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setScriptFailed(true)}
      />
      {!scriptFailed && (
        <div
          ref={containerRef}
          data-testid="google-signin-button"
          className={disabled ? "pointer-events-none opacity-60" : undefined}
          aria-disabled={disabled || undefined}
        />
      )}
    </div>
  );
}
