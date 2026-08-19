import { describe, expect, it } from "vitest";
import { isLocalHostForTest } from "@/server/db";

/**
 * TLS on/off was decided by running a regex over the whole connection
 * string. A production URL whose password or database name contained the
 * substring "localhost" therefore disabled TLS and sent that password in
 * plaintext — the worst possible case for the check to get wrong.
 */
describe("TLS decision", () => {
  it("treats a real local database as local", () => {
    expect(isLocalHostForTest("postgres://localhost:5432/db")).toBe(true);
    expect(isLocalHostForTest("postgres://127.0.0.1:5432/db")).toBe(true);
  });

  it("does not disable TLS because a password or db name contains 'localhost'", () => {
    expect(isLocalHostForTest("postgres://user:localhost@db.neon.tech:5432/prod")).toBe(false);
    expect(isLocalHostForTest("postgres://user:pw@db.neon.tech:5432/localhost")).toBe(false);
    expect(isLocalHostForTest("postgres://user:pw@evil-localhost.example:5432/db")).toBe(false);
  });

  it("keeps TLS on for an unparseable string", () => {
    expect(isLocalHostForTest("not a url at all")).toBe(false);
  });
});
