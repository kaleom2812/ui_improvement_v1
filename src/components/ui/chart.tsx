"use client";

// Minimal port of shadcn/ui's chart primitives, adapted to this repo's design
// tokens (rgb(var(--c-*)) — see src/app/globals.css) instead of shadcn's
// --chart-N CSS variables, so charts retheme with light/dark for free.

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  }
>;

type ChartContextProps = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("Chart components must be used within a <ChartContainer />");
  return ctx;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.color);
  const styleTag = colorConfig.length
    ? `[data-chart="${chartId}"]{${colorConfig.map(([key, cfg]) => `--color-${key}: ${cfg.color};`).join("")}}`
    : "";

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-auto justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-ink-3",
          "[&_.recharts-cartesian-grid_line]:stroke-line",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-line-2",
          "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-layer]:outline-none",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-line",
          "[&_.recharts-radial-bar-background-sector]:fill-subtle",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-subtle",
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-line",
          "[&_.recharts-sector]:outline-none",
          "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        {styleTag && <style dangerouslySetInnerHTML={{ __html: styleTag }} />}
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) return undefined;
  const payloadPayload =
    "payload" in payload && typeof (payload as Record<string, unknown>).payload === "object"
      ? ((payload as Record<string, unknown>).payload as Record<string, unknown>)
      : undefined;

  let configLabelKey = key;
  const rec = payload as Record<string, unknown>;
  if (key in rec && typeof rec[key] === "string") {
    configLabelKey = rec[key] as string;
  } else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key] === "string") {
    configLabelKey = payloadPayload[key] as string;
  }
  return configLabelKey in config ? config[configLabelKey] : config[key];
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: {
  active?: boolean;
  payload?: any[];
  className?: string;
  indicator?: "line" | "dot" | "dashed";
  hideLabel?: boolean;
  hideIndicator?: boolean;
  label?: any;
  labelFormatter?: (value: any, payload: any[]) => React.ReactNode;
  labelClassName?: string;
  formatter?: (value: any, name: any, item: any, index: number, payload: any) => React.ReactNode;
  nameKey?: string;
  labelKey?: string;
  color?: string;
}) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) return null;
    const [item] = payload;
    const key = labelKey || item?.dataKey || item?.name || "value";
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === "string" ? config[label as keyof typeof config]?.label || label : itemConfig?.label;
    if (labelFormatter) {
      return <div className={cn("font-medium text-ink", labelClassName)}>{labelFormatter(value, payload)}</div>;
    }
    if (!value) return null;
    return <div className={cn("font-medium text-ink", labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !payload?.length) return null;

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "grid min-w-[9rem] items-start gap-1.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-pop",
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = nameKey || item.name || item.dataKey || "value";
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const indicatorColor = color || item.payload?.fill || item.color;

          return (
            <div
              key={item.dataKey ?? index}
              className={cn(
                "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-ink-3",
                indicator === "dot" && "items-center"
              )}
            >
              {formatter && item?.value !== undefined && item.name ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn("shrink-0 rounded-[2px]", {
                          "h-2.5 w-2.5": indicator === "dot",
                          "h-full w-1": indicator === "line",
                          "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                        })}
                        style={{ backgroundColor: indicatorColor, borderColor: indicatorColor } as React.CSSProperties}
                      />
                    )
                  )}
                  <div
                    className={cn(
                      "flex flex-1 justify-between leading-none",
                      nestLabel ? "items-end" : "items-center"
                    )}
                  >
                    <div className="grid gap-1">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-ink-3">{itemConfig?.label || item.name}</span>
                    </div>
                    {item.value !== undefined && (
                      <span className="data-fig font-medium tabular-nums text-ink">
                        {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: {
  className?: string;
  hideIcon?: boolean;
  payload?: any[];
  verticalAlign?: "top" | "bottom";
  nameKey?: string;
}) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload.map((item) => {
        const key = nameKey || item.dataKey || "value";
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        return (
          <div key={item.value} className="flex items-center gap-1.5 text-xs text-ink-2">
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
