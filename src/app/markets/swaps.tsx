"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTrading, useMarketData, useHNPrice } from "@/hooks/useHedgXVault";
import { useActiveAccount } from "thirdweb/react";
import { Side, formatETH, formatBasisPoints, parseETH, COLLATERAL_RATIO } from "@/lib/contract";

export function SwapCard() {
  const [activeTab, setActiveTab] = useState("market");
  const [isLong, setIsLong] = useState(true);
  const [notionalSize, setNotionalSize] = useState("");
  const [impliedRate, setImpliedRate] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [hnPrice, setHnPrice] = useState<bigint>(0n);
  const [totalCost, setTotalCost] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  const { marketData } = useMarketData();
  const { calculateHNPrice } = useHNPrice();
  const {
    mintMarketLong,
    mintMarketShort,
    mintLimitLong,
    mintLimitShort,
    loading: tradingLoading,
  } = useTrading();
  const account = useActiveAccount();

  // Calculate HN price and total cost when inputs change
  useEffect(() => {
    const calculateCosts = async () => {
      if (!notionalSize || !marketData) return;

      try {
        const exposureAmount = parseETH(notionalSize);
        const side = isLong ? Side.Long : Side.Short;
        // Convert percentage to basis points for limit orders
        const rate =
          activeTab === "market"
            ? marketData.impliedRate
            : BigInt(Math.floor(parseFloat(impliedRate || "0") * 100)); // Convert percentage to basis points

        const price = await calculateHNPrice(notionalSize, side, rate.toString());
        const collateral =
          (exposureAmount * BigInt(Math.floor(COLLATERAL_RATIO * 1e18))) / BigInt(1e18);
        const total = price + collateral;

        setHnPrice(price);
        setTotalCost(total);
      } catch (err) {
        console.error("Failed to calculate costs:", err);
      }
    };

    calculateCosts();
  }, [notionalSize, isLong, activeTab, impliedRate, marketData, calculateHNPrice]);

  async function handleSwap() {
    if (!account) {
      alert("Please connect your wallet");
      return;
    }

    if (!notionalSize) {
      alert("Please enter a notional size");
      return;
    }

    if (activeTab === "limit" && !impliedRate) {
      alert("Please enter a limit rate");
      return;
    }

    try {
      setLoading(true);

      const side = isLong ? Side.Long : Side.Short;
      const rate = activeTab === "market" ? marketData?.impliedRate || 0n : BigInt(impliedRate);

      let receipt;
      if (activeTab === "market") {
        if (isLong) {
          receipt = await mintMarketLong(notionalSize, formatETH(totalCost));
        } else {
          receipt = await mintMarketShort(notionalSize, formatETH(totalCost));
        }
      } else {
        // Convert percentage to basis points for contract calls
        const rateInBps = Math.floor(parseFloat(impliedRate || "0") * 100);
        if (isLong) {
          receipt = await mintLimitLong(notionalSize, rateInBps.toString(), formatETH(totalCost));
        } else {
          receipt = await mintLimitShort(notionalSize, rateInBps.toString(), formatETH(totalCost));
        }
      }

      alert("Transaction successful! Check your positions.");
      setShowPopup(false);
      setNotionalSize("");
      setImpliedRate("");
    } catch (err) {
      alert(`Transaction failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={showPopup} onOpenChange={setShowPopup}>
      <DialogTrigger asChild>
        <button
          className="w-full py-3 rounded-xl bg-[rgba(189,238,99)] text-black font-semibold shadow-lg h-10 transition-all duration-150 focus:outline-none flex items-center justify-center"
          onClick={() => setShowPopup(true)}
        >
          Swap Portal
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-[hsl(var(--primary))]">
            Create Swap
          </DialogTitle>
        </DialogHeader>
        <div className="p-2 shadow-xl space-y-4 w-full mx-auto">
          {/* Market / Limit Tabs */}
          <div className="flex gap-2 mb-2">
            <button
              className={`flex-1 w-full h-10 rounded-md font-bold transition-all duration-150 ${
                activeTab === "market"
                  ? "bg-[hsl(var(--primary))] text-black"
                  : "bg-[#2a2a2b] text-white"
              }`}
              onClick={() => setActiveTab("market")}
            >
              Market
            </button>
            <button
              className={`flex-1 w-full h-10 rounded-md font-bold transition-all duration-150 ${
                activeTab === "limit"
                  ? "bg-[hsl(var(--primary))] text-black"
                  : "bg-[#2a2a2b] text-white"
              }`}
              onClick={() => setActiveTab("limit")}
            >
              Limit
            </button>
          </div>

          {/* Long / Short Rate Options */}
          <div className="flex justify-between gap-2 mb-2">
            <button
              className={`rounded-md text-xs w-full h-10 font-bold transition-all duration-150 flex flex-col items-center justify-center ${
                isLong
                  ? "bg-success/20 text-success border border-success"
                  : "text-success border border-background"
              }`}
              onClick={() => setIsLong(true)}
            >
              <div className="flex items-center gap-1">
                <TrendingUp size={14} />
                <span>Long Rates</span>
              </div>
              <span className="text-xs">Pay Fixed, Rcv. Underlying</span>
            </button>
            <button
              className={`rounded-md text-xs w-full h-10 font-bold transition-all duration-150 flex flex-col items-center justify-center ${
                !isLong
                  ? "bg-destructive/20 text-destructive border border-destructive"
                  : "text-destructive border border-background"
              }`}
              onClick={() => setIsLong(false)}
            >
              <div className="flex items-center gap-1">
                <TrendingDown size={14} />
                <span>Short Rates</span>
              </div>
              <span className="text-xs">Pay Underlying, Rcv. Fixed</span>
            </button>
          </div>

          {/* Current Rates */}
          {marketData && (
            <div className="bg-gradient-to-r from-[rgba(189,238,99,0.05)] to-[rgba(189,238,99,0.02)] border border-[rgba(189,238,99,0.14)] rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Current Oracle Rate</span>
                <span
                  className="text-blue-400 font-bold"
                  style={{
                    textShadow: "0 0 8px rgba(96, 165, 250, 0.5)",
                  }}
                >
                  {formatBasisPoints(marketData.currentFundingRateBps)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Implied Rate</span>
                <span
                  className="text-[hsl(var(--primary))] font-bold"
                  style={{ textShadow: "0px 0px 12px hsl(var(--primary))" }}
                >
                  {formatBasisPoints(marketData.impliedRate)}
                </span>
              </div>
            </div>
          )}

          {/* Notional Size */}
          <div className="bg-gradient-to-r from-[rgba(189,238,99,0.05)] to-[rgba(189,238,99,0.02)] border border-[rgba(189,238,99,0.14)] rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm text-[hsl(var(--muted-foreground))] mb-2">
              <span>Exposure Amount (ETH)</span>
              <span
                className="text-[hsl(var(--primary))] font-bold"
                style={{ textShadow: "0px 0px 12px hsl(var(--primary))" }}
              >
                {notionalSize || "0"} ETH
              </span>
            </div>
            <input
              type="number"
              step="0.001"
              placeholder="Exposure Amount (ETH)"
              value={notionalSize}
              onChange={(e) => setNotionalSize(e.target.value)}
              className="w-full p-3 bg-[rgba(0,0,0,0.4)] backdrop-blur-sm text-[hsl(var(--foreground))] rounded-lg border border-[rgba(189,238,99,0.2)] focus:outline-none focus:border-[hsl(var(--primary))] font-semibold placeholder:text-[hsl(var(--muted-foreground))] transition-all duration-200"
            />
            {activeTab === "limit" && (
              <input
                type="number"
                step="0.01"
                placeholder="Enter limit rate (%) - e.g., 7.5 for 7.5%"
                value={impliedRate}
                onChange={(e) => setImpliedRate(e.target.value)}
                className="w-full p-3 bg-[rgba(0,0,0,0.4)] backdrop-blur-sm text-[hsl(var(--foreground))] rounded-lg border border-[rgba(189,238,99,0.2)] focus:outline-none focus:border-[hsl(var(--primary))] font-semibold placeholder:text-[hsl(var(--muted-foreground))] transition-all duration-200"
              />
            )}
          </div>

          {/* Cost Breakdown */}
          {notionalSize && totalCost > 0n && (
            <div className="bg-gradient-to-r from-[rgba(189,238,99,0.05)] to-[rgba(189,238,99,0.02)] border border-[rgba(189,238,99,0.14)] rounded-lg p-4 space-y-3">
              <div className="text-sm text-[hsl(var(--muted-foreground))] mb-3 font-semibold">
                Cost Breakdown:
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Collateral (20%)</span>
                <span className="text-[hsl(var(--foreground))] font-bold">
                  {formatETH(
                    (parseETH(notionalSize) * BigInt(Math.floor(COLLATERAL_RATIO * 1e18))) /
                      BigInt(1e18),
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">HN Premium</span>
                <span className="text-[hsl(var(--foreground))] font-bold">
                  {formatETH(hnPrice)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-[rgba(189,238,99,0.2)] pt-3 mt-3">
                <span
                  className="text-[hsl(var(--primary))]"
                  style={{ textShadow: "0px 0px 12px hsl(var(--primary))" }}
                >
                  Total Cost
                </span>
                <span
                  className="text-[hsl(var(--primary))]"
                  style={{ textShadow: "0px 0px 12px hsl(var(--primary))" }}
                >
                  {formatETH(totalCost)}
                </span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex gap-4 mt-6">
          <button
            className="flex-1 py-2 rounded-lg bg-[hsl(var(--primary))] text-black font-bold transition disabled:opacity-50"
            onClick={handleSwap}
            disabled={loading || tradingLoading || !account}
            type="button"
          >
            {loading || tradingLoading ? "Processing..." : "Confirm & Swap"}
          </button>
          <button
            className="flex-1 py-2 rounded-lg bg-zinc-700 text-white font-bold shadow hover:scale-[1.03] transition"
            onClick={() => setShowPopup(false)}
            type="button"
          >
            Cancel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
