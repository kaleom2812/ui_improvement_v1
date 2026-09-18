"use client";

// The single account/profile dropdown for a signed-in user — avatar button +
// email, History, admin/dashboard shortcuts, Sign out. This is the ONE
// implementation: every surface that shows a profile icon (the marketing Nav,
// desktop and mobile, and the GeoDashboard report header used by /dashboard
// and /audit/[id]) renders this same component, so menu items like History
// never need to be added in more than one place.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretDown, SignOut, Gauge, ShieldCheck, ClockCounterClockwise } from "@phosphor-icons/react";
import { useAuditFlow } from "@/state/audit-flow";

export function AccountMenu() {
  const { account, signOut, unlocked } = useAuditFlow();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  if (!account) return null;
  const initials = (account.name || account.email).slice(0, 1).toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-1.5 rounded-full border-2 border-line-2 py-1 pl-1 pr-2.5 text-sm transition-colors hover:border-brand"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-2xs font-bold text-white">{initials}</span>
        <CaretDown size={12} weight="bold" className="text-ink-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-line bg-surface p-1.5 shadow-pop">
          <p className="truncate px-2.5 py-2 text-2xs text-ink-3">{account.email}</p>
          {account.isAdmin && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/admin");
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-ink hover:bg-subtle"
            >
              <ShieldCheck size={16} /> Admin Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/history");
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-ink hover:bg-subtle"
          >
            <ClockCounterClockwise size={16} /> History
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push(unlocked ? "/dashboard" : "/audit");
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-ink hover:bg-subtle"
          >
            <Gauge size={16} /> {unlocked ? "Go to dashboard" : "Start an audit"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
              router.push("/");
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-ink hover:bg-subtle"
          >
            <SignOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
