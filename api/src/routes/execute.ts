import type { FastifyInstance } from "fastify";

/**
 * /v1/execute — managed-gas execution mode.
 *
 * Most customers self-broadcast (the SDK signs and broadcasts client-side).
 * Enterprise customers can opt into managed execution where FlashRouter
 * relays the tx (paying gas) and bills back the actual gas + 10% relay fee.
 *
 * Stubbed for v1 — initial launch is self-broadcast only.
 */
export async function executeRoutes(app: FastifyInstance) {
  app.post(
    "/execute",
    {
      schema: {
        description: "Managed flash-loan execution (Enterprise tier only)",
        tags: ["execute"],
      },
    },
    async (_req, reply) => {
      return reply.code(501).send({
        error: "Managed execution not yet available",
        hint: "Use the SDK to self-broadcast for now. Coming Q4 2026.",
      });
    },
  );
}
