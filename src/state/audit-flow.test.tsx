import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuditFlowProvider, useAuditFlow } from "./audit-flow";

// Stage 4 — authentication must never touch the audit-wizard's remembered
// lastAudit.id. An anonymous audit's id is set once by /audit's startAudit()
// and is expected to survive login/signup unchanged (the backend claim step
// reassigns audits.user_id in place — see geo_pipeline's Stage 2/3 tests —
// it never creates a new audit row or a new id). This is a regression guard
// against the real AuditFlowProvider (not the mocked version used elsewhere
// in this repo) ever wiring signIn/signUp to touch lastAudit.

function Probe() {
  const { lastAudit, setLastAudit, account, signIn, signInWithGoogle } = useAuditFlow();
  return (
    <div>
      <p data-testid="last-audit-id">{lastAudit?.id ?? "none"}</p>
      <p data-testid="account-email">{account?.email ?? "signed-out"}</p>
      <button
        type="button"
        onClick={() => setLastAudit({ id: "anon-audit-123", domain: "example.com" })}
      >
        seed lastAudit
      </button>
      <button type="button" onClick={() => void signIn("a@example.com", "password123")}>
        sign in
      </button>
      <button type="button" onClick={() => void signInWithGoogle("mock-credential")}>
        sign in with google
      </button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("AuditFlowProvider — lastAudit survives authentication", () => {
  it("does not clear or change lastAudit.id when signIn succeeds", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (String(url).endsWith("/api/auth/me")) {
        return Promise.resolve(new Response(JSON.stringify({ user: null }), { status: 200 }));
      }
      if (String(url).endsWith("/api/auth/login")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ user: { id: "u1", name: "Ada", email: "a@example.com", is_admin: false, paid_audit_ids: [] } }),
            { status: 200 },
          ),
        );
      }
      throw new Error(`unexpected fetch to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuditFlowProvider>
        <Probe />
      </AuditFlowProvider>,
    );

    // Let the initial GET /api/auth/me (mount) settle.
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      screen.getByRole("button", { name: "seed lastAudit" }).click();
    });
    expect(screen.getByTestId("last-audit-id").textContent).toBe("anon-audit-123");

    await act(async () => {
      screen.getByRole("button", { name: "sign in" }).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("account-email").textContent).toBe("a@example.com");
    // The exact same audit id, untouched by signing in.
    expect(screen.getByTestId("last-audit-id").textContent).toBe("anon-audit-123");
  });

  it("signInWithGoogle posts the credential to /api/auth/google, reuses the same account state, and never touches lastAudit", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (String(url).endsWith("/api/auth/me")) {
        return Promise.resolve(new Response(JSON.stringify({ user: null }), { status: 200 }));
      }
      if (String(url).endsWith("/api/auth/google")) {
        expect(JSON.parse(init!.body as string)).toEqual({ credential: "mock-credential" });
        return Promise.resolve(
          new Response(
            JSON.stringify({
              user: { id: "u2", name: "Grace", email: "g@example.com", is_admin: false, paid_audit_ids: [] },
            }),
            { status: 200 },
          ),
        );
      }
      throw new Error(`unexpected fetch to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuditFlowProvider>
        <Probe />
      </AuditFlowProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      screen.getByRole("button", { name: "seed lastAudit" }).click();
    });

    await act(async () => {
      screen.getByRole("button", { name: "sign in with google" }).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("account-email").textContent).toBe("g@example.com");
    expect(screen.getByTestId("last-audit-id").textContent).toBe("anon-audit-123");
  });
});
