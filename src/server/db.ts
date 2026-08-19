import { Pool } from "pg";

/**
 * Attribution/lead database access.
 *
 * This is NOT a product database. It holds pseudonymous funnel rows and
 * (from Y-P1-002) leads and consents; it is never joined against LifeOS,
 * Burun Farkı or Braavolabs data.
 *
 * Serverless note: `max: 1`. Each Vercel lambda instance keeps at most one
 * connection, because dozens of warm instances each holding a 10-connection
 * pool is how a small Postgres runs out of connections under mild traffic.
 * Throughput comes from instance count, not from per-instance pool size.
 */
let pool: Pool | null = null;

function isLocalHost(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    // Unparseable connection string: assume remote and keep TLS on. Failing
    // towards encryption is the safe direction.
    return false;
  }
}

export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || undefined;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(databaseUrl());
}

export function getPool(): Pool {
  const url = databaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      // Managed Postgres (Neon/Supabase/RDS) terminates plaintext; local
      // development does not speak TLS at all. Decided by the URL rather
      // than by NODE_ENV so a production-pointing local run still uses TLS.
      //
      // Matched against the parsed HOSTNAME, not the whole string: testing
      // the connection string meant a production URL whose password or
      // database name happened to contain "localhost" silently dropped TLS
      // and sent those very credentials in the clear.
      ssl: isLocalHost(url) ? undefined : { rejectUnauthorized: true },
    });
  }
  return pool;
}

/** Test-only: drop the cached pool so a suite can point at another database. */
export async function resetPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Test-only export of the TLS host decision. */
export const isLocalHostForTest = isLocalHost;
