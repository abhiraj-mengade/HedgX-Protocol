"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMarketData } from "@/hooks/useHedgXVault";
import { readContract } from "thirdweb";
import { hedgxVaultContract, getHedgXVaultContract } from "@/lib/contract";
import { useChain } from "@/contexts/ChainContext";

interface EpochInfo {
  current: bigint;
  total: bigint;
  remaining: bigint;
}

interface CycleInfo {
  cycleId: bigint;
  start: bigint;
  end: bigint;
}

export function SettlementCountdown() {
  const { selectedChainId } = useChain();
  const { marketData } = useMarketData();
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(null);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [lastSettlement, setLastSettlement] = useState<bigint | null>(null);
  const [timeToSettlement, setTimeToSettlement] = useState<string>("");
  const [timeToMaturity, setTimeToMaturity] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Fetch contract data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [epochData, cycleData, lastSettlementData] = await Promise.all([
          (readContract as any)({
            contract: getHedgXVaultContract(selectedChainId) as any,
            method: "getEpochInfo",
            params: []
          }),
          (readContract as any)({
            contract: getHedgXVaultContract(selectedChainId) as any,
            method: "getCycle",
            params: []
          }),
          (readContract as any)({
            contract: getHedgXVaultContract(selectedChainId) as any,
            method: "lastSettlement",
            params: []
          })
        ]);

        setEpochInfo({
          current: epochData[0],
          total: epochData[1],
          remaining: epochData[2]
        });

        setCycleInfo({
          cycleId: cycleData[0],
          start: cycleData[1],
          end: cycleData[2]
        });

        setLastSettlement(lastSettlementData);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch settlement data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedChainId]);

  // Update countdown timers
  useEffect(() => {
    if (!lastSettlement || !cycleInfo) return;

    const updateCountdowns = () => {
      const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
      const lastSettlementSeconds = Number(lastSettlement);
      const cycleEndSeconds = Number(cycleInfo.end);
      
      // Time to next settlement (8 hours after last settlement)
      const SETTLEMENT_INTERVAL = 8 * 60 * 60; // 8 hours in seconds
      const nextSettlement = lastSettlementSeconds + SETTLEMENT_INTERVAL;
      const secondsToSettlement = Math.max(0, nextSettlement - now);
      
      // Time to maturity (cycle end)
      const secondsToMaturity = Math.max(0, cycleEndSeconds - now);
      
      setTimeToSettlement(formatTime(secondsToSettlement));
      setTimeToMaturity(formatTime(secondsToMaturity));
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, [lastSettlement, cycleInfo]);

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return "Ready for settlement";
    
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlement Info</CardTitle>
          <CardDescription>Loading settlement data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">
            <div className="text-center text-[hsl(var(--primary))]">
              Loading...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!epochInfo || !cycleInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlement Info</CardTitle>
          <CardDescription>Failed to load settlement data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-400">
            Unable to fetch settlement information
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = epochInfo.total > 0n 
    ? Number((epochInfo.current * 100n) / epochInfo.total) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settlement & Maturity</CardTitle>
        <CardDescription>
          Cycle #{cycleInfo.cycleId.toString()} • Settlements every 8 hours
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Epoch Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-zinc-300">
              Epoch Progress
            </span>
            <span className="text-sm text-zinc-400">
              {epochInfo.current.toString()}/{epochInfo.total.toString()}
            </span>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-2">
            <div 
              className="bg-[hsl(var(--primary))] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            {epochInfo.remaining.toString()} epochs remaining
          </div>
        </div>

        {/* Settlement Countdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-400 mb-1">Next Settlement</div>
            <div className="text-lg font-bold text-[hsl(var(--primary))]">
              {timeToSettlement}
            </div>
          </div>
          
          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-400 mb-1">Time to Maturity</div>
            <div className="text-lg font-bold text-orange-400">
              {timeToMaturity}
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className="text-xs text-zinc-500 text-center pt-2 border-t border-zinc-700">
          {timeToSettlement === "Ready for settlement" ? (
            <span className="text-green-400 font-medium">⚡ Settlement Available</span>
          ) : (
            <span>Next settlement in {timeToSettlement}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
