import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { logger, httpLogger } from "./logger";

const app = express();

// Restrictive proxy trust configuration for rate limiting & IPs
// 'loopback' trusts only localhost proxies; override via TRUST_PROXY if needed.
const trustProxySetting = process.env.TRUST_PROXY ?? "loopback";
app.set("trust proxy", trustProxySetting);

  // Security middleware - Helmet
  app.use(helmet({
    // Désactiver l'en-tête X-Powered-By
    hidePoweredBy: true,
    // Configuration CSP pour la sécurité
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://replit.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    // Désactiver le sniffing de type MIME
    noSniff: true,
    // Forcer HTTPS en production
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    // Empêcher le clicjacking
    frameguard: {
      action: 'deny'
    },
    // Additional hardening headers (won't break typical same-origin apps)
    dnsPrefetchControl: { allow: false },
    crossOriginResourcePolicy: { policy: "same-site" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    // Désactiver XSS Protection (remplacé par CSP)
    xssFilter: false,
    // Désactiver IE XSS Protection
    ieNoOpen: true,
    // Référer Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

// Désactiver explicitement l'en-tête X-Powered-By
app.disable('x-powered-by');

// A client sending a 100 MB JSON payload would otherwise crash the process.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: false }));

app.use(httpLogger);

(async () => {
  // Seed database on startup
  try {
    await seedDatabase();
  } catch (error) {
    logger.info("Database seeding completed or skipped");
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    logger.error({ err, method: req.method, url: req.url, status }, "Unhandled error");
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
