import type { FastifyInstance } from "fastify";

export async function loansRoutes(app: FastifyInstance) {
  app.get(
    "/loans",
    {
      schema: {
        description: "List your recent flash loans",
        tags: ["loans"],
        querystring: {
          type: "object",
          properties: {
            limit: { type: "number", default: 50, maximum: 500 },
            cursor: { type: "string" },
            chain: { type: "string" },
          },
        },
      },
    },
    async (req) => {
      const { limit = 50, cursor, chain } = req.query as { limit?: number; cursor?: string; chain?: string };

      const result = await app.db.query(
        `SELECT id, chain, asset, amount, provider, profit, tx_hash, executed_at
           FROM flash_loans
          WHERE customer_id = $1
            ${chain ? "AND chain = $4" : ""}
            ${cursor ? "AND executed_at < $3" : ""}
          ORDER BY executed_at DESC
          LIMIT $2`,
        chain
          ? [req.customer!.id, limit, cursor ?? null, chain]
          : [req.customer!.id, limit, cursor ?? null],
      );

      return {
        loans: result.rows,
        nextCursor: result.rows.length === limit
          ? result.rows[result.rows.length - 1].executed_at.toISOString()
          : null,
      };
    },
  );

  app.get(
    "/loans/:id",
    {
      schema: {
        description: "Get a specific flash loan",
        tags: ["loans"],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const result = await app.db.query(
        `SELECT * FROM flash_loans WHERE id = $1 AND customer_id = $2`,
        [id, req.customer!.id],
      );
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: "Flash loan not found" });
      }
      return result.rows[0];
    },
  );
}
