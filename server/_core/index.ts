import "dotenv/config";
import { validateEnv } from "./validateEnv";
import express from "express";
import { createServer } from "http";
import net from "net";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import restApiMiddleware from "./restApiMiddleware";
import uploadRoute from "../uploadRoute";
import emailAttachmentRouter from "../routes/emailAttachmentRouter";
import path from "path";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  validateEnv();
  const app = express();
app.set("trust proxy", 1); // trust first proxy (nginx/caddy);
  const server = createServer(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Cookie parser for reading session cookies
  app.use(cookieParser());

  // Serve uploaded files statically
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));


  // Email attachment upload routes (BEFORE tRPC)
  app.use("/api/email-attachment", emailAttachmentRouter);

  // Upload and download routes (before tRPC to avoid conflicts)
  app.use("/api/upload", uploadRoute);
  app.use("/api/download", uploadRoute);
  app.use("/api/email-archive", uploadRoute);

  // CRITICAL FIX: tRPC MUST come BEFORE generic /api middleware
  // Otherwise /api/* catches /api/trpc/* requests!
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // REST API routes (AFTER tRPC to avoid conflicts)
  app.use("/api", restApiMiddleware);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
