"use client";

const STATS = [
  { label: "Notional this month", value: "$4.21M", delta: "+12.4%" },
  { label: "Flash loans executed", value: "1,842", delta: "+8.2%" },
  { label: "Average loan size",     value: "$2,284", delta: "+3.9%" },
  { label: "Platform fees paid",    value: "$842",   delta: "" },
];

export function OverviewStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5"
        >
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            {s.label}
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono">{s.value}</div>
          {s.delta && (
            <div className="mt-1 text-xs text-emerald-400">{s.delta} vs. last month</div>
          )}
        </div>
      ))}
    </div>
  );
}
