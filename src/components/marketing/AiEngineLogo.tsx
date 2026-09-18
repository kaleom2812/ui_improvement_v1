import type { AiEngine } from "@/data/aiEngines";
import { cn } from "@/lib/utils";

/** Small colour-coded engine mark + name, used as chart legends / "tracked across" strips. */
export function AiEngineLogo({
  engine,
  size = "sm",
  withLabel = true,
  className,
}: {
  engine: AiEngine;
  size?: "sm" | "md";
  withLabel?: boolean;
  className?: string;
}) {
  const Icon = engine.icon;
  const box = size === "md" ? "h-7 w-7" : "h-5 w-5";
  const iconSize = size === "md" ? "h-3.5 w-3.5" : "h-2.5 w-2.5";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn("grid shrink-0 place-items-center rounded-full", box)}
        style={{ backgroundColor: `${engine.color}1a`, color: engine.color }}
      >
        <Icon className={iconSize} />
      </span>
      {withLabel && <span className="text-xs font-medium text-ink-2">{engine.name}</span>}
    </span>
  );
}
