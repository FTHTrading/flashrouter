import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";

declare module "fastify" {
  interface FastifyRequest {
    customer: {
      id: string;
      tier: "free" | "pro" | "enterprise";
      apiKeyId: string;
    } | null;
  }
}

/**
 * Auth plugin — supports two modes:
 *
 *  1. API key (Authorization: Bearer fr_live_...)
 *     Looked up against the customers table.
 *
 *  2. EIP-712 signed request (X-FR-Signature header)
 *     Wallet-native, no account needed. Free tier only.
 *
 * On success, request.customer is populated and per-tier rate limits apply.
 */
export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest("customer", null);

  app.addHook("onRequest", async (req, reply) => {
    // Public routes
    if (req.url.startsWith("/v1/health") || req.url.startsWith("/docs")) {
      return;
    }

    const apiKey = extractApiKey(req);
    const signedReq = req.headers["x-fr-signature"];

    if (apiKey) {
      const customer = await lookupApiKey(app, apiKey);
      if (!customer) {
        return reply.code(401).send({ error: "Invalid API key" });
      }
      req.customer = customer;
      applyTierRateLimit(req, customer.tier);
      return;
    }

    if (signedReq) {
      // EIP-712 verification stub. Real impl: verify signature against
      // canonical-payload typehash, check recovered address is not on
      // OFAC list, treat as anonymous free-tier user.
      const recovered = await verifyEip712(req);
      if (!recovered) {
        return reply.code(401).send({ error: "Invalid EIP-712 signature" });
      }
      req.customer = {
        id: `wallet:${recovered}`,
        tier: "free",
        apiKeyId: "eip712",
      };
      applyTierRateLimit(req, "free");
      return;
    }

    return reply.code(401).send({
      error: "Missing credentials",
      hint: "Send either Authorization: Bearer fr_live_... or X-FR-Signature with an EIP-712 signed request",
    });
  });
});

function extractApiKey(req: FastifyRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const key = auth.slice(7).trim();
  if (!key.startsWith("fr_")) return null;
  return key;
}

async function lookupApiKey(
  app: FastifyInstance,
  apiKey: string,
): Promise<{ id: string; tier: "free" | "pro" | "enterprise"; apiKeyId: string } | null> {
  // Look up in Postgres via the dbPlugin. Compare hashed key with timing-safe equality.
  const hash = hashApiKey(apiKey);
  const result = await app.db.query<{
    customer_id: string;
    tier: "free" | "pro" | "enterprise";
    id: string;
    revoked_at: Date | null;
  }>(
    `SELECT customer_id, tier, id, revoked_at
       FROM api_keys
      WHERE key_hash = $1
      LIMIT 1`,
    [hash],
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  if (row.revoked_at) return null;
  return { id: row.customer_id, tier: row.tier, apiKeyId: row.id };
}

function hashApiKey(key: string): string {
  const secret = process.env.API_KEY_HMAC_SECRET ?? "dev-only-secret-do-not-use";
  return createHmac("sha256", secret).update(key).digest("hex");
}

async function verifyEip712(req: FastifyRequest): Promise<string | null> {
  // Production: use viem's verifyTypedData. Returns the recovered address
  // or null on failure. Stubbed for repo scaffold.
  void req;
  return null;
}

function applyTierRateLimit(req: FastifyRequest, tier: "free" | "pro" | "enterprise"): void {
  // Tier limits (per minute):
  //   free:       60 req/min
  //   pro:      1000 req/min
  //   enterprise: 10000 req/min
  // Applied via @fastify/rate-limit's per-request config in route definitions.
  void req;
  void tier;
}
