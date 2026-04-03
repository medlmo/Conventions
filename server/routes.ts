import type { Express } from "express";
import rateLimit from "express-rate-limit";
import { createServer, type Server } from "http";
import { getSession } from "./auth";
import { createAuthRouter } from "./routes/auth";
import { createUsersRouter } from "./routes/users";
import { createConventionsRouter } from "./routes/conventions";
import { createStatsRouter } from "./routes/stats";
import { createDocumentsRouter } from "./routes/documents";
import { createUploadsRouter, createStaticUploadsMiddleware } from "./routes/uploads";
import { createFinancialsRouter, createFinancialItemRouter } from "./routes/financials";
import { createEventsRouter, createEventItemRouter } from "./routes/events";

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", apiLimiter);
  app.use(getSession());

  app.use("/api/auth", createAuthRouter());
  app.use("/api/users", createUsersRouter());

  // Stats and documents must be mounted before the conventions CRUD router
  // to prevent /api/conventions/:id from swallowing paths like /stats or /export
  app.use("/api/conventions/stats", createStatsRouter());
  app.use("/api/conventions", createDocumentsRouter());
  app.use("/api/conventions", createConventionsRouter());

  app.use("/api/upload", createUploadsRouter());
  app.use("/uploads", ...createStaticUploadsMiddleware());

  // Nested convention sub-resources
  app.use("/api/conventions/:conventionId/financial-contributions", createFinancialsRouter());
  app.use("/api/financial-contributions", createFinancialItemRouter());

  app.use("/api/conventions/:conventionId/administrative-events", createEventsRouter());
  app.use("/api/administrative-events", createEventItemRouter());

  const httpServer = createServer(app);
  return httpServer;
}
