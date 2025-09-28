import { APRChart } from "../apr-charts";
import { OrderBooks } from "../orderbooks";
import { Positions } from "../positions";
import { SwapCard } from "../swaps";
import { SettlementCountdown } from "@/components/SettlementCountdown";
import { MarketProvider } from "@/contexts/MarketContext";

export default async function MarketInfo({ params }: { params: Promise<{ id: string[] }> }) {
  const { id: idArray } = await params;
  const id = Array.isArray(idArray) ? idArray[0] : idArray;
  
  // Map market IDs to their info
  const marketInfoMap: { [key: string]: { maturityDate: string; maturesIn: string } } = {
    "BTC-USDT": { maturityDate: "2025-10-15", maturesIn: "18 days" },
    "ETH-USDT": { maturityDate: "2025-10-12", maturesIn: "18 days" },
    "SOL-USDT": { maturityDate: "2025-10-19", maturesIn: "22 days" },
    "DOT-USDT": { maturityDate: "2025-10-08", maturesIn: "15 days" },
  };
  
  const marketInfo = marketInfoMap[id] || { maturityDate: "2025-10-15", maturesIn: "18 days" };
  
  // Format market ID for display (BTC-USDT -> BTC/USDT)
  const formatMarketDisplay = (marketId: string) => {
    return marketId.replace('-', '/');
  };
  
  return (
    <MarketProvider marketId={id}>
      <div className="flex flex-col w-full h-full px-4 gap-6">
        {/* Market Info Section */}
        <div className="bg-[#181818] rounded-2xl p-6 mb-4 border border-[rgba(189,238,99,0.18)] shadow">
          <div className="flex justify-between items-center text-white">
            <span className="font-bold text-lg">{formatMarketDisplay(id)} Funding Rates</span>
            <span className="text-zinc-400">
              Matures in {marketInfo.maturesIn}{" "}
              <span className="text-zinc-500">({marketInfo.maturityDate})</span>
            </span>
          </div>
        </div>
        <div className="flex flex-1 gap-6">
          {/* Left side: APR Chart */}
          <div className="w-full lg:w-2/3 flex flex-col">
            <APRChart />
          </div>
          {/* Right side: Settlement, Orderbook and Swap */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6">
            <SettlementCountdown />
            <OrderBooks />
            <SwapCard />
          </div>
        </div>
        {/* Bottom: Positions */}
        <div className="w-full">
          <Positions />
        </div>
      </div>
    </MarketProvider>
  );
}
