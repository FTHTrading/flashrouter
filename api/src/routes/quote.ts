import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { signQuote } from "../services/quoter";

const QuoteRequestSchema = z.object({
  chain: z.enum(["ethereum", "base", "arbitrum", "optimism", "bnb", "polygon"]),
  asset: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().regex(/^\d+$/),
  provider: z.number().int().min(0).max(4).optional(),
});

export async function quoteRoutes(app: FastifyInstance) {
  app.post(
    "/quote",
    {
      schema: {
        description: "Get a signed flash-loan quote",
        tags: ["quote"],
        body: {
          type: "object",
          required: ["chain", "asset", "amount"],
          properties: {
            chain: { type: "string", enum: ["ethereum", "base", "arbitrum", "optimism", "bnb", "polygon"] },
            asset: { type: "string", description: "Verified asset contract address" },
            amount: { type: "string", description: "Amount in asset's smallest unit" },
            provider: { type: "number", description: "0=AUTO, 1=Aave V3, 2=Balancer V2, 3=Uniswap V3, 4=Maker" },
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
      const body = QuoteRequestSchema.parse(req.body);
      const quote = await signQuote(body);
      return quote;
    },
  );
}
