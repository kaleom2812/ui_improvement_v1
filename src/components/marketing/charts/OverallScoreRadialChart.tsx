"use client";

import { TrendingUp } from "lucide-react";
import { RadialBar, RadialBarChart, PolarRadiusAxis, Label } from "recharts";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { sampleScore } from "@/data/sample-report";

const chartData = [{ label: "score", value: sampleScore.overall, fill: "var(--color-score)" }];

const chartConfig = {
  value: { label: "GEO score" },
  score: { label: "Score", color: "rgb(var(--c-brand))" },
} satisfies ChartConfig;

export function OverallScoreRadialChart() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="items-center pb-0 text-center">
        <CardTitle>Overall GEO score</CardTitle>
        <CardDescription>Blended across all tracked dimensions</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[220px]">
          <RadialBarChart data={chartData} innerRadius={70} outerRadius={110} startAngle={90} endAngle={90 - 360 * (sampleScore.overall / 100)}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox)) return null;
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                      <tspan x={viewBox.cx} y={viewBox.cy} className="fill-ink text-3xl font-bold">
                        {sampleScore.overall}
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 22} className="fill-ink-3 text-xs">
                        / 100 · Grade {sampleScore.grade}
                      </tspan>
                    </text>
                  );
                }}
              />
            </PolarRadiusAxis>
            <RadialBar dataKey="value" background cornerRadius={999} />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 pt-4 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none text-ink">
          Up {sampleScore.delta} points this quarter <TrendingUp className="h-4 w-4 text-pos" />
        </div>
        <div className="leading-none text-ink-3">Projected to reach {sampleScore.projected90} in 90 days</div>
      </CardFooter>
    </Card>
  );
}
