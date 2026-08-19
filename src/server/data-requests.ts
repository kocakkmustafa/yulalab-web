import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";

/**
 * Access, correction and deletion requests.
 *
 * The whole design turns on one point: acting on an unverified "delete my
 * data" is itself a way to delete somebody else's. A submission may only
 * create a `pending` row; the token that proves ownership of the address is
 * a capability, so it is hashed at rest, time-limited, and spent on use.
 */

export type DataRequestType = "access" | "delete" | "correct";

export type DataRequestInput = {
  email: string;
  requestType: DataRequestType;
};

/** How long a verification link stays usable. */
export const VERIFICATION_WINDOW_HOURS = 24;

/**
 * sha256 hex. Not a password hash — the token is 32 random bytes, so there
 * is no dictionary to stretch against; the point is only that a database
 * read cannot be turned into the ability to verify someone else's request.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return randomBytes(32).toString("hex");
}

type Queryable = Pick<PoolClient, "query">;
export type Connectable = { connect: () => Promise<PoolClient> };

export type CreateResult = {
  /** Returned once, to be mailed. Never stored, never logged. */
  token: string;
};

export async function createDataRequest(
  pool: Connectable,
  input: DataRequestInput,
  { now }: { now: Date },
): Promise<CreateResult> {
  const token = newToken();
  const expiresAt = new Date(now.getTime() + VERIFICATION_WINDOW_HOURS * 60 * 60 * 1000);

  const db = await pool.connect();
  let poisoned = false;
  try {
    await db.query("BEGIN");
    const inserted = await db.query(
      `INSERT INTO data_requests (email, request_type, verification_state, verification_token_hash, verification_expires_at, created_at)
       VALUES ($1,$2,'pending',$3,$4,$5)
       RETURNING id`,
      [input.email.trim(), input.requestType, hashToken(token), expiresAt, now],
    );

    // The payload carries the request id, NOT the token. An outbox row with
    // the secret in it would be a second copy under a different retention
    // with nobody watching — the same reasoning that keeps the lead message
    // body out of the queue.
    await db.query(
      `INSERT INTO event_outbox (event_type, aggregate_id, payload_json, created_at)
       VALUES ('data_request_verification', $1, $2, $3)`,
      [
        inserted.rows[0].id,
        JSON.stringify({ requestType: input.requestType }),
        now,
      ],
    );
    await db.query("COMMIT");
    return { token };
  } catch (error) {
    let rollbackFailed = false;
    await db.query("ROLLBACK").catch(() => {
      rollbackFailed = true;
    });
    poisoned = rollbackFailed;
    throw error;
  } finally {
    db.release(poisoned ? true : undefined);
  }
}

export type VerifyResult = { verified: boolean };

/**
 * Verifies a token.
 *
 * Returns the SAME shape for an unknown token, a malformed one and an
 * expired one. Distinguishing them would turn this into an oracle for which
 * addresses have requests outstanding — which is precisely the information a
 * data-request endpoint must not hand out.
 */
export async function verifyDataRequest(
  db: Queryable,
  token: string,
  { now }: { now: Date },
): Promise<VerifyResult> {
  if (!/^[0-9a-f]{64}$/.test(token)) return { verified: false };

  const hash = hashToken(token);
  const found = await db.query(
    `SELECT id, verification_token_hash, verification_expires_at
     FROM data_requests
     WHERE verification_state = 'pending' AND verification_token_hash = $1`,
    [hash],
  );
  if (!found.rowCount || !found.rows[0]) return { verified: false };

  const row = found.rows[0];
  // Constant-time, even though the lookup above already matched: the
  // comparison is cheap and it keeps the property true if the query is ever
  // widened.
  const a = Buffer.from(String(row.verification_token_hash));
  const b = Buffer.from(hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { verified: false };

  if (new Date(row.verification_expires_at).getTime() <= now.getTime()) {
    return { verified: false };
  }

  // Token cleared in the same statement that marks it verified, so the link
  // cannot be replayed and the schema's "spent token is cleared" rule holds.
  await db.query(
    `UPDATE data_requests
     SET verification_state = 'verified', verification_token_hash = NULL
     WHERE id = $1 AND verification_state = 'pending'`,
    [row.id],
  );
  return { verified: true };
}

/**
 * Marks pending requests whose window has closed as expired and clears their
 * tokens. Returns the count, so a scheduled run is observable rather than
 * assumed — the failure /api/purge exists to prevent.
 */
export async function purgeExpiredVerifications(db: Queryable, now: Date): Promise<number> {
  const result = await db.query(
    `UPDATE data_requests
     SET verification_state = 'expired', verification_token_hash = NULL
     WHERE verification_state = 'pending' AND verification_expires_at <= $1`,
    [now],
  );
  return result.rowCount ?? 0;
}
