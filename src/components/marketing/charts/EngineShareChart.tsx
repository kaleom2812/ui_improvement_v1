"use client";

import { TrendingUp } from "lucide-react";
import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { AiEngineLogo } from "@/components/marketing/AiEngineLogo";
import { aiEngines } from "@/data/aiEngines";
import { sampleEngineShare } from "@/data/sample-report";

const chartData = sampleEngineShare.map((row) => ({
  ...row,
  fill: aiEngines.find((e) => e.id === row.id)?.color ?? "rgb(var(--c-brand))",
}));

const chartConfig = Object.fromEntries(
  sampleEngineShare.map((row) => [row.id, { label: row.name }])
) satisfies ChartConfig;

export function EngineShareChart() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="items-center pb-0 text-center">
        <CardTitle>Share of voice, by engine</CardTitle>
        <CardDescription>Which AI answers cite you most often</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[220px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="id" />} />
            <Pie data={chartData} dataKey="value" nameKey="id" innerRadius={52} strokeWidth={4} stroke="rgb(var(--c-surface))" />
          </PieChart>
        </ChartContainer>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {aiEngines.map((engine) => (
            <AiEngineLogo key={engine.id} engine={engine} />
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 pt-4 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none text-ink">
          ChatGPT leads at 34% share <TrendingUp className="h-4 w-4 text-pos" />
        </div>
        <div className="leading-none text-ink-3">Aggregated across tracked prompts, last 30 days</div>
      </CardFooter>
    </Card>
  );
}
