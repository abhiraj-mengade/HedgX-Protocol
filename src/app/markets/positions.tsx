"use client";
import React, { useState } from "react";
import { useUserPositions, useTrading, useOrderbookData } from "@/hooks/useHedgXVault";
import { formatETH, formatBasisPoints, Side } from "@/lib/contract";
import { useActiveAccount } from "thirdweb/react";

export function Positions() {
  const { positions, loading, error, refetch } = useUserPositions();
  const { limitOrders, loading: ordersLoading, error: ordersError } = useOrderbookData();
  const { redeem, loading: tradingLoading } = useTrading();
  const account = useActiveAccount();
  const [redeemingPosition, setRedeemingPosition] = useState<number | null>(null);

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
        <h2 className="text-xl font-bold text-[hsl(var(--primary))] mb-4">Open Positions</h2>
        
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
                  <th className="px-4 py-2">Collateral</th>
                  <th className="px-4 py-2">Fixed Rate</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos, idx) => (
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
                    <td className="px-4 py-2 text-white">{formatETH(pos.collateral)}</td>
                    <td className="px-4 py-2 text-blue-300">{formatBasisPoints(pos.fixedRate)}</td>
                    <td className="px-4 py-2">
                      <button
                        className="px-3 py-1 rounded-lg bg-[hsl(var(--primary))] text-black font-bold shadow hover:scale-105 transition disabled:opacity-50"
                        onClick={() => handleRedeem(idx, formatETH(pos.exposureAmount))}
                        disabled={redeemingPosition === idx || tradingLoading}
                      >
                        {redeemingPosition === idx ? "Redeeming..." : "Redeem"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Orders Section */}
      <div className="bg-[#181818] p-6 rounded-2xl shadow-xl border border-[rgba(189,238,99,0.18)]">
        <h2 className="text-xl font-bold text-[hsl(var(--primary))] mb-4">Active Orders</h2>
        
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
