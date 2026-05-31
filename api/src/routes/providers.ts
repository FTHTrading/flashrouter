import type { FastifyInstance } from "fastify";
import { getProviderStatuses } from "../services/provider-monitor";

export async function providersRoutes(app: FastifyInstance) {
  app.get(
    "/providers",
    {
      schema: {
        description: "Live status (liquidity, fee, healthy) of every (provider × chain) pair",
        tags: ["providers"],
      },
    },
    async () => await getProviderStatuses(),
  );

  app.get(
    "/chains",
    {
      schema: {
        description: "Live status of every supported chain",
        tags: ["providers"],
      },
    },
    async () => {
      const statuses = await getProviderStatuses();
      // Group by chain, return one entry per chain summarizing health.
      const byChain = new Map<string, { chain: string; healthy: boolean; activeProviders: number }>();
      for (const s of statuses) {
        const cur = byChain.get(s.chain) ?? {
          chain: s.chain,
          healthy: true,
          activeProviders: 0,
        };
        if (s.healthy) cur.activeProviders += 1;
        cur.healthy = cur.healthy && s.healthy;
        byChain.set(s.chain, cur);
      }
      return Array.from(byChain.values());
    },
  );
}
