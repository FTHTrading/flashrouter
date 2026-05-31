import type { FastifyInstance } from "fastify";

export async function usageRoutes(app: FastifyInstance) {
  app.get(
    "/usage",
    {
      schema: {
        description: "Current month's usage and projected billing",
        tags: ["billing"],
      },
    },
    async (req) => {
      const result = await app.db.query<{
        api_calls: string;
        flash_loans: string;
        total_notional_usd: string;
        platform_fees_usd: string;
      }>(
        `SELECT
            (SELECT COUNT(*) FROM api_calls
              WHERE customer_id = $1
                AND called_at >= date_trunc('month', now())) AS api_calls,
            (SELECT COUNT(*) FROM flash_loans
              WHERE customer_id = $1
                AND executed_at >= date_trunc('month', now())) AS flash_loans,
            (SELECT COALESCE(SUM(notional_usd), 0) FROM flash_loans
              WHERE customer_id = $1
                AND executed_at >= date_trunc('month', now())) AS total_notional_usd,
            (SELECT COALESCE(SUM(platform_fee_usd), 0) FROM flash_loans
              WHERE customer_id = $1
                AND executed_at >= date_trunc('month', now())) AS platform_fees_usd`,
        [req.customer!.id],
      );

      const row = result.rows[0];
      return {
        period: {
          start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
          end: new Date().toISOString(),
        },
        usage: {
          apiCalls: parseInt(row.api_calls, 10),
          flashLoans: parseInt(row.flash_loans, 10),
          totalNotionalUsd: parseFloat(row.total_notional_usd),
          platformFeesUsd: parseFloat(row.platform_fees_usd),
        },
      };
    },
  );
}
