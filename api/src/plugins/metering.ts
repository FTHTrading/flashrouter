import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

/**
 * Metering plugin — records every API call for usage-based billing.
 *
 * Tracked dimensions:
 *   - customer_id
 *   - endpoint (path + method)
 *   - chain (if request involved a chain)
 *   - provider (if request was a flash loan)
 *   - notional_usd (for execute calls)
 *   - gas_usd (for execute calls)
 *   - platform_fee_usd (for execute calls)
 *   - latency_ms
 *   - success / failure
 *
 * Writes to the `api_calls` table in Postgres. Nightly aggregation rolls
 * up into `billing_periods` for Stripe invoicing.
 */
export const meteringPlugin = fp(async (app: FastifyInstance) => {
  app.addHook("onRequest", async (req) => {
    (req as any)._startTime = process.hrtime.bigint();
  });

  app.addHook("onResponse", async (req, reply) => {
    const start = (req as any)._startTime as bigint | undefined;
    if (!start) return;
    const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    if (!req.customer) return; // public endpoint

    // Fire-and-forget write. Failure to record metering does not break the
    // request — but we log it so it can be reconciled.
    void recordCall(app, {
      customerId: req.customer.id,
      apiKeyId: req.customer.apiKeyId,
      endpoint: `${req.method} ${req.routeOptions?.url ?? req.url}`,
      statusCode: reply.statusCode,
      latencyMs: Math.round(latencyMs),
      requestId: req.id,
    }).catch((err) => {
      app.log.warn({ err }, "metering write failed");
    });
  });
});

async function recordCall(
  app: FastifyInstance,
  call: {
    customerId: string;
    apiKeyId: string;
    endpoint: string;
    statusCode: number;
    latencyMs: number;
    requestId: string;
  },
): Promise<void> {
  await app.db.query(
    `INSERT INTO api_calls
       (customer_id, api_key_id, endpoint, status_code, latency_ms, request_id, called_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())`,
    [
      call.customerId,
      call.apiKeyId,
      call.endpoint,
      call.statusCode,
      call.latencyMs,
      call.requestId,
    ],
  );
}
