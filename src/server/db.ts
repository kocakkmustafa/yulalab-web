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
/**
 * Pools keyed by connection string, not one bare singleton.
 *
 * A single cached pool served whichever DATABASE_URL happened to be set when
 * it was first created, so two test files driving routes against different
 * schemas raced: 2, 4, 7 and 9 failures across four consecutive full runs
 * while each file passed alone. Serialising the files would have hidden that
 * rather than removed it — the same call the schema isolation faced earlier.
 *
 * It is also more correct in production: a configuration change should never
 * be served by a pool built for the previous one. In practice exactly one
 * entry exists, because the URL never changes there.
 */
const pools = new Map<string, Pool>();

function isLocalHost(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    // URL.hostname returns an IPv6 literal WITH its brackets, so a bare
    // "::1" comparison never matched and that branch was dead.
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
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
  const existing = pools.get(url);
  if (existing) return existing;

  {
    const pool = new Pool({
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
    pools.set(url, pool);
    return pool;
  }
}

/** Test-only: drop the cached pool so a suite can point at another database. */
/**
 * Test-only: drop the cached pool for the CURRENT DATABASE_URL so a suite
 * can point at another database.
 *
 * Scoped to one URL on purpose. Closing every pool would tear down a pool
 * another test file is mid-query on — the cross-file destruction this map
 * was introduced to prevent, reintroduced by the cleanup.
 */
export async function resetPool(): Promise<void> {
  const url = databaseUrl();
  if (!url) return;
  const pool = pools.get(url);
  if (!pool) return;
  pools.delete(url);
  await pool.end();
}

/** Test-only export of the TLS host decision. */
export const isLocalHostForTest = isLocalHost;
