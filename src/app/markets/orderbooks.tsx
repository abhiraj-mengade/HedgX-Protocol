export function OrderBooks() {
  // Mock data for long and short rates
  const longRates = [
    { rate: "8.1%", size: "0.5123" },
    { rate: "8.0%", size: "1.2345" },
    { rate: "7.9%", size: "0.2652" },
    { rate: "7.8%", size: "5.2694" },
    { rate: "7.7%", size: "0.9876" },
    { rate: "7.6%", size: "2.3456" },
    { rate: "7.5%", size: "0.1234" },
    { rate: "7.4%", size: "3.4567" },
    { rate: "7.3%", size: "0.8765" },
    { rate: "7.2%", size: "1.6789" },
    { rate: "7.1%", size: "1.6789" },
  ];
  const shortRates = [
    { rate: "7.0%", size: "0.4321" },
    { rate: "6.9%", size: "0.4321" },
    { rate: "6.8%", size: "2.3456" },
    { rate: "6.7%", size: "1.2345" },
    { rate: "6.6%", size: "0.8765" },
    { rate: "6.5%", size: "3.4567" },
    { rate: "6.4%", size: "0.1234" },
    { rate: "6.3%", size: "2.7890" },
    { rate: "6.2%", size: "1.6789" },
    { rate: "6.1%", size: "0.9876" },
    { rate: "6.0%", size: "0.6543" },
  ];

  return (
    <div className="bg-[#181818] p-6 rounded-2xl shadow-xl border border-[rgba(189,238,99,0.18)]">
      <h2
        className="text-xl font-bold text-center text-[hsl(var(--foreground))] mb-4"
      >
        Orderbook
      </h2>
      <div className="grid grid-cols-2 gap-6">
        {/* Long Rates */}
        <div>
          <div className="text-lg font-semibold text-green-400 mb-2">Long Rates</div>
          <div className="rounded-lg overflow-hidden">
            {longRates.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between px-3 py-2 text-sm bg-[#222]"
              >
                <span className="font-bold text-green-300">{item.rate}</span>
                <span className="text-green-200">{item.size} BTC</span>
              </div>
            ))}
          </div>
        </div>
        {/* Short Rates */}
        <div>
          <div className="text-lg font-semibold text-red-400 mb-2">Short Rates</div>
          <div className="rounded-lg overflow-hidden">
            {shortRates.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between px-3 py-2 text-sm bg-[#222]"
              >
                <span className="font-bold text-red-300">{item.rate}</span>
                <span className="text-red-200">{item.size} BTC</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
