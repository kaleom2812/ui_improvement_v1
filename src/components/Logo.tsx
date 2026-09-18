import Link from "next/link";

/**
 * phazeAi wordmark.
 *
 * Visual treatment from the GEO-UI-Version-4 reference (rounded brand-color badge +
 * hexagon mark, "phaze" + accented "Ai"). The component API — `href`, `mark`,
 * `wordmark`, and next/link — is the production's, unchanged. `tone="dark"` is
 * for placement on dark panels (e.g. the auth split-screen in Phase 4).
 */
export function Logo({
  href = "/",
  className = "",
  mark = true,
  wordmark = true,
  tone = "default",
}: {
  href?: string;
  className?: string;
  mark?: boolean;
  wordmark?: boolean;
  tone?: "default" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <Link href={href} className={`inline-flex items-center gap-2 no-underline ${className}`} aria-label="phazeAi, home">
      {mark && (
        <span
          aria-hidden="true"
          className={`grid h-8 w-8 place-items-center rounded-lg ${dark ? "bg-white text-brand" : "bg-brand text-white"}`}
        >
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5 14 5v6L8 14.5 2 11V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M2 5l6 3.5L14 5M8 8.5v6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {wordmark && (
        <span className={`text-base font-extrabold tracking-tight ${dark ? "text-white" : "text-ink"}`}>
          phaze<span className={dark ? "text-white/70" : "text-brand"}>Ai</span>
        </span>
      )}
    </Link>
  );
}
