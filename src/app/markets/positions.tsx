"use client";
import React from "react";

const mockPositions = [
  {
    market: "BTC-USDT",
    direction: "Long",
    orderSize: "1.25 BTC",
    margin: "0.15 BTC",
    status: "Open",
    time: "2025-09-27 10:15",
    impliedRate: "7.07%",
  },
  {
    market: "ETH-USDT",
    direction: "Short",
    orderSize: "2.00 ETH",
    margin: "0.20 ETH",
    status: "Open",
    time: "2025-09-27 09:45",
    impliedRate: "5.05%",
  },
  {
    market: "SOL-USDT",
    direction: "Long",
    orderSize: "500 SOL",
    margin: "50 SOL",
    status: "Open",
    time: "2025-09-27 08:30",
    impliedRate: "6.06%",
  },
];

export function Positions() {
  type Position = (typeof mockPositions)[number];
  const handleSettle = (pos: Position) => {
    alert(`Settling swap for ${pos.market} (${pos.direction})`);
    // Add smart contract/web3 logic here
  };

  return (
    <div className="bg-[#181818] p-6 rounded-2xl shadow-xl border border-[rgba(189,238,99,0.18)]">
      <h2 className="text-xl font-bold text-[hsl(var(--primary))] mb-4">Open Positions</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead>
            <tr className="bg-[#222] text-zinc-300">
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Market</th>
              <th className="px-4 py-2">Direction</th>
              <th className="px-4 py-2">Order Size</th>
              <th className="px-4 py-2">Collateral</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Implied Rate</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {mockPositions.map((pos, idx) => (
              <tr key={idx} className="border-b border-zinc-700 hover:bg-[#232323] transition">
                <td className="px-4 py-2 text-zinc-400">{pos.time}</td>
                <td className="px-4 py-2 font-semibold text-white">{pos.market}</td>
                <td
                  className={`px-4 py-2 font-bold ${
                    pos.direction === "Long" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {pos.direction}
                </td>
                <td className="px-4 py-2 text-white">{pos.orderSize}</td>
                <td className="px-4 py-2 text-white">{pos.margin}</td>
                <td className="px-4 py-2 text-yellow-300 font-bold">{pos.status}</td>
                <td className="px-4 py-2 text-blue-300">{pos.impliedRate}</td>
                <td className="px-4 py-2">
                  <button
                    className="px-3 py-1 rounded-lg bg-[hsl(var(--primary))] text-black font-bold shadow hover:scale-105 transition"
                    onClick={() => handleSettle(pos)}
                  >
                    Settle Swap
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
