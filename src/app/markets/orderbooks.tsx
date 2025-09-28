"use client";
import { useOrderbookData, useMarketData } from "@/hooks/useHedgXVault";
import { formatBasisPoints, formatETH } from "@/lib/contract";

export function OrderBooks() {
  const { orderbookData, limitOrders, loading, error } = useOrderbookData();
  const { marketData } = useMarketData();

  if (loading) {
    return (
      <div className="bg-[#181818] p-6 rounded-2xl shadow-xl border border-[rgba(189,238,99,0.18)]">
        <h2 className="text-xl font-bold text-center text-[hsl(var(--foreground))] mb-4">
          Orderbook
        </h2>
        <div className="text-center text-[hsl(var(--primary))] py-8">
          Loading orderbook...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#181818] p-6 rounded-2xl shadow-xl border border-[rgba(189,238,99,0.18)]">
        <h2 className="text-xl font-bold text-center text-[hsl(var(--foreground))] mb-4">
          Orderbook
        </h2>
        <div className="text-center text-red-400 py-8">
          Error: {error}
        </div>
      </div>
    );
  }

  // Create orderbook levels from real limit orders
  const createOrderbookLevels = (orders: any[], isLong: boolean) => {
    console.log(`Creating ${isLong ? 'long' : 'short'} levels from orders:`, orders);
    
    const filteredOrders = orders.filter(order => order.side === (isLong ? 0 : 1));
    console.log(`Filtered ${isLong ? 'long' : 'short'} orders:`, filteredOrders);
    
    // Group orders by rate and sum amounts
    const rateGroups: { [key: string]: bigint } = {};
    filteredOrders.forEach(order => {
      const rateKey = order.rate.toString();
      rateGroups[rateKey] = (rateGroups[rateKey] || 0n) + order.amount;
    });

    console.log(`Rate groups for ${isLong ? 'long' : 'short'}:`, rateGroups);

    // Convert to array and sort
    const levels = Object.entries(rateGroups)
      .map(([rate, amount]) => ({
        rate: formatBasisPoints(BigInt(rate)),
        size: formatETH(amount)
      }))
      .sort((a, b) => {
        const rateA = parseFloat(a.rate.replace('%', ''));
        const rateB = parseFloat(b.rate.replace('%', ''));
        return isLong ? rateB - rateA : rateA - rateB; // Long: highest first, Short: lowest first
      })
      .slice(0, 10); // Show top 10 levels

    console.log(`Final ${isLong ? 'long' : 'short'} levels:`, levels);
    return levels;
  };

  const longRates = createOrderbookLevels(limitOrders, true);
  const shortRates = createOrderbookLevels(limitOrders, false);

  // Calculate spread in frontend
  const calculateSpread = () => {
    if (longRates.length === 0 || shortRates.length === 0) return 0;
    
    // Get best long rate (highest) and best short rate (lowest)
    const bestLongRate = parseFloat(longRates[0].rate.replace('%', ''));
    const bestShortRate = parseFloat(shortRates[0].rate.replace('%', ''));
    
    return bestLongRate - bestShortRate;
  };

  const spread = calculateSpread();

  return (
    <div className="bg-[#181818] p-6 rounded-2xl shadow-xl border border-[rgba(189,238,99,0.18)]">
      <h2
        className="text-xl font-bold text-center text-[hsl(var(--foreground))] mb-4"
      >
        Orderbook
      </h2>
      
      {/* Market Summary */}
      {marketData && orderbookData && (
        <div className="mb-4 p-3 bg-[#222] rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="text-zinc-400">Total Long Orders</div>
              <div className="text-green-300 font-bold">{formatETH(orderbookData.longOrders)}</div>
            </div>
            <div className="text-center">
              <div className="text-zinc-400">Total Short Orders</div>
              <div className="text-red-300 font-bold">{formatETH(orderbookData.shortOrders)}</div>
            </div>
            <div className="text-center">
              <div className="text-zinc-400">Implied Rate</div>
              <div className="text-[hsl(var(--primary))] font-bold">{formatBasisPoints(marketData.impliedRate)}</div>
            </div>
            <div className="text-center">
              <div className="text-zinc-400">Oracle Rate</div>
              <div className="text-blue-300 font-bold">{formatBasisPoints(marketData.currentFundingRateBps)}</div>
            </div>
          </div>
          {/* Best Rates and Spread */}
          <div className="mt-3 pt-3 border-t border-zinc-700">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-zinc-400">Best Long</div>
                <div className="text-green-300 font-bold">{formatBasisPoints(orderbookData.bestLongRate)}</div>
              </div>
              <div className="text-center">
                <div className="text-zinc-400">Spread</div>
                <div className="text-[hsl(var(--primary))] font-bold">{formatBasisPoints(orderbookData.spread)}</div>
              </div>
              <div className="text-center">
                <div className="text-zinc-400">Best Short</div>
                <div className="text-red-300 font-bold">{formatBasisPoints(orderbookData.bestShortRate)}</div>
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-zinc-500 text-center">
            Active Orders: {limitOrders.length} | Long: {limitOrders.filter(o => o.side === 0).length} | Short: {limitOrders.filter(o => o.side === 1).length}
          </div>
        </div>
      )}

      {/* Vertical Orderbook Layout */}
      <div className="space-y-4">
        {/* Short Rates (Top) */}
        <div>
          <div className="text-lg font-semibold text-red-400 mb-2">Short Rates</div>
          <div className="rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            {shortRates.length > 0 ? (
              shortRates.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between px-3 py-2 text-sm bg-[#222] hover:bg-[#333] transition border-b border-zinc-700 last:border-b-0"
                >
                  <span className="font-bold text-red-300">{item.rate}</span>
                  <span className="text-red-200">{item.size}</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-zinc-500 text-center">No short orders</div>
            )}
          </div>
        </div>

        {/* Spread Display */}
        {spread > 0 && (
          <div className="text-center py-2">
            <div className="inline-flex items-center px-3 py-1 bg-[#222] rounded-full">
              <span className="text-xs text-zinc-400 mr-2">Spread:</span>
              <span className="text-[hsl(var(--primary))] font-bold">{spread.toFixed(2)}%</span>
            </div>
          </div>
        )}

        {/* Long Rates (Bottom) */}
        <div>
          <div className="text-lg font-semibold text-green-400 mb-2">Long Rates</div>
          <div className="rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            {longRates.length > 0 ? (
              longRates.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between px-3 py-2 text-sm bg-[#222] hover:bg-[#333] transition border-b border-zinc-700 last:border-b-0"
                >
                  <span className="font-bold text-green-300">{item.rate}</span>
                  <span className="text-green-200">{item.size}</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-zinc-500 text-center">No long orders</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
