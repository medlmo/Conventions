import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";

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

export function getSession() {
  const sessionTtl =  24 * 60 * 60 * 1000; // 1 day
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "default-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
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
    if (!user || user.isActive !== "true") {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "غير مصرح لك بالوصول" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
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