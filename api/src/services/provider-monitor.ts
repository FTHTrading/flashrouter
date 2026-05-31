/**
 * Provider monitor — polls every (provider × chain) pair every 5s and
 * caches health, liquidity, and fee data in Redis. The /v1/providers
 * endpoint reads from this cache.
 */
export async function getProviderStatuses() {
  // Stubbed sample data.
  return [
    { provider: 1, chain: "ethereum", healthy: true, liquidityUsd: "1850000000", feeBps: 5, lastChecked: new Date().toISOString() },
    { provider: 2, chain: "ethereum", healthy: true, liquidityUsd: "920000000", feeBps: 0, lastChecked: new Date().toISOString() },
    { provider: 3, chain: "ethereum", healthy: true, liquidityUsd: "4200000000", feeBps: 5, lastChecked: new Date().toISOString() },
    { provider: 4, chain: "ethereum", healthy: true, liquidityUsd: "500000000", feeBps: 0, lastChecked: new Date().toISOString() },
    { provider: 1, chain: "arbitrum", healthy: true, liquidityUsd: "850000000", feeBps: 5, lastChecked: new Date().toISOString() },
    { provider: 2, chain: "arbitrum", healthy: true, liquidityUsd: "240000000", feeBps: 0, lastChecked: new Date().toISOString() },
    { provider: 1, chain: "base", healthy: true, liquidityUsd: "420000000", feeBps: 5, lastChecked: new Date().toISOString() },
    { provider: 2, chain: "base", healthy: true, liquidityUsd: "180000000", feeBps: 0, lastChecked: new Date().toISOString() },
  ];
}
