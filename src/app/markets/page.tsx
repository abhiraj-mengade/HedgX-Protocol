"use client";
import { useEffect, useState } from "react";
import CollateralTable from "./collaterals";
import Link from "next/link";

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
  const [markets, setMarkets] = useState<Market[]>([
    {
      type: "BTC Collateral",
      id: "BTC-USDT",
      maturity: "30 days",
      implied_apr: "7.07%",
      underlying_apr: "7.27%",
      volume: "14.143 BTC",
      notional_ol: "37 BTC",
      long_short_rate_roi: "1.76% long rate",
    },
    {
      type: "SOL Collateral",
      id: "SOL-USDT",
      maturity: "30 days",
      implied_apr: "6.06%",
      underlying_apr: "4.38%",
      volume: "1600 SOL",
      notional_ol: "2321 SOL",
      long_short_rate_roi: "143.76% short rate",
    },
    {
      type: "ETH Collateral",
      id: "ETH-USDT",
      maturity: "30 days",
      implied_apr: "5.05%",
      underlying_apr: "2.38%",
      volume: "2511 ETH",
      notional_ol: "3843 ETH",
      long_short_rate_roi: "37.4% short rate",
    },
  ]);

  useEffect(() => {
    // Simulate fetching data or any client-side dynamic logic
    setMarkets((prevMarkets) => [...prevMarkets]);
  }, []);

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

  return (
    <div className="grid gap-4">
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
      </div>
      <div className="grid grid-cols-1 gap-2 md:hidden">
        {markets.map((market) => renderCard(market))}
      </div>
    </div>
  );
}
