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
    async (req, reply) => {
      const receipt = req.headers["x-payment-receipt"];
      if (!receipt || !String(receipt).startsWith("rcpt_")) {
        const invoiceId = "inv_" + Math.random().toString(36).substring(7);
        reply.code(402)
          .header("X-Payment-Required", "true")
          .header("X-Invoice-Id", invoiceId)
          .header("X-Amount-USD", "0.25")
          .header("X-Accepted-Assets", "USDT_TRON,USDC_BASE")
          .header("X-Recipient-Address", "0x7d9a65d06dcc435a52D5880C6310Bd6E96c156DB")
          .send({
            error: "Payment Required",
            message: "This endpoint requires an autonomous x402 micropayment of 0.25 USD.",
            invoiceId,
            amount: 0.25,
            acceptedAssets: ["USDT_TRON", "USDC_BASE"],
            recipientAddress: "0x7d9a65d06dcc435a52D5880C6310Bd6E96c156DB"
          });
        return;
      }
      const body = SimRequestSchema.parse(req.body);
      const result = await simulateStrategy(body);
      return result;
    },
  );
}
