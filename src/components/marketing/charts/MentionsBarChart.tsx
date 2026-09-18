"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { sampleVisibilityTrend } from "@/data/sample-report";

const chartData = sampleVisibilityTrend.filter((_, i) => i % 3 === 0);

const chartConfig = {
  totals: { label: "Total" },
  mentions: { label: "AI mentions", color: "rgb(var(--c-brand))" },
  citations: { label: "Citations", color: "rgb(var(--c-pos))" },
} satisfies ChartConfig;

export function MentionsBarChart() {
  const [activeChart, setActiveChart] = React.useState<"mentions" | "citations">("mentions");

  const total = React.useMemo(
    () => ({
      mentions: sampleVisibilityTrend.reduce((acc, curr) => acc + curr.mentions, 0),
      citations: sampleVisibilityTrend.reduce((acc, curr) => acc + curr.citations, 0),
    }),
    []
  );

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="flex flex-col items-stretch border-b border-line !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-5 pb-3 pt-4 sm:px-6 sm:py-0">
          <CardTitle>Mentions vs. citations</CardTitle>
          <CardDescription>Last 90 days, every 3rd day sampled</CardDescription>
        </div>
        <div className="flex">
          {(["mentions", "citations"] as const).map((key) => (
            <button
              key={key}
              type="button"
              data-active={activeChart === key}
              className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t border-line px-5 py-3.5 text-left even:border-l even:border-line data-[active=true]:bg-subtle/60 sm:border-t-0 sm:border-l sm:px-6 sm:py-5"
              onClick={() => setActiveChart(key)}
            >
              <span className="text-2xs uppercase tracking-[0.06em] text-ink-3">{chartConfig[key].label}</span>
              <span className="data-fig text-xl font-bold leading-none text-ink sm:text-2xl">{total[key].toLocaleString()}</span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:p-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
          <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
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
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                />
              }
            />
            <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
