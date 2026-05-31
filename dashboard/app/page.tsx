import { OverviewStats } from "@/components/OverviewStats";
import { RecentLoans } from "@/components/RecentLoans";
import { ProviderHealth } from "@/components/ProviderHealth";
import { UsageMeter } from "@/components/UsageMeter";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-neutral-400">Your FlashRouter activity at a glance.</p>
      </header>

      <OverviewStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentLoans />
        </div>
        <div className="space-y-6">
          <UsageMeter />
          <ProviderHealth />
        </div>
      </div>
    </div>
  );
}
