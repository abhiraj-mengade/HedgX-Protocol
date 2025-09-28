"use client";
import React, { useState } from "react";
import { useUserPositions, useTrading, useOrderbookData, useHNPrice, useMarketData } from "@/hooks/useHedgXVault";
import { readContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { hedgxVaultContract, getHedgXVaultContract } from "@/lib/contract";
import { formatETH, formatBasisPoints, Side } from "@/lib/contract";
import { useActiveAccount } from "thirdweb/react";
import { useChain } from "@/contexts/ChainContext";

export function Positions() {
  const { selectedChainId } = useChain();
  const { positions, loading, error, refetch } = useUserPositions();
  const { limitOrders, loading: ordersLoading, error: ordersError } = useOrderbookData();
  const { redeem, loading: tradingLoading } = useTrading();
  const { calculateTokenValue, calculateHNPriceWithBuffer } = useHNPrice();
  const { marketData } = useMarketData();
  const account = useActiveAccount();
  const [redeemingPosition, setRedeemingPosition] = useState<number | null>(null);
  const [positionValues, setPositionValues] = useState<{ [key: number]: bigint }>({});
  const [redeemValues, setRedeemValues] = useState<{ [key: number]: bigint }>({});
  const [positionPnLs, setPositionPnLs] = useState<{ [key: number]: { pnl: bigint, pnlPercent: number, accumulated: bigint, unrealized: bigint } }>({});
  const [longIndex, setLongIndex] = useState<bigint>(0n);
  const [shortIndex, setShortIndex] = useState<bigint>(0n);
  const [isSettling, setIsSettling] = useState(false);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [newOracleRate, setNewOracleRate] = useState("");

  // Fetch settlement indices from contract
  React.useEffect(() => {
    const fetchSettlementIndices = async () => {
      try {
        const contract = getHedgXVaultContract(selectedChainId);
        const [longIdx, shortIdx] = await Promise.all([
          (readContract as any)({
            contract: contract as any,
            method: "longIndex"
          }),
          (readContract as any)({
            contract: contract as any,
            method: "shortIndex"
          })
        ]);
        
        setLongIndex(longIdx);
        setShortIndex(shortIdx);
        
      console.log("Settlement indices:", {
        longIndex: longIdx.toString(),
        shortIndex: shortIdx.toString()
      });
      
      // Also fetch current rates for debugging
      try {
        const rates = await (readContract as any)({
          contract: contract as any,
          method: "getRates"
        });
        console.log("Current rates:", {
          oracleRate: rates[0].toString(),
          impliedRate: rates[1].toString()
        });
      } catch (err) {
        console.error("Failed to fetch rates:", err);
      }
      } catch (err) {
        console.error("Failed to fetch settlement indices:", err);
      }
    };
    
    fetchSettlementIndices();
  }, [selectedChainId]);

  // Trigger settlement
  const handleSettle = async () => {
    if (!account) {
      alert("Please connect your wallet");
      return;
    }

    try {
      setIsSettling(true);
      
      const contract = getHedgXVaultContract(selectedChainId);
      const transaction = (prepareContractCall as any)({
        contract: contract as any,
        method: "settle"
      });

      const result = await sendTransaction({ transaction, account });
      await waitForReceipt(result);
      
      alert("Settlement successful! PnL has been updated.");
      
      // Refresh settlement indices
      const fetchSettlementIndices = async () => {
        try {
          const [longIdx, shortIdx] = await Promise.all([
            (readContract as any)({
              contract: contract as any,
              method: "longIndex"
            }),
            (readContract as any)({
              contract: contract as any,
              method: "shortIndex"
            })
          ]);
          
          setLongIndex(longIdx);
          setShortIndex(shortIdx);
          
          console.log("Updated settlement indices:", {
            longIndex: longIdx.toString(),
            shortIndex: shortIdx.toString()
          });
          
          // Also fetch current rates for debugging
          try {
            const rates = await (readContract as any)({
              contract: hedgxVaultContract as any,
              method: "getRates"
            });
            console.log("Current rates after settlement:", {
              oracleRate: rates[0].toString(),
              impliedRate: rates[1].toString(),
              rateDifference: (parseInt(rates[0]) - parseInt(rates[1])).toString()
            });
          } catch (err) {
            console.error("Failed to fetch rates after settlement:", err);
          }
        } catch (err) {
          console.error("Failed to fetch updated settlement indices:", err);
        }
      };
      
      await fetchSettlementIndices();
      
    } catch (err) {
      alert(`Settlement failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSettling(false);
    }
  };

  // Update oracle rate
  const handleUpdateRate = async () => {
    if (!account) {
      alert("Please connect your wallet");
      return;
    }

    if (!newOracleRate) {
      alert("Please enter a new oracle rate");
      return;
    }

    try {
      setIsUpdatingRate(true);
      
      // Convert percentage to basis points (e.g., 6.5% -> 650)
      const rateBps = Math.floor(parseFloat(newOracleRate) * 100);
      
      const contract = getHedgXVaultContract(selectedChainId);
      const transaction = (prepareContractCall as any)({
        contract: contract as any,
        method: "updateRate",
        params: [BigInt(rateBps)]
      });

      const result = await sendTransaction({ transaction, account });
      await waitForReceipt(result);
      
      alert(`Oracle rate updated to ${newOracleRate}%!`);
      setNewOracleRate("");
      
    } catch (err) {
      alert(`Rate update failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsUpdatingRate(false);
    }
  };


  // Calculate PnL for a position using the contract's getPositionPnL function
  const calculatePnL = async (position: any, positionId: number, currentValue: bigint) => {
    try {
      const contract = getHedgXVaultContract(selectedChainId);
      // Get total PnL (cumulative since position creation)
      const totalPnL = await (readContract as any)({
        contract: contract as any,
        method: "getPositionPnL",
        params: [account?.address, BigInt(positionId)]
      });
      
      // Calculate percentage based on current value
      const pnlPercent = currentValue > 0n 
        ? Number((totalPnL * 10000n) / currentValue) / 100
        : 0;
      
      console.log("PnL calculation (cumulative):", {
        positionId,
        side: position.side === Side.Long ? "Long" : "Short",
        exposureAmount: position.exposureAmount.toString(),
        fixedRate: position.fixedRate.toString(),
        totalPnL: totalPnL.toString(),
        currentValue: currentValue.toString(),
        pnlPercent
      });
      
      return { 
        pnl: totalPnL, 
        pnlPercent,
        accumulated: totalPnL, // All PnL is now "accumulated" since position creation
        unrealized: 0n // No separate unrealized component
      };
    } catch (err) {
      console.error("Failed to get position PnL:", err);
      return { pnl: 0n, pnlPercent: 0, accumulated: 0n, unrealized: 0n };
    }
  };

  // Update position values when positions or market data changes
  React.useEffect(() => {
    const updatePositionValues = async () => {
      if (!positions.length || !marketData) return;
      
      const newValues: { [key: number]: bigint } = {};
      const newRedeemValues: { [key: number]: bigint } = {};
      const newPnLs: { [key: number]: { pnl: bigint, pnlPercent: number, accumulated: bigint, unrealized: bigint } } = {};
      
      for (let i = 0; i < positions.length; i++) {
        try {
          const position = positions[i];
          
          // Market value: Use current implied rate (0) to get current market value
          const marketValue = await calculateHNPriceWithBuffer(
            formatETH(position.exposureAmount),
            position.side,
            "0" // Use 0 for current implied rate
          );
          
          // Redeem value: Use current market rate (same as market value)
          const redeemValue = await calculateHNPriceWithBuffer(
            formatETH(position.exposureAmount),
            position.side,
            "0" // Use 0 for current implied rate (market value)
          );
          
          // Calculate PnL using the contract function
          const pnlData = await calculatePnL(position, i, marketValue);
          
          console.log(`Position ${i} calculations:`, {
            exposureAmount: formatETH(position.exposureAmount),
            side: position.side === Side.Long ? "Long" : "Short",
            fixedRate: position.fixedRate.toString(),
            currentImpliedRate: marketData?.impliedRate?.toString() || "unknown",
            marketValue: formatETH(marketValue),
            redeemValue: formatETH(redeemValue),
            pnl: formatETH(pnlData.pnl),
            pnlPercent: pnlData.pnlPercent.toFixed(2) + "%"
          });
          
          newValues[i] = marketValue;
          newRedeemValues[i] = redeemValue;
          newPnLs[i] = pnlData;
        } catch (err) {
          console.error(`Failed to calculate values for position ${i}:`, err);
          newValues[i] = 0n;
          newRedeemValues[i] = 0n;
          newPnLs[i] = { pnl: 0n, pnlPercent: 0, accumulated: 0n, unrealized: 0n };
        }
      }
      
      setPositionValues(newValues);
      setRedeemValues(newRedeemValues);
      setPositionPnLs(newPnLs);
    };
    
    updatePositionValues();
  }, [positions, marketData, calculateTokenValue]);

  const handleRedeem = async (positionId: number, amount: string) => {
    if (!account) {
      alert("Please connect your wallet");
      return;
    }

    try {
      setRedeemingPosition(positionId);
      await redeem(positionId, amount);
      alert("Position redeemed successfully!");
      refetch(); // Refresh positions
    } catch (err) {
      alert(`Failed to redeem position: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setRedeemingPosition(null);
    }
  };

  // Filter user's own orders
  const userOrders = account ? limitOrders.filter(order => order.user.toLowerCase() === account.address.toLowerCase()) : [];

  if (!account) {
    return (
      <div className="bg-[#181818] p-6 rounded-2xl shadow-xl border border-[rgba(189,238,99,0.18)]">
        <h2 className="text-xl font-bold text-[hsl(var(--primary))] mb-4">Positions & Orders</h2>
        <div className="text-center text-zinc-400 py-8">
          Please connect your wallet to view positions and orders
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Positions Section */}
        <div className="bg-[#181818] p-6 rounded-2xl shadow-xl border border-[rgba(189,238,99,0.18)]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[hsl(var(--primary))]">Active Positions</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-700">
                <label className="text-xs text-zinc-400 font-medium">Oracle Rate:</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="6.5"
                  value={newOracleRate}
                  onChange={(e) => setNewOracleRate(e.target.value)}
                  className="w-16 px-2 py-1 text-sm bg-transparent border-none text-white focus:outline-none"
                />
                <span className="text-xs text-zinc-400">%</span>
                <button
                  onClick={handleUpdateRate}
                  disabled={isUpdatingRate || !account}
                  className="ml-2 px-3 py-1 text-xs rounded-md bg-[hsl(var(--primary))] text-black font-bold hover:scale-105 transition disabled:opacity-50 disabled:bg-zinc-600 disabled:text-zinc-400"
                >
                  {isUpdatingRate ? "Updating..." : "Set Oracle"}
                </button>
              </div>
              <button
                onClick={handleSettle}
                disabled={isSettling || !account}
                className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-black font-bold hover:scale-105 transition disabled:opacity-50 disabled:bg-zinc-600 disabled:text-zinc-400 shadow-lg"
              >
                {isSettling ? "Settling..." : "Trigger Settlement"}
              </button>
            </div>
          </div>
        
        {loading ? (
          <div className="text-center text-[hsl(var(--primary))] py-8">
            Loading positions...
          </div>
        ) : error ? (
          <div className="text-center text-red-400 py-8">
            Error: {error}
          </div>
        ) : positions.length === 0 ? (
          <div className="text-center text-zinc-400 py-8">
            No open positions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-[#222] text-zinc-300">
                  <th className="px-4 py-2">Position ID</th>
                  <th className="px-4 py-2">Direction</th>
                  <th className="px-4 py-2">Exposure</th>
                  <th className="px-4 py-2">Fixed Rate</th>
                  <th className="px-4 py-2">Current Value</th>
                  <th className="px-4 py-2">PnL (Cumulative)</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos, idx) => {
                  const marketValue = positionValues[idx] || 0n;
                  const pnlData = positionPnLs[idx] || { pnl: 0n, pnlPercent: 0 };
                  const { pnl, pnlPercent } = pnlData;
                  const isProfit = pnl >= 0n;
                  const isLiquidated = pnl < 0n && (-pnl) >= marketValue;
                  
                  return (
                    <tr key={idx} className="border-b border-zinc-700 hover:bg-[#232323] transition">
                      <td className="px-4 py-2 text-zinc-400">{idx}</td>
                      <td
                        className={`px-4 py-2 font-bold ${
                          pos.side === Side.Long ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {pos.side === Side.Long ? "Long" : "Short"}
                      </td>
                      <td className="px-4 py-2 text-white">{formatETH(pos.exposureAmount)}</td>
                      <td className="px-4 py-2 text-blue-300">{formatBasisPoints(pos.fixedRate)}</td>
                      <td className="px-4 py-2 text-white">{formatETH(marketValue)}</td>
                      <td className="px-4 py-2">
                        {isLiquidated ? (
                          <span className="text-red-600 font-bold">LIQUIDATED</span>
                        ) : (
                          <div className="text-sm">
                            <div className={`font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                              {isProfit ? '+' : ''}{formatETH(pnl)} ({isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%)
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Since position creation
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          className={`px-3 py-1 rounded-lg font-bold shadow transition ${
                            isLiquidated 
                              ? "bg-red-600 text-white cursor-not-allowed" 
                              : "bg-[hsl(var(--primary))] text-black hover:scale-105"
                          } disabled:opacity-50`}
                          onClick={() => handleRedeem(idx, formatETH(pos.exposureAmount))}
                          disabled={redeemingPosition === idx || tradingLoading || isLiquidated}
                        >
                          {isLiquidated ? "Liquidated" : redeemingPosition === idx ? "Redeeming..." : "Redeem"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Orders Section */}
      <div className="bg-[#181818] p-6 rounded-2xl shadow-xl border border-[rgba(189,238,99,0.18)]">
        <h2 className="text-xl font-bold text-[hsl(var(--primary))] mb-4">Pending Orders</h2>
        
        {ordersLoading ? (
          <div className="text-center text-[hsl(var(--primary))] py-8">
            Loading orders...
          </div>
        ) : ordersError ? (
          <div className="text-center text-red-400 py-8">
            Error: {ordersError}
          </div>
        ) : userOrders.length === 0 ? (
          <div className="text-center text-zinc-400 py-8">
            No active orders found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-[#222] text-zinc-300">
                  <th className="px-4 py-2">Order ID</th>
                  <th className="px-4 py-2">Side</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Rate</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {userOrders.map((order, idx) => (
                  <tr key={idx} className="border-b border-zinc-700 hover:bg-[#232323] transition">
                    <td className="px-4 py-2 text-zinc-400">{idx}</td>
                    <td
                      className={`px-4 py-2 font-bold ${
                        order.side === 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {order.side === 0 ? "Long" : "Short"}
                    </td>
                    <td className="px-4 py-2 text-white">{formatETH(order.amount)}</td>
                    <td className="px-4 py-2 text-blue-300">{formatBasisPoints(order.rate)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        order.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {order.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
