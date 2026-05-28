import { Router } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import { audit, logger } from "../logger";
import { clearFailedLogins, getLockoutRemainingMs, recordFailedLogin, securityEvent } from "../security";
import { SESSION_COOKIE_NAME } from "../auth";

// Tighter limit: 5 attempts per 15-minute window per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res) => {
    securityEvent("auth.login.rate_limited", { ip: req.ip, username: req.body?.username });
    res.status(429).json({ message: "عدد كبير من المحاولات. يرجى المحاولة بعد 15 دقيقة." });
  },
});

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/login", loginLimiter, async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);

      // Check account lockout before hitting the DB
      const remainingMs = await getLockoutRemainingMs(username);
      if (remainingMs > 0) {
        const remainingMin = Math.ceil(remainingMs / 60_000);
        securityEvent("auth.login.blocked_lockout", { username, ip: req.ip, remainingMin });
        return res.status(423).json({
          message: `الحساب مقفل مؤقتاً بسبب كثرة المحاولات الفاشلة. يرجى المحاولة بعد ${remainingMin} دقيقة.`,
        });
      }

      const user = await storage.validateUser(username, password);

      if (!user) {
        const justLocked = await recordFailedLogin(username, req.ip ?? "unknown");
        audit("auth.login.failed", undefined, { username, ip: req.ip, justLocked });
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      // Regenerate session ID to prevent session fixation attacks.
      // The old session ID is invalidated and a fresh one is issued.
      // clearFailedLogins is called only INSIDE the callback so the counter
      // is reset exclusively when a valid session has actually been created.
      req.session.regenerate((err) => {
        if (err) {
          logger.error({ err }, "Session regeneration failed");
          return res.status(500).json({ message: "خطأ في تسجيل الدخول" });
        }

        req.session.userId = user.id;

        // Session is established — now safe to clear the failure counter.
        // Non-fatal if it fails: the stale record will expire on its own.
        clearFailedLogins(username).catch((clearErr) => {
          logger.error({ err: clearErr }, "Failed to clear login failures");
        });

        audit("auth.login.success", user.id, { username: user.username, role: user.role, ip: req.ip });

        res.json({
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          },
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      logger.error({ err: error }, "Login error");
      res.status(500).json({ message: "خطأ في تسجيل الدخول" });
    }
  });

  router.post("/logout", requireAuth, (req, res) => {
    const userId = req.session.userId;
    req.session.destroy((err) => {
      if (err) {
        logger.error({ err }, "Session destroy error");
        return res.status(500).json({ message: "خطأ في تسجيل الخروج" });
      }
      // Explicitly clear the cookie so it is removed from the browser
      // immediately — not just left to expire. Uses the same name constant
      // as the session config to guarantee they always match.
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      audit("auth.logout", userId, { ip: req.ip });
      res.json({ message: "تم تسجيل الخروج بنجاح" });
    });
  });

  router.get("/user", requireAuth, (req, res) => {
    res.json({
      user: {
        id: req.user!.id,
        username: req.user!.username,
        role: req.user!.role,
        firstName: req.user!.firstName,
        lastName: req.user!.lastName,
        email: req.user!.email,
      },
    });
  });

  return router;
}
