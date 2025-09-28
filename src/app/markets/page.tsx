"use client";
import { useEffect, useState } from "react";
import CollateralTable from "./collaterals";
import Link from "next/link";
import { useMarketData } from "@/hooks/useHedgXVault";
import { formatBasisPoints, formatETH, formatTimeRemaining } from "@/lib/contract";
import DotGrid from "@/components/DotGrid";
import { InterestRateTable } from "./interest-rates";

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

  // Format market ID for display (BTC-USDT -> BTC/USDT)
  const formatMarketDisplay = (marketId: string) => {
    return marketId.replace('-', '/');
  };

  useEffect(() => {
    if (marketData) {
      // Create BTC market data from contract (live data)
      const btcMarket: Market = {
        type: "BTC Collateral",
        id: "BTC-USDT",
        maturity: formatTimeRemaining(marketData.cycleEnd),
        implied_apr: formatBasisPoints(marketData.impliedRate),
        underlying_apr: formatBasisPoints(marketData.currentFundingRateBps),
        volume: formatETH(marketData.vaultLiquidity),
        notional_ol: formatETH(marketData.vaultLiquidity * 5n), // 5x leverage
        long_short_rate_roi: `${formatBasisPoints(marketData.impliedRate)} implied rate`,
      };

      // Create additional mock markets with varied data
      const ethMarket: Market = {
        type: "ETH Collateral",
        id: "ETH-USDT",
        maturity: "18 days",
        implied_apr: "12.45%",
        underlying_apr: "11.20%",
        volume: "2.8500 ETH",
        notional_ol: "14.2500 ETH",
        long_short_rate_roi: "12.45% implied rate",
      };

      const solMarket: Market = {
        type: "SOL Collateral",
        id: "SOL-USDT",
        maturity: "22 days",
        implied_apr: "18.75%",
        underlying_apr: "17.30%",
        volume: "1.9200 ETH",
        notional_ol: "9.6000 ETH",
        long_short_rate_roi: "18.75% implied rate",
      };

      const dotMarket: Market = {
        type: "DOT Collateral",
        id: "DOT-USDT",
        maturity: "15 days",
        implied_apr: "9.85%",
        underlying_apr: "8.60%",
        volume: "3.1800 ETH",
        notional_ol: "15.9000 ETH",
        long_short_rate_roi: "9.85% implied rate",
      };

      setMarkets([btcMarket, ethMarket, solMarket, dotMarket]);
    }
  }, [marketData]);

  // Mock interest rate markets data
  const interestRateMarkets: Market[] = [
    {
      id: "ETH-USDT",
      type: "ETH Collateral",
      maturity: "Dec 31, 2024",
      implied_apr: "15.2%",
      underlying_apr: "12.8%",
      volume: "$1.9M",
      notional_ol: "$11.3M",
      long_short_rate_roi: "12.1% / 9.8%",
    },
  ];

  const renderCard = (market: Market) => (
    <div
      key={market.id}
      className="rounded-lg p-4 flex flex-col gap-2 bg-[rgba(189,238,99,0.05)] border border-[rgba(189,238,99,0.14)]"
    >
      <span
        className="text-[hsl(var(--foreground))] font-semibold"
        style={{ textShadow: "0px 0px 12px hsl(var(--primary))" }}
      >
        {market.type}
      </span>
      <Link
        href={`/markets/${market.id}`}
        className="text-[hsl(var(--foreground))] hover:underline"
      >
        {formatMarketDisplay(market.id)}
      </Link>
      <p>Maturity: {market.maturity}</p>
      <p>Implied APR: {market.implied_apr}</p>
      <p>Underlying APR: {market.underlying_apr}</p>
      <p>Volume: {market.volume}</p>
      <p>Notional OL: {market.notional_ol}</p>
      <p>Long/Short Rate ROI: {market.long_short_rate_roi}</p>
    </div>
  );

  const renderInterestRateCard = (market: Market) => (
    <div
      key={market.id}
      className="rounded-lg p-4 flex flex-col gap-2 bg-[rgba(189,238,99,0.05)] border border-[rgba(189,238,99,0.14)]"
    >
      <span
        className="text-[hsl(var(--foreground))] font-semibold"
        style={{ textShadow: "0px 0px 12px hsl(var(--primary))" }}
      >
        {market.type}
      </span>
      <Link
        href={`/markets/${market.id}`}
        className="text-[hsl(var(--foreground))] hover:underline"
      >
        {formatMarketDisplay(market.id)}
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
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[hsl(var(--primary))]"></div>
          <div className="text-[hsl(var(--primary))] text-xl animate-pulse">
            Loading market data...
          </div>
        </div>
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
    <div className="min-h-screen relative">
      {/* Dot Grid Background */}
      <div className="fixed inset-0 w-full h-full" style={{ opacity: 0.5 }}>
        <DotGrid
          dotSize={4}
          gap={15}
          baseColor="#303030"
          activeColor="#BDEE63"
          proximity={120}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 pointer-events-none p-4">
        <div className="pointer-events-auto space-y-8">
          {/* Funding Rate Markets Section */}
          <div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">
              Funding Rate Markets
            </h2>
            <div className="hidden md:grid grid-cols-1 gap-2">
              <CollateralTable
                title="BTC Collateral"
                markets={markets.filter((market) => market.type === "BTC Collateral")}
              />
              <CollateralTable
                title="ETH Collateral"
                markets={markets.filter((market) => market.type === "ETH Collateral")}
              />
              <CollateralTable
                title="SOL Collateral"
                markets={markets.filter((market) => market.type === "SOL Collateral")}
              />
              <CollateralTable
                title="DOT Collateral"
                markets={markets.filter((market) => market.type === "DOT Collateral")}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 md:hidden">
              {markets.map((market) => renderCard(market))}
            </div>
          </div>

          {/* Interest Rate Markets Section */}
          <div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">
              Interest Rate Markets
            </h2>
            <div className="hidden md:grid grid-cols-1 gap-2">
              <InterestRateTable title="ETH Interest Rate" markets={interestRateMarkets} />
            </div>
            <div className="grid grid-cols-1 gap-2 md:hidden">
              {interestRateMarkets.map((market) => renderInterestRateCard(market))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
