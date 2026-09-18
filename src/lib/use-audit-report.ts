"use client";

// Client hook: poll /api/audit/:id and expose { status, report, error }.
// Mirrors the polling logic in geo-dashboard/src/components/GeoDashboard.tsx and
// AuditForm.tsx (3s interval, stop on complete|incomplete|failed). Used by the
// processing, results and report screens.

import { useEffect, useRef, useState } from "react";
import type { ExtendedAuditReport, AuditStatus } from "./adapter";

interface State {
  status: AuditStatus;
  report: ExtendedAuditReport | null;
  error: string | null;
}

export function useAuditReport(
  auditId: string | null | undefined,
  { poll = true }: { poll?: boolean } = {},
) {
  const [state, setState] = useState<State>({
    status: auditId ? "processing" : "idle",
    report: null,
    error: null,
  });

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!auditId) {
      setState({
        status: "idle",
        report: null,
        error: null,
      });
      return;
    }

    let cancelled = false;

    const clear = () => {
      if (timer.current) {
        clearInterval(timer.current);
      }

      timer.current = null;
    };

    const tick = async () => {
      try {
        const res = await fetch(`/api/audit/${auditId}`, {
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok) {
          setState({
            status: "failed",
            report: null,
            error:
              data.error || `Request failed (HTTP ${res.status})`,
          });

          clear();
          return;
        }

        // Both "complete" and "incomplete" mean the backend
        // has finished processing and returned a report.
        if (
          (data.status === "complete" ||
            data.status === "incomplete") &&
          data.data
        ) {
          setState({
            status: data.status as AuditStatus,
            report: data.data as ExtendedAuditReport,
            error: null,
          });

          clear();
        } else if (data.status === "failed") {
          setState({
            status: "failed",
            report: null,
            error:
              data.error ||
              "The audit failed during processing.",
          });

          clear();
        } else {
          setState((s) => ({
            ...s,
            status: "processing",
          }));
        }
      } catch (e: unknown) {
        if (cancelled) return;

        setState({
          status: "failed",
          report: null,
          error:
            e instanceof Error ? e.message : "Network error.",
        });

        clear();
      }
    };

    // Check immediately.
    tick();

    // Continue polling every 3 seconds while processing.
    if (poll) {
      timer.current = setInterval(tick, 3000);
    }

    return () => {
      cancelled = true;
      clear();
    };
  }, [auditId, poll]);

  return state;
}