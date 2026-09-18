"use client";

import { TrendingUp } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { sampleDimensions } from "@/data/sample-report";

const chartData = sampleDimensions.map((d) => ({ label: d.label, score: d.score }));

const chartConfig = {
  score: { label: "Score", color: "rgb(var(--c-brand))" },
} satisfies ChartConfig;

export function GeoDimensionsRadarChart() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="items-center pb-0 text-center">
        <CardTitle>GEO score, by dimension</CardTitle>
        <CardDescription>Where the example brand is strong — and where it isn&apos;t</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[260px]">
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 10 }} />
            <PolarGrid />
            <Radar dataKey="score" fill="var(--color-score)" fillOpacity={0.55} stroke="var(--color-score)" dot={{ r: 3, fillOpacity: 1 }} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 pt-4 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none text-ink">
          Technical GEO leads the pack <TrendingUp className="h-4 w-4 text-pos" />
        </div>
        <div className="leading-none text-ink-3">7 dimensions, scored 0–100</div>
      </CardFooter>
    </Card>
  );
}
