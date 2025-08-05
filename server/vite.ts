import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

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

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    let url = req.originalUrl;

    // Sanitize the URL to prevent XSS attacks
    try {
      // Validate and sanitize the URL
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Invalid URL' });
      }

      // Remove any potential script injections from the URL
      url = url.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      url = url.replace(/javascript:/gi, '');
      url = url.replace(/on\w+\s*=/gi, '');
      url = url.replace(/data:text\/html/gi, '');
      url = url.replace(/vbscript:/gi, '');
      url = url.replace(/onload/gi, '');
      url = url.replace(/onerror/gi, '');
      url = url.replace(/onclick/gi, '');
      url = url.replace(/onmouseover/gi, '');
      url = url.replace(/onfocus/gi, '');
      url = url.replace(/onblur/gi, '');

      // Ensure the URL starts with a safe character
      if (!url.startsWith('/') && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = '/' + url;
      }

      // Limit URL length to prevent DoS attacks
      if (url.length > 2048) {
        return res.status(414).json({ error: 'URL too long' });
      }

      // Log suspicious URLs for monitoring
      if (url.includes('<') || url.includes('>') || url.includes('"') || url.includes("'")) {
        log(`Suspicious URL detected: ${url}`, 'security');
      }

    } catch (error) {
      log(`Error sanitizing URL: ${error}`, 'security');
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
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
