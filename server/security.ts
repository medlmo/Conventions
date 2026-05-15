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
// Account lockout (in-memory, per username)
// After MAX_FAILURES consecutive failed logins the account is locked for
// LOCKOUT_DURATION_MS.  The counter resets on a successful login.
// ---------------------------------------------------------------------------

const MAX_FAILURES = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface LockoutEntry {
  failures: number;
  lockedUntil: number | null; // epoch ms, null = not locked
  lastFailure: number;        // epoch ms
}

const lockoutMap = new Map<string, LockoutEntry>();

function getEntry(username: string): LockoutEntry {
  return lockoutMap.get(username) ?? { failures: 0, lockedUntil: null, lastFailure: 0 };
}

/** Returns the remaining lock duration in ms (0 if not locked). */
export function getLockoutRemainingMs(username: string): number {
  const entry = getEntry(username);
  if (!entry.lockedUntil) return 0;
  const remaining = entry.lockedUntil - Date.now();
  if (remaining <= 0) {
    lockoutMap.delete(username); // auto-expire
    return 0;
  }
  return remaining;
}

/** Call after a failed login attempt. Returns true if the account just got locked. */
export function recordFailedLogin(username: string, ip: string): boolean {
  const entry = getEntry(username);
  entry.failures += 1;
  entry.lastFailure = Date.now();

  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    lockoutMap.set(username, entry);
    securityEvent("account.locked", {
      username,
      ip,
      failures: entry.failures,
      lockedUntilIso: new Date(entry.lockedUntil).toISOString(),
    });
    return true;
  }

  lockoutMap.set(username, entry);

  // Warn when getting close to lockout
  if (entry.failures >= 3) {
    securityEvent("auth.login.repeated_failures", {
      username,
      ip,
      failures: entry.failures,
      remainingBeforeLock: MAX_FAILURES - entry.failures,
    });
  }

  return false;
}

/** Call after a successful login to reset the counter. */
export function clearFailedLogins(username: string): void {
  lockoutMap.delete(username);
}
