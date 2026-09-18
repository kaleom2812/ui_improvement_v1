import type { ReactNode } from "react";

/**
 * Global shell wrapper.
 *
 * The Signal-era ambient layer (oscilloscope SignalField, left ScanRail, one-time
 * Boot overlay) was removed in the GEO-UI-Version-4 visual migration — those were
 * purely decorative and nothing depended on them. This is now a passthrough,
 * kept as a seam in case later phases need global chrome around every route.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
