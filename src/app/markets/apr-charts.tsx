"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description = "A multiple line chart";

const generateMockData = () => {
  const dates = ["23", "24", "25", "26", "27", "28", "29"];
  const data = dates.map((date) => {
    const impliedAPR = (Math.random() * (7 - 6) + 6).toFixed(2); // Random APR between 6 and 7
    const underlyingAPR = (Math.random() * 11).toFixed(2); // Random APR between 0 and 11
    return { date, impliedAPR: parseFloat(impliedAPR), underlyingAPR: parseFloat(underlyingAPR) };
  });
  return data;
};

const chartData = generateMockData();

const chartConfig = {
  impliedAPR: {
    label: "Implied APR",
    color: "var(--chart-1)",
  },
  underlyingAPR: {
    label: "Underlying APR",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function APRChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>APR</CardTitle>
        <CardDescription>Monthly APR</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={true} content={<ChartTooltipContent />} />
            <Line
              dataKey="impliedAPR"
              type="monotone"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="underlyingAPR"
              type="monotone"
              stroke="hsl(var(--secondary))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
