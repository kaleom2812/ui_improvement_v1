"use client";
import { useAuditFlow } from "@/state/audit-flow";

// Thin adapter over useAuditFlow()'s real, backend-backed session state —
// kept as its own module (rather than importing useAuditFlow directly
// everywhere) so call sites read the same way they did when this was a
// third-party auth SDK.
//
// The account/profile dropdown itself used to live here too (UserButton),
// separately from the marketing Nav's own menu — that duplication meant menu
// items like History had to be added twice and inevitably drifted apart. It's
// been replaced by the single shared <AccountMenu /> (src/components/AccountMenu.tsx),
// which every surface with a profile icon now renders.
export function useUser() {
  const { account, authLoaded } = useAuditFlow();
  return {
    isSignedIn: !!account,
    isLoaded: authLoaded,
    user: account
      ? {
          id: account.id,
          fullName: account.name,
          primaryEmailAddress: { emailAddress: account.email },
        }
      : null,
  };
}
