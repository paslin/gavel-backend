import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import prisma from "./lib/prisma";
import { errorHandler } from "./middleware/errorHandler";
import { AppError } from "./lib/AppError";

import authRoutes from "./routes/authRoutes";
import conferenceRoutes from "./routes/conferenceRoutes";
import registrationRoutes from "./routes/registrationRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import userRoutes from "./routes/userRoutes";

// ── Validate required env vars ─────────────────────────────────────────────
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET"];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  process.env.NODE_ENV === "development"
    ? morgan("dev")
    : morgan("combined")
);

// ── Health Check ───────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── DB Test Route ──────────────────────────────────────────────────────────
app.get("/test-db", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "DB connected ✅" });
  } catch (err) {
    next(err);
  }
});

// ── API v1 Routes ──────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/conferences", conferenceRoutes);
app.use("/api/v1/registrations", registrationRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/users", userRoutes);

// ── Root ───────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    message: "Gavel API v1",
    docs: "/api/v1",
  });
});

// ── 404 Handler ────────────────────────────────────────────────────────────
app.all("*", (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.originalUrl} not found.`, 404));
});

// ── Global Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// ── Graceful Shutdown ──────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`\n${signal} — shutting down...`);
  await prisma.$disconnect();
  server.close(() => {
    console.log("✅ Server closed.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  shutdown("unhandledRejection");
});