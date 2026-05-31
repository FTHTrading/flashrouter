/**
 * FlashRouter REST API
 *
 * Endpoints:
 *   POST /v1/quote       Get a signed flash-loan quote
 *   POST /v1/simulate    Dry-run a strategy without broadcasting
 *   POST /v1/execute     Broadcast a flash loan (managed gas mode)
 *   GET  /v1/loans/:id   Get a specific flash loan's status
 *   GET  /v1/loans       List your flash loans
 *   GET  /v1/providers   Live provider status
 *   GET  /v1/chains      Live chain status
 *   GET  /v1/health      Health check (no auth)
 *   GET  /v1/usage       Your current billing usage
 *
 * Auth: Bearer token (API key) in Authorization header.
 *       OR EIP-712 signed request for wallet-native users.
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { authPlugin } from "./plugins/auth";
import { meteringPlugin } from "./plugins/metering";
import { dbPlugin } from "./plugins/db";
import { quoteRoutes } from "./routes/quote";
import { simulateRoutes } from "./routes/simulate";
import { executeRoutes } from "./routes/execute";
import { loansRoutes } from "./routes/loans";
import { providersRoutes } from "./routes/providers";
import { usageRoutes } from "./routes/usage";

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? "0.0.0.0";

async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport: process.env.NODE_ENV === "development"
        ? { target: "pino-pretty" }
        : undefined,
    },
    trustProxy: true,
    bodyLimit: 1024 * 1024, // 1 MB
  });

  // Security middleware
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(",") ?? true,
    credentials: true,
  });

  // Per-tier rate limiting (overridden in authPlugin once tier is known)
  await app.register(rateLimit, {
    global: false, // enabled per-route or per-auth-tier
    max: 100,
    timeWindow: "1 minute",
  });

  // OpenAPI docs at /docs
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "FlashRouter API",
        description:
          "Unified flash-loan infrastructure — Aave V3, Balancer V2, Uniswap V3, Maker DSS-Flash across 6 EVM chains.",
        version: "1.0.0",
        contact: {
          name: "FlashRouter Support",
          email: "support@flashrouter.io",
          url: "https://flashrouter.io/docs",
        },
        license: { name: "MIT" },
      },
      servers: [
        { url: "https://api.flashrouter.io", description: "Production" },
        { url: "https://api-staging.flashrouter.io", description: "Staging" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "API key" },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  // Infrastructure plugins
  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(meteringPlugin);

  // Routes
  await app.register(quoteRoutes, { prefix: "/v1" });
  await app.register(simulateRoutes, { prefix: "/v1" });
  await app.register(executeRoutes, { prefix: "/v1" });
  await app.register(loansRoutes, { prefix: "/v1" });
  await app.register(providersRoutes, { prefix: "/v1" });
  await app.register(usageRoutes, { prefix: "/v1" });

  // Public health check
  app.get("/v1/health", async () => ({
    status: "ok",
    version: process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
  }));

  return app;
}

if (require.main === module) {
  buildServer()
    .then((app) => app.listen({ port: PORT, host: HOST }))
    .then((addr) => console.log(`FlashRouter API listening on ${addr}`))
    .catch((err) => {
      console.error("Fatal startup error:", err);
      process.exit(1);
    });
}

export { buildServer };
