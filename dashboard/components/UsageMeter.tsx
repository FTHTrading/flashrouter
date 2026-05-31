"use client";

export function UsageMeter() {
  const used = 4_210_000;
  const limit = 10_000_000;
  const pct = (used / limit) * 100;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm">Pro tier — notional</h2>
        <span className="text-xs text-neutral-500">monthly</span>
      </div>
      <div className="text-2xl font-mono">${(used / 1_000_000).toFixed(2)}M</div>
      <div className="text-xs text-neutral-500 mb-3">of ${(limit / 1_000_000).toFixed(0)}M limit</div>
      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-cyan-400 transition-all"
          style={{ width: `${pct}%` }}
        ></div>
      </div>
      <div className="text-xs text-neutral-500 mt-2">{pct.toFixed(1)}% used</div>
    </div>
  );
}
