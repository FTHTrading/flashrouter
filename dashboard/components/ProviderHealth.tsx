"use client";

const PROVIDERS = [
  { name: "Aave V3",     status: "operational", chains: 6 },
  { name: "Balancer V2", status: "operational", chains: 5 },
  { name: "Uniswap V3",  status: "operational", chains: 6 },
  { name: "Maker DSS",   status: "operational", chains: 1 },
];

export function ProviderHealth() {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50">
      <div className="px-5 py-4 border-b border-neutral-800">
        <h2 className="font-semibold">Provider health</h2>
      </div>
      <ul className="divide-y divide-neutral-800/60">
        {PROVIDERS.map((p) => (
          <li key={p.name} className="px-5 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm">{p.name}</div>
              <div className="text-xs text-neutral-500">{p.chains} chains</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span className="text-xs text-emerald-400">{p.status}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
