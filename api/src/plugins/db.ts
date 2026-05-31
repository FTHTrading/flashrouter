import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { Pool, type QueryResult, type QueryResultRow } from "pg";

declare module "fastify" {
  interface FastifyInstance {
    db: {
      query<T extends QueryResultRow = any>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
      end(): Promise<void>;
    };
  }
}

export const dbPlugin = fp(async (app: FastifyInstance) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_SIZE ?? 20),
    idleTimeoutMillis: 30_000,
  });

  // Quick connectivity check
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    app.log.error({ err }, "Postgres connection failed");
    throw err;
  }

  app.decorate("db", {
    query: <T extends QueryResultRow = any>(text: string, values?: unknown[]) =>
      pool.query<T>(text, values),
    end: () => pool.end(),
  });

  app.addHook("onClose", async () => {
    await pool.end();
  });
});
