import { Router } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import { audit, logger } from "../logger";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/login", loginLimiter, async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.validateUser(username, password);

      if (!user) {
        audit("auth.login.failed", undefined, { username, ip: req.ip });
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      req.session.userId = user.id;
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      logger.error({ err: error }, "Login error");
      res.status(500).json({ message: "خطأ في تسجيل الدخول" });
    }
  });

  router.post("/logout", (req, res) => {
    const userId = req.session.userId;
    req.session.destroy((err) => {
      if (err) {
        logger.error({ err }, "Session destroy error");
        return res.status(500).json({ message: "خطأ في تسجيل الخروج" });
      }
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
