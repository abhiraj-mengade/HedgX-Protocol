"use client";
import { useEffect, useState } from "react";
import CollateralTable from "./collaterals";
import Link from "next/link";
import { useMarketData } from "@/hooks/useHedgXVault";
import { formatBasisPoints, formatETH, formatTimeRemaining } from "@/lib/contract";

interface Market {
  type: string;
  id: string;
  maturity: string;
  implied_apr: string;
  underlying_apr: string;
  volume: string;
  notional_ol: string;
  long_short_rate_roi: string;
}

export default function Markets() {
  const { marketData, loading, error } = useMarketData();
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    if (marketData) {
      // Create ETH market data from contract
      const ethMarket: Market = {
        type: "ETH Collateral",
        id: "ETH-USDT",
        maturity: formatTimeRemaining(marketData.cycleEnd),
        implied_apr: formatBasisPoints(marketData.impliedRate),
        underlying_apr: formatBasisPoints(marketData.currentFundingRateBps),
        volume: formatETH(marketData.vaultLiquidity),
        notional_ol: formatETH(marketData.vaultLiquidity * 5n), // 5x leverage
        long_short_rate_roi: `${formatBasisPoints(marketData.impliedRate)} implied rate`,
      };

      setMarkets([ethMarket]);
    }
  }, [marketData]);

  const renderCard = (market: Market) => (
    <div
      key={market.id}
      className="rounded-lg p-4 flex flex-col gap-2 bg-[rgba(189,238,99,0.05)] border border-[rgba(189,238,99,0.14)]"
    >
      <span
        className="text-[hsl(var(--foreground))] font-semibold"
        style={{
          textShadow: "0 0 8px hsl(var(--primary)), 0 0 16px hsl(var(--primary))",
        }}
      >
        {market.type}
      </span>{" "}
      <Link
        href={`/markets/${market.id}`}
        className="text-[hsl(var(--foreground))] hover:underline"
      >
        {market.id}
      </Link>
      <p>Maturity: {market.maturity}</p>
      <p>Implied APR: {market.implied_apr}</p>
      <p>Underlying APR: {market.underlying_apr}</p>
      <p>Volume: {market.volume}</p>
      <p>Notional OL: {market.notional_ol}</p>
      <p>Long/Short Rate ROI: {market.long_short_rate_roi}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[hsl(var(--primary))] text-lg">Loading market data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-400 text-lg">Error: {error}</div>
        <div className="text-sm text-zinc-400 mt-2">
          This might be due to contract configuration. Check the console for more details.
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="hidden md:grid grid-cols-1 gap-2">
        <CollateralTable
          title="ETH Collateral"
          markets={markets.filter((market) => market.type === "ETH Collateral")}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 md:hidden">
        {markets.map((market) => renderCard(market))}
      </div>
    </div>
  );
}
