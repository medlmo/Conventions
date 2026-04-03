import { Router } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { loginSchema } from "@shared/schema";
import { z } from "zod";

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
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      req.session.userId = user.id;

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
      console.error("Login error:", error);
      res.status(500).json({ message: "خطأ في تسجيل الدخول" });
    }
  });

  router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "خطأ في تسجيل الخروج" });
      }
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
