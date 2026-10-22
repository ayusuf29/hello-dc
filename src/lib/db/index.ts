import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { getEnv } from "../validation/env";

declare global {
  var __dbPool: Pool | undefined;
}

function getPool(): Pool {
  if (globalThis.__dbPool) {
    return globalThis.__dbPool;
  }

  const env = getEnv();
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__dbPool = pool;
  }

  return pool;
}

export const pool = getPool();
export const db = drizzle(pool, { schema });
export { schema };
