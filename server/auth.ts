import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { logger } from "./logger";
import { securityEvent } from "./security";

// Extend Express Request type to include user
declare module "express-session" {
  interface SessionData {
    userId?: string;
    user?: User;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const DEFAULT_SECRET = "default-secret-key-change-in-production";

export function getSession() {
  const secret = process.env.SESSION_SECRET || DEFAULT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  // Fail loudly if running in production with the default secret
  if (isProduction && secret === DEFAULT_SECRET) {
    securityEvent("config.insecure_session_secret", {
      message: "SESSION_SECRET is not set — using insecure default in production",
    });
    throw new Error("SESSION_SECRET environment variable must be set in production");
  }

  if (!isProduction && secret === DEFAULT_SECRET) {
    logger.warn("SESSION_SECRET is not set — using insecure default (acceptable in dev only)");
  }

  const sessionTtl = 24 * 60 * 60 * 1000; // 1 day
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,   // HTTPS only in production
      sameSite: "strict",
      maxAge: sessionTtl,
    },
  });
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "غير مصرح لك بالوصول" });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isActive) { // #3 fix: real boolean
      req.session.destroy(() => {});
      return res.status(401).json({ message: "غير مصرح لك بالوصول" });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error({ err: error }, "Auth middleware error");
    res.status(500).json({ message: "خطأ في التحقق من الهوية" });
  }
};

export const requireRole = (allowedRoles: string[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "غير مصرح لك بالوصول" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "ليس لديك صلاحية للوصول لهذه الميزة" });
    }

    next();
  };
};