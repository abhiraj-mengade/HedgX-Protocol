"use client";

import { useState } from "react";
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

const ratesChartConfig = {
  impliedAPR: {
    label: "Implied Rate",
    color: "hsl(var(--primary))",
  },
  underlyingAPR: {
    label: "Funding Rate",
    color: "hsl(var(--secondary))",
  },
} satisfies ChartConfig;

const ethChartConfig = {
  ethPrice: {
    label: "BTC Price",
    color: "#f59e0b", // amber-500
  },
} satisfies ChartConfig;

export function APRChart() {
  const { historicalData, loading: historicalLoading } = useHistoricalData();
  const { marketData, loading: marketLoading, error } = useMarketData();
  const { ethPrice, loading: ethPriceLoading } = useEthPrice();
  const [activeTab, setActiveTab] = useState<'rates' | 'eth'>('rates');

  if (marketLoading || historicalLoading || ethPriceLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Charts</CardTitle>
          <CardDescription>Historical market data</CardDescription>
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
          <CardTitle>Market Charts</CardTitle>
          <CardDescription>Historical market data</CardDescription>
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
          <CardTitle>Market Charts</CardTitle>
          <CardDescription>Historical market data</CardDescription>
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
        <CardTitle>Market Charts</CardTitle>
        <CardDescription>
          Current: Implied {formatBasisPoints(marketData?.impliedRate || 0n)} | 
          Funding {formatBasisPoints(marketData?.currentFundingRateBps || 0n)} | 
          ETH ${ethPrice?.toFixed(2) || '0.00'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-4 bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('rates')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'rates'
                ? 'bg-[hsl(var(--primary))] text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Funding Rates
          </button>
          <button
            onClick={() => setActiveTab('eth')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'eth'
                ? 'bg-[hsl(var(--primary))] text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            BTC Price
          </button>
        </div>

        {/* Funding Rates Chart */}
        {activeTab === 'rates' && (
          <ChartContainer config={ratesChartConfig}>
            <LineChart
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
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip 
                cursor={true} 
                content={<ChartTooltipContent />}
                formatter={(value, name) => [`${value}%`, name]}
              />
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
        )}

        {/* ETH Price Chart */}
        {activeTab === 'eth' && (
          <ChartContainer config={ethChartConfig}>
            <LineChart
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
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `$${value}`}
              />
              <ChartTooltip 
                cursor={true} 
                content={<ChartTooltipContent />}
                formatter={(value, name) => [`$${value}`, name]}
              />
              <Line
                dataKey="ethPrice"
                type="monotone"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
