import { CircleNotch } from "@phosphor-icons/react/dist/ssr";

/** Full-viewport spinner used as a Suspense fallback for client pages that read
 *  search params. */
export function FullPageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="animate-spin360 text-brand">
          <CircleNotch size={28} weight="bold" />
        </span>
        <p className="text-2xs uppercase tracking-[0.1em] text-ink-3">{label}</p>
      </div>
    </div>
  );
}
