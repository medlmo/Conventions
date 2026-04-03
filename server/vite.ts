import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import rateLimit from "express-rate-limit";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Simple in-memory cache for index.html based on mtime
  let cachedTemplate: string | null = null;
  let cachedMtimeMs = 0;
  async function loadTemplate(clientTemplate: string): Promise<string> {
    const stat = await fs.promises.stat(clientTemplate);
    if (!cachedTemplate || stat.mtimeMs !== cachedMtimeMs) {
      cachedTemplate = await fs.promises.readFile(clientTemplate, "utf-8");
      cachedMtimeMs = stat.mtimeMs;
    }
    return cachedTemplate;
  }

  // Rate limiter for the dev catch-all route (limits per IP)
  const transformLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Concurrency limiter for transformIndexHtml
  let activeTransforms = 0;
  const MAX_TRANSFORMS = 5;

  app.use(vite.middlewares);
  app.use("*", transformLimiter, async (req, res, next) => {
    // Whitelist-only: only allow root or /index.html for transformIndexHtml
    const pathOnly = req.path;
    const safeUrl = pathOnly === "/index.html" ? "/index.html" : "/";

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // load cached template (reload only when mtime changed)
      let template = await loadTemplate(clientTemplate);
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      // Throttle concurrent transforms
      if (activeTransforms >= MAX_TRANSFORMS) {
        return res.status(429).json({ error: 'Too many concurrent requests' });
      }
      activeTransforms++;
      try {
        // Timeout transform to avoid resource hogging
        const page = await Promise.race([
          vite.transformIndexHtml(safeUrl, template),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Transform timeout')), 3000)
          ),
        ]);
        res.status(200).set({ "Content-Type": "text/html" }).end(page as string);
      } finally {
        activeTransforms--;
      }
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
