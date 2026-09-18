import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AuditForm from "./AuditForm";

const routerPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/website url/i), { target: { value: "https://example.com" } });
  fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: "Example Inc" } });
}

describe("AuditForm", () => {
  beforeEach(() => {
    routerPush.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("exposes responsive form, grid, and touch-target layout hooks", () => {
    const { container } = render(React.createElement(AuditForm));

    expect(container.querySelector("form.audit-form")).toBeInTheDocument();
    expect(container.querySelector(".audit-form__grid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run geo audit/i })).toHaveClass("audit-form__submit");
  });

  it("submits the audit payload to the dashboard audit API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ audit_id: "audit-1" }))
      .mockImplementation(() => Promise.resolve(jsonResponse({ status: "processing" })));
    vi.stubGlobal("fetch", fetchMock);
    render(React.createElement(AuditForm));
    await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: /run geo audit/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/audit",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            url: "https://example.com",
            org: "Example Inc",
            industry: "auto",
            description: "",
          }),
        }),
      );
    });
  });

  it("shows processing state after a successful audit start", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse({ audit_id: "audit-1" }))
        .mockImplementation(() => Promise.resolve(jsonResponse({ status: "processing" }))),
    );
    render(React.createElement(AuditForm));
    await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: /run geo audit/i }));

    await waitFor(() => expect(screen.getByText("Running AI models (2-4 min)...")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /running ai models/i })).toBeDisabled();
  });

  it("navigates to the audit page when polling completes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse({ audit_id: "audit-1" }))
        .mockImplementation(() => Promise.resolve(jsonResponse({ status: "complete" }))),
    );
    render(React.createElement(AuditForm));
    await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: /run geo audit/i }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/audit/audit-1"), { timeout: 6500 });
  });

  it("navigates to the report when polling returns an incomplete audit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse({ audit_id: "audit-incomplete" }))
        .mockImplementation(() => Promise.resolve(jsonResponse({ status: "incomplete" }))),
    );
    render(React.createElement(AuditForm));
    await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: /run geo audit/i }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/audit/audit-incomplete"), { timeout: 6500 });
    expect(screen.queryByText(/audit failed/i)).not.toBeInTheDocument();
  });

  it("shows failed audit state when polling reports failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse({ audit_id: "audit-1" }))
        .mockImplementation(() => Promise.resolve(jsonResponse({ status: "failed", error: "Crawler failed" }))),
    );
    render(React.createElement(AuditForm));
    await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: /run geo audit/i }));

    expect(await screen.findByText("Crawler failed", undefined, { timeout: 6500 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run geo audit/i })).toBeEnabled();
  });

  it("shows API error handling when audit creation fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({ error: "Backend unavailable" }, 500)));
    render(React.createElement(AuditForm));
    await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: /run geo audit/i }));

    expect(await screen.findByText("Backend unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run geo audit/i })).toBeEnabled();
  });
});
