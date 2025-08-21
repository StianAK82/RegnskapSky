import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api")) {
      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Serve the built frontend
  const distPath = path.resolve(process.cwd(), "dist/public");
  
  // Check if the build exists
  if (require('fs').existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    // Fallback when no build exists
    app.use("*", (_req, res) => {
      res.send(`
        <html>
          <head>
            <title>Zaldo CRM</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .status { color: #28a745; font-weight: bold; }
              .error { color: #dc3545; }
              a { color: #007bff; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🚀 Zaldo CRM</h1>
              <p class="status">✅ API Server is running successfully!</p>
              <p>The backend is working but the frontend build is missing.</p>
              <h3>Available API Endpoints:</h3>
              <ul>
                <li><a href="/api/auth/register">POST /api/auth/register</a> - User registration</li>
                <li><a href="/api/auth/login">POST /api/auth/login</a> - User login</li>
                <li><a href="/api/users">GET /api/users</a> - Get users (authenticated)</li>
                <li><a href="/api/clients">GET /api/clients</a> - Get clients (authenticated)</li>
                <li><a href="/api/tasks">GET /api/tasks</a> - Get tasks (authenticated)</li>
              </ul>
              <p>To get the full application running, build the frontend with: <code>vite build</code></p>
            </div>
          </body>
        </html>
      `);
    });
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    console.log(`Server running on port ${port}`);
  });
})();