"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { sampleScoreTrend } from "@/data/sample-report";

const chartConfig = {
  yourBrand: { label: "Your brand", color: "rgb(var(--c-brand))" },
  categoryAvg: { label: "Category average", color: "rgb(var(--c-ink-3))" },
} satisfies ChartConfig;

export function ScoreTrendLineChart() {
  const [activeChart, setActiveChart] = React.useState<"yourBrand" | "categoryAvg">("yourBrand");

  const latest = sampleScoreTrend[sampleScoreTrend.length - 1];

  return (
    <Card className="overflow-hidden py-4 sm:py-0">
      <CardHeader className="flex flex-col items-stretch border-b border-line !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-5 pb-3 sm:px-6 sm:pb-0">
          <CardTitle>GEO score, week over week</CardTitle>
          <CardDescription>Your brand climbing against the category average</CardDescription>
        </div>
        <div className="flex">
          {(["yourBrand", "categoryAvg"] as const).map((key) => (
            <button
              key={key}
              type="button"
              data-active={activeChart === key}
              className="flex flex-1 flex-col justify-center gap-1 border-t border-line px-5 py-3.5 text-left even:border-l even:border-line data-[active=true]:bg-subtle/60 sm:border-t-0 sm:border-l sm:px-6 sm:py-5"
              onClick={() => setActiveChart(key)}
            >
              <span className="text-2xs uppercase tracking-[0.06em] text-ink-3">{chartConfig[key].label}</span>
              <span className="data-fig text-xl font-bold leading-none text-ink sm:text-2xl">{latest[key]}</span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
          <LineChart data={sampleScoreTrend} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={28} />
            <ChartTooltip content={<ChartTooltipContent className="w-[150px]" />} />
            <Line dataKey={activeChart} type="monotone" stroke={`var(--color-${activeChart})`} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
