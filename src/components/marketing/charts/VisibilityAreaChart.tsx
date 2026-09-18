"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Pill } from "@/components/primitives";
import { AiEngineLogo } from "@/components/marketing/AiEngineLogo";
import { aiEngines } from "@/data/aiEngines";
import { sampleVisibilityTrend } from "@/data/sample-report";

const chartConfig = {
  mentions: { label: "AI mentions", color: "rgb(var(--c-brand))" },
  citations: { label: "Citations", color: "rgb(var(--c-pos))" },
} satisfies ChartConfig;

const RANGES = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
] as const;

export function VisibilityAreaChart() {
  const [range, setRange] = React.useState<(typeof RANGES)[number]["key"]>("90d");
  const days = RANGES.find((r) => r.key === range)?.days ?? 90;
  const data = React.useMemo(() => sampleVisibilityTrend.slice(-days), [days]);

  return (
    <Card className="overflow-hidden pt-0">
      <CardHeader className="flex flex-col gap-4 border-b border-line py-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <CardTitle>AI visibility, tracked daily</CardTitle>
          <CardDescription className="mt-1">Mentions and citations across every engine we monitor</CardDescription>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {aiEngines.map((engine) => (
              <AiEngineLogo key={engine.id} engine={engine} />
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {RANGES.map((r) => (
            <Pill key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>
              {r.label}
            </Pill>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillMentions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-mentions)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="var(--color-mentions)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillCitations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-citations)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="var(--color-citations)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  indicator="dot"
                />
              }
            />
            <Area dataKey="citations" type="natural" fill="url(#fillCitations)" stroke="var(--color-citations)" stackId="a" />
            <Area dataKey="mentions" type="natural" fill="url(#fillMentions)" stroke="var(--color-mentions)" stackId="a" />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
