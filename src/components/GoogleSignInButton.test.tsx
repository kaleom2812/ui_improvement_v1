import { act, cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GoogleSignInButton, isGoogleSignInConfigured } from "./GoogleSignInButton";

// Mirrors app/checkout/checkout.test.tsx's approach to Razorpay's checkout.js:
// mock next/script to fire onLoad synchronously, and stub the provider's
// window global rather than loading the real script.

vi.mock("next/script", () => ({
  default: function ScriptMock({ onLoad }: { onLoad?: () => void }) {
    React.useEffect(() => {
      onLoad?.();
    }, [onLoad]);
    return null;
  },
}));

function stubGoogleGlobal() {
  const initialize = vi.fn();
  const renderButton = vi.fn();
  const cancel = vi.fn();
  window.google = { accounts: { id: { initialize, renderButton, cancel } } };
  return { initialize, renderButton, cancel };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  delete window.google;
});

describe("isGoogleSignInConfigured", () => {
  it("reflects whether NEXT_PUBLIC_GOOGLE_CLIENT_ID is set", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
    expect(isGoogleSignInConfigured()).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    expect(isGoogleSignInConfigured()).toBe(false);
  });
});

describe("GoogleSignInButton", () => {
  it("renders nothing when NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing — no crash, no button", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    const { initialize, renderButton } = stubGoogleGlobal();

    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
    expect(initialize).not.toHaveBeenCalled();
    expect(renderButton).not.toHaveBeenCalled();
  });

  it("initializes GIS with the configured client_id and renders the button once the script loads", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
    const { initialize, renderButton } = stubGoogleGlobal();

    await act(async () => {
      render(<GoogleSignInButton onCredential={vi.fn()} />);
    });

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: "client-id.apps.googleusercontent.com", ux_mode: "popup" }),
    );
    expect(renderButton).toHaveBeenCalledTimes(1);
  });

  it("passes the GIS credential straight through to onCredential, unmodified", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
    const { initialize } = stubGoogleGlobal();
    const onCredential = vi.fn();

    await act(async () => {
      render(<GoogleSignInButton onCredential={onCredential} />);
    });

    const { callback } = initialize.mock.calls[0][0] as { callback: (r: { credential: string }) => void };
    act(() => callback({ credential: "opaque-google-credential" }));

    expect(onCredential).toHaveBeenCalledExactlyOnceWith("opaque-google-credential");
  });

  it("ignores a second GIS callback while the first is still being handled", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
    const { initialize } = stubGoogleGlobal();
    const onCredential = vi.fn();

    await act(async () => {
      render(<GoogleSignInButton onCredential={onCredential} disabled={false} />);
    });

    const { callback } = initialize.mock.calls[0][0] as { callback: (r: { credential: string }) => void };
    act(() => {
      callback({ credential: "first" });
      callback({ credential: "second-fires-before-parent-disables" });
    });

    expect(onCredential).toHaveBeenCalledTimes(1);
    expect(onCredential).toHaveBeenCalledWith("first");
  });

  it("re-arms after the parent clears `disabled`, allowing a later, separate sign-in attempt", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
    const { initialize } = stubGoogleGlobal();
    const onCredential = vi.fn();

    const { rerender } = render(<GoogleSignInButton onCredential={onCredential} disabled={false} />);
    await act(async () => {});

    const { callback } = initialize.mock.calls[0][0] as { callback: (r: { credential: string }) => void };
    act(() => callback({ credential: "first" }));
    expect(onCredential).toHaveBeenCalledTimes(1);

    // Parent marks the attempt done (disabled -> true while handling, then back to false).
    rerender(<GoogleSignInButton onCredential={onCredential} disabled={true} />);
    rerender(<GoogleSignInButton onCredential={onCredential} disabled={false} />);

    act(() => callback({ credential: "second" }));
    expect(onCredential).toHaveBeenCalledTimes(2);
    expect(onCredential).toHaveBeenLastCalledWith("second");
  });

  it("blocks clicks (pointer-events) on the rendered button while disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
    stubGoogleGlobal();

    const { rerender } = render(<GoogleSignInButton onCredential={vi.fn()} disabled={false} />);
    await act(async () => {});
    expect(screen.getByTestId("google-signin-button").className).not.toContain("pointer-events-none");

    rerender(<GoogleSignInButton onCredential={vi.fn()} disabled={true} />);
    expect(screen.getByTestId("google-signin-button").className).toContain("pointer-events-none");
  });

  it("cancels any pending GIS prompt on unmount", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
    const { cancel } = stubGoogleGlobal();

    const { unmount } = render(<GoogleSignInButton onCredential={vi.fn()} />);
    await act(async () => {});
    unmount();

    expect(cancel).toHaveBeenCalled();
  });

  it("uses signup_with text when text=\"signup_with\" is passed", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
    const { renderButton } = stubGoogleGlobal();

    await act(async () => {
      render(<GoogleSignInButton onCredential={vi.fn()} text="signup_with" />);
    });

    expect(renderButton).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ text: "signup_with" }));
  });

  it("does not crash and hides the button if the GIS script fails to load", async () => {
    // Override the next/script mock for just this test to simulate onError.
    vi.doMock("next/script", () => ({
      default: function ScriptMock({ onError }: { onError?: () => void }) {
        React.useEffect(() => {
          onError?.();
        }, [onError]);
        return null;
      },
    }));
    vi.resetModules();
    const { GoogleSignInButton: FreshButton } = await import("./GoogleSignInButton");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");

    expect(() => render(<FreshButton onCredential={vi.fn()} />)).not.toThrow();
    vi.doUnmock("next/script");
  });
});
