import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { EnvironmentService } from "./services/EnvironmentService";
import { RedisService } from "./services/RedisService";
import { TaskSchedulerService } from "./services/TaskSchedulerService";

// Initialize environment configuration
EnvironmentService.initialize();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize enterprise services
async function initializeServices() {
  try {
    // Initialize Redis if configured
    if (EnvironmentService.isServiceConfigured('Redis')) {
      await RedisService.initialize();
    }

    // Initialize task scheduler
    await TaskSchedulerService.initialize();

    console.log('[SERVICES] Enterprise services initialized successfully');
  } catch (error) {
    console.error('[SERVICES] Service initialization error:', error);
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize AI systems
  try {
    const { AutoResponderEngine } = await import('./services/AutoResponderEngine');
    AutoResponderEngine.initialize();
    
    const { DigestScheduler } = await import('./schedulers/DigestScheduler');
    DigestScheduler.start();
    
    console.log('[PHASE 5.5] AI Digest & Auto-Responder systems initialized');
  } catch (error) {
    console.error('[PHASE 5.5] Failed to initialize AI systems:', error);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
