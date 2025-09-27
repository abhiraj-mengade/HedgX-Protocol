"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis, ComposedChart } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useHistoricalData, useMarketData, useEthPrice } from "@/hooks/useHedgXVault";
import { formatBasisPoints } from "@/lib/contract";

export const description = "A multiple line chart showing funding rates";

const chartConfig = {
  impliedAPR: {
    label: "Implied Rate",
    color: "hsl(var(--primary))",
  },
  underlyingAPR: {
    label: "Funding Rate",
    color: "hsl(var(--secondary))",
  },
  ethPrice: {
    label: "ETH Price",
    color: "#f59e0b", // amber-500
  },
} satisfies ChartConfig;

export function APRChart() {
  const { historicalData, loading: historicalLoading } = useHistoricalData();
  const { marketData, loading: marketLoading, error } = useMarketData();
  const { ethPrice, loading: ethPriceLoading } = useEthPrice();

  if (marketLoading || historicalLoading || ethPriceLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funding Rates</CardTitle>
          <CardDescription>Historical funding rate data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-[hsl(var(--primary))]">
              Loading chart data...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funding Rates</CardTitle>
          <CardDescription>Historical funding rate data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-red-400">
              Error loading chart data: {error}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!historicalData || historicalData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funding Rates</CardTitle>
          <CardDescription>Historical funding rate data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-zinc-400">
              No chart data available
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funding Rates</CardTitle>
        <CardDescription>
          Current: Implied {formatBasisPoints(marketData?.impliedRate || 0n)} | 
          Funding {formatBasisPoints(marketData?.currentFundingRateBps || 0n)} | 
          ETH ${ethPrice?.toFixed(2) || '0.00'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ComposedChart
            accessibilityLayer
            data={historicalData}
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
            <YAxis
              yAxisId="rates"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              yAxisId="price"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${value}`}
            />
            <ChartTooltip 
              cursor={true} 
              content={<ChartTooltipContent />}
              formatter={(value, name) => {
                if (name === 'ethPrice') {
                  return [`$${value}`, name];
                }
                return [`${value}%`, name];
              }}
            />
            <Line
              yAxisId="rates"
              dataKey="impliedAPR"
              type="monotone"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="rates"
              dataKey="underlyingAPR"
              type="monotone"
              stroke="hsl(var(--secondary))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="price"
              dataKey="ethPrice"
              type="monotone"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
