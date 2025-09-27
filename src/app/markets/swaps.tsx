"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function SwapCard() {
  const [activeTab, setActiveTab] = useState("market");
  const [isLong, setIsLong] = useState(true);
  const [notionalSize, setNotionalSize] = useState("");
  const [impliedRate, setImpliedRate] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  async function handleSwap() {
    console.log("Swapping:", { activeTab, isLong, notionalSize, impliedRate });
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
      <DialogContent className="sm:max-w-[425px] bg-[#181818] rounded-2xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-[hsl(var(--primary))]">
            Create Swap
          </DialogTitle>
        </DialogHeader>
        <div className="bg-background p-4 rounded-2xl shadow-xl space-y-4 w-full mx-auto border border-[rgba(189,238,99,0.18)]">
          {/* Market / Limit Tabs */}
          <div className="flex gap-2 mb-2">
            <button
              className={`flex-1 py-2 rounded-xl font-bold transition-all duration-150 ${
                activeTab === "market"
                  ? "bg-[hsl(var(--primary))] text-black shadow-lg scale-105"
                  : "bg-blue-600 text-white"
              }`}
              onClick={() => setActiveTab("market")}
            >
              Market
            </button>
            <button
              className={`flex-1 py-2 rounded-xl font-bold transition-all duration-150 ${
                activeTab === "limit"
                  ? "bg-[hsl(var(--primary))] text-black shadow-lg scale-105"
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
              className={`flex-1 py-2 rounded-xl font-bold transition-all duration-150 ${
                isLong
                  ? "bg-[hsl(var(--primary))] text-black shadow-lg scale-105"
                  : "bg-green-700 text-white"
              }`}
              onClick={() => setIsLong(true)}
            >
              Long Rates <br /> <span className="text-xs">Pay Fixed, Rcv. Underlying</span>
            </button>
            <button
              className={`flex-1 py-2 rounded-xl font-bold transition-all duration-150 ${
                !isLong
                  ? "bg-[hsl(var(--primary))] text-black shadow-lg scale-105"
                  : "bg-red-700 text-white"
              }`}
              onClick={() => setIsLong(false)}
            >
              Short Rates <br /> <span className="text-xs">Pay Underlying, Rcv. Fixed</span>
            </button>
          </div>

          {/* Notional Size */}
          <div className="bg-[#222] rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-zinc-400 mb-1">
              <span>My Notional Size</span>
              <span className="text-[hsl(var(--primary))] font-bold">{notionalSize} YU</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-400 mb-1">
              <span>Available To Trade</span>
              <span className="text-green-300 font-bold">0 BTC</span>
            </div>
            <input
              type="number"
              placeholder="Notional Size"
              value={notionalSize}
              onChange={(e) => setNotionalSize(e.target.value)}
              className="w-full p-3 bg-[#181818] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] font-semibold"
            />
            {activeTab === "limit" && (
              <input
                type="number"
                placeholder="Implied Rate (%)"
                value={impliedRate}
                onChange={(e) => setImpliedRate(e.target.value)}
                className="w-full mt-2 p-3 bg-[#181818] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold"
              />
            )}
          </div>
        </div>
        <DialogFooter className="flex gap-4 mt-6">
          <button
            className="flex-1 py-2 rounded-lg bg-[hsl(var(--primary))] text-black font-bold  transition"
            onClick={handleSwap}
            type="button"
          >
            Confirm & Swap
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
