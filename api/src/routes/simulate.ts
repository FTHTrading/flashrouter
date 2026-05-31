import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { simulateStrategy } from "../services/simulator";

const SimRequestSchema = z.object({
  chain: z.enum(["ethereum", "base", "arbitrum", "optimism", "bnb", "polygon"]),
  asset: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().regex(/^\d+$/),
  strategy: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  strategyData: z.string().regex(/^0x[a-fA-F0-9]*$/).default("0x"),
  provider: z.number().int().min(0).max(4),
});

export async function simulateRoutes(app: FastifyInstance) {
  app.post(
    "/simulate",
    {
      schema: {
        description: "Dry-run a flash-loan strategy against a Tenderly fork",
        tags: ["simulate"],
        body: {
          type: "object",
          required: ["chain", "asset", "amount", "strategy", "provider"],
          properties: {
            chain: { type: "string" },
            asset: { type: "string" },
            amount: { type: "string" },
            strategy: { type: "string" },
            strategyData: { type: "string" },
            provider: { type: "number" },
          },
        },
      },
    },
    async (req) => {
      const body = SimRequestSchema.parse(req.body);
      const result = await simulateStrategy(body);
      return result;
    },
  );
}
