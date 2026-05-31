"use client";

const LOANS = [
  { chain: "arbitrum", asset: "USDC", amount: "5,000,000", provider: "Balancer V2", profit: "+12.50", tx: "0xabc...def" },
  { chain: "base",     asset: "USDC", amount: "1,250,000", provider: "Aave V3",     profit: "+4.20",  tx: "0x123...456" },
  { chain: "ethereum", asset: "WETH", amount: "500",       provider: "Balancer V2", profit: "+0.087", tx: "0x789...abc" },
  { chain: "arbitrum", asset: "USDT", amount: "2,800,000", provider: "Aave V3",     profit: "+8.91",  tx: "0xdef...ghi" },
  { chain: "polygon",  asset: "DAI",  amount: "750,000",   provider: "Aave V3",     profit: "+2.14",  tx: "0xjkl...mno" },
];

export function RecentLoans() {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50">
      <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
        <h2 className="font-semibold">Recent flash loans</h2>
        <a href="/loans" className="text-xs text-cyan-400 hover:text-cyan-300">View all →</a>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wider text-neutral-500">
          <tr>
            <th className="text-left px-5 py-3 font-normal">Chain</th>
            <th className="text-left px-5 py-3 font-normal">Asset</th>
            <th className="text-right px-5 py-3 font-normal">Amount</th>
            <th className="text-left px-5 py-3 font-normal">Provider</th>
            <th className="text-right px-5 py-3 font-normal">Profit</th>
            <th className="text-right px-5 py-3 font-normal">Tx</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {LOANS.map((l, i) => (
            <tr key={i} className="border-t border-neutral-800/60 hover:bg-neutral-900">
              <td className="px-5 py-3 text-neutral-300">{l.chain}</td>
              <td className="px-5 py-3 text-neutral-300">{l.asset}</td>
              <td className="px-5 py-3 text-right">{l.amount}</td>
              <td className="px-5 py-3 text-neutral-400">{l.provider}</td>
              <td className="px-5 py-3 text-right text-emerald-400">{l.profit}</td>
              <td className="px-5 py-3 text-right text-neutral-500 text-xs">{l.tx}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
