import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthForm } from "./AuthForm";

// GoogleSignInButton's own GIS wiring (script loading, initialize/renderButton,
// duplicate-callback guarding) is covered by GoogleSignInButton.test.tsx.
// AuthForm only needs to know: does it render at all (isGoogleSignInConfigured),
// and when its onCredential fires, does AuthForm do the right thing with it.
const googleConfigured = vi.hoisted(() => ({ value: true }));
vi.mock("@/components/GoogleSignInButton", () => ({
  isGoogleSignInConfigured: () => googleConfigured.value,
  GoogleSignInButton: ({
    onCredential,
    disabled,
    text,
  }: {
    onCredential: (credential: string) => void;
    disabled?: boolean;
    text?: string;
  }) => (
    <button
      type="button"
      data-testid="google-btn"
      data-text={text}
      disabled={disabled}
      onClick={() => onCredential("mock-google-credential")}
    >
      Continue with Google
    </button>
  ),
}));

const router = vi.hoisted(() => ({ replace: vi.fn() }));
const searchParams = vi.hoisted(() => ({ value: new URLSearchParams("") }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams.value,
}));

const flow = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  setInput: vi.fn(),
}));
vi.mock("@/state/audit-flow", () => ({ useAuditFlow: () => flow }));

beforeEach(() => {
  googleConfigured.value = true;
  router.replace.mockClear();
  searchParams.value = new URLSearchParams("");
  flow.signIn.mockReset().mockResolvedValue(undefined);
  flow.signUp.mockReset().mockResolvedValue(undefined);
  flow.signInWithGoogle.mockReset().mockResolvedValue(undefined);
  flow.setInput.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AuthForm — Google Sign-In configuration", () => {
  it("renders the Google button and the divider when NEXT_PUBLIC_GOOGLE_CLIENT_ID is configured", () => {
    render(<AuthForm mode="login" />);
    expect(screen.getByTestId("google-btn")).toBeInTheDocument();
    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("hides the Google button and divider gracefully when not configured, and the password form still works", async () => {
    googleConfigured.value = false;
    render(<AuthForm mode="login" />);

    expect(screen.queryByTestId("google-btn")).not.toBeInTheDocument();
    expect(screen.queryByText("or")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    await waitFor(() => expect(flow.signIn).toHaveBeenCalledWith("a@example.com", "password123"));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/audit"));
  });

  it("uses signup_with text on the signup page and signin_with on the login page", () => {
    const { rerender } = render(<AuthForm mode="signup" />);
    expect(screen.getByTestId("google-btn").dataset.text).toBe("signup_with");

    rerender(<AuthForm mode="login" />);
    expect(screen.getByTestId("google-btn").dataset.text).toBe("signin_with");
  });
});

describe("AuthForm — Google credential handling", () => {
  it("forwards the GIS credential to signInWithGoogle and redirects on success", async () => {
    render(<AuthForm mode="login" />);

    fireEvent.click(screen.getByTestId("google-btn"));

    await waitFor(() => expect(flow.signInWithGoogle).toHaveBeenCalledExactlyOnceWith("mock-google-credential"));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/audit"));
  });

  it("honors the ?redirect= target for Google sign-in, same as password sign-in", async () => {
    searchParams.value = new URLSearchParams("redirect=%2Fdashboard");
    render(<AuthForm mode="login" />);

    fireEvent.click(screen.getByTestId("google-btn"));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows the existing error banner (role=alert) when Google sign-in fails, without a browser alert", async () => {
    flow.signInWithGoogle.mockRejectedValue(new Error("Google sign-in failed"));
    render(<AuthForm mode="login" />);

    fireEvent.click(screen.getByTestId("google-btn"));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Google sign-in failed");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("prevents a duplicate submission while a Google sign-in is already in flight", async () => {
    let resolveSignIn!: () => void;
    flow.signInWithGoogle.mockReturnValue(new Promise<void>((resolve) => (resolveSignIn = resolve)));
    render(<AuthForm mode="login" />);

    const button = screen.getByTestId("google-btn");
    fireEvent.click(button);
    fireEvent.click(button); // second click while the first attempt is still pending

    expect(flow.signInWithGoogle).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSignIn();
      await Promise.resolve();
    });
  });

  it("disables the password submit button while a Google sign-in is in flight (cross-method lock)", async () => {
    let resolveSignIn!: () => void;
    flow.signInWithGoogle.mockReturnValue(new Promise<void>((resolve) => (resolveSignIn = resolve)));
    render(<AuthForm mode="login" />);

    fireEvent.click(screen.getByTestId("google-btn"));

    await waitFor(() => expect(screen.getByRole("button", { name: /Sign in/i })).toBeDisabled());

    await act(async () => {
      resolveSignIn();
      await Promise.resolve();
    });
  });
});

describe("AuthForm — existing email/password behavior is unchanged", () => {
  it("signs in with trimmed email and the entered password", async () => {
    render(<AuthForm mode="login" />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "  a@example.com  " } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    await waitFor(() => expect(flow.signIn).toHaveBeenCalledWith("a@example.com", "password123"));
    expect(flow.signInWithGoogle).not.toHaveBeenCalled();
  });

  it("signs up, requires a name, and seeds the audit wizard URL client-side only", async () => {
    render(<AuthForm mode="signup" />);

    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));
    expect(flow.signUp).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your name.");

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText(/Website to audit/), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));

    await waitFor(() => expect(flow.signUp).toHaveBeenCalledWith("Ada", "ada@example.com", "password123"));
    expect(flow.setInput).toHaveBeenCalledWith({ url: "example.com" });
  });

  it("shows the existing error banner on failed password login", async () => {
    flow.signIn.mockRejectedValue(new Error("Invalid email or password"));
    render(<AuthForm mode="login" />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
  });
});
