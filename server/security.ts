import { db } from "./db";
import { loginAttempts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Security event logger
// ---------------------------------------------------------------------------

export function securityEvent(
  event: string,
  details: Record<string, unknown> = {}
) {
  logger.warn({ security: true, event, ...details }, `SECURITY: ${event}`);
}

// ---------------------------------------------------------------------------
// Account lockout — PostgreSQL-backed
//
// Persists across restarts and works across multiple server instances.
//
// Sliding-window reset: if the last failure is older than FAILURE_WINDOW_MS
// the counter is reset before incrementing, so stale attempts from days ago
// do not accumulate toward the lockout threshold.
// ---------------------------------------------------------------------------

const MAX_FAILURES       = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const FAILURE_WINDOW_MS   = 30 * 60 * 1000; // 30 minutes — sliding window

/** Returns the remaining lock duration in ms (0 if not locked / expired). */
export async function getLockoutRemainingMs(username: string): Promise<number> {
  const [row] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.username, username));

  if (!row?.lockedUntil) return 0;

  const remaining = row.lockedUntil.getTime() - Date.now();
  if (remaining <= 0) {
    // Lock expired — clean up the row entirely
    await db.delete(loginAttempts).where(eq(loginAttempts.username, username));
    return 0;
  }
  return remaining;
}

/**
 * Call after a failed login attempt.
 * Returns true if the account just got locked.
 *
 * Sliding window: if the last failure is older than FAILURE_WINDOW_MS the
 * counter resets, so sporadic old failures never accumulate indefinitely.
 */
export async function recordFailedLogin(username: string, ip: string): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.username, username));

  const now = Date.now();

  // Reset counter if last failure is outside the sliding window
  const outsideWindow =
    !existing ||
    !existing.lastFailure ||
    now - existing.lastFailure.getTime() > FAILURE_WINDOW_MS;

  const currentFailures = outsideWindow ? 0 : (existing?.failures ?? 0);
  const newFailures = currentFailures + 1;

  const justLocked = newFailures >= MAX_FAILURES;
  const lockedUntil = justLocked ? new Date(now + LOCKOUT_DURATION_MS) : null;

  await db
    .insert(loginAttempts)
    .values({
      username,
      failures:    newFailures,
      lockedUntil: lockedUntil ?? undefined,
      lastFailure: new Date(now),
    })
    .onConflictDoUpdate({
      target: loginAttempts.username,
      set: {
        failures:    newFailures,
        lockedUntil: lockedUntil ?? undefined,
        lastFailure: new Date(now),
      },
    });

  if (justLocked) {
    securityEvent("account.locked", {
      username,
      ip,
      failures: newFailures,
      lockedUntilIso: lockedUntil!.toISOString(),
    });
  } else if (newFailures >= 3) {
    securityEvent("auth.login.repeated_failures", {
      username,
      ip,
      failures: newFailures,
      remainingBeforeLock: MAX_FAILURES - newFailures,
    });
  }

  return justLocked;
}

/** Call after a successful login to reset the failure counter. */
export async function clearFailedLogins(username: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.username, username));
}
