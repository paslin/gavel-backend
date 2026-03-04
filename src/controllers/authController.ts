import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../lib/prisma";
import { AppError } from "../lib/AppError";
import { catchAsync } from "../middleware/errorHandler";

// ── Token helpers ──────────────────────────────────────────────────────────
function signAccessToken(payload: { id: string; email: string; role: string }) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "15m",
  } as jwt.SignOptions);
}

function signRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/v1/auth/refresh",
  });
}

// ── POST /api/v1/auth/register ─────────────────────────────────────────────
export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return next(new AppError("Name, email, and password are required.", 400));
  if (password.length < 6)
    return next(new AppError("Password must be at least 6 characters.", 400));

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return next(new AppError("Email is already registered.", 409));

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: "DELEGATE" },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true },
  });

  const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    data: { user, accessToken },
  });
});

// ── POST /api/v1/auth/login ────────────────────────────────────────────────
export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new AppError("Email and password are required.", 400));

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return next(new AppError("Invalid email or password.", 401));

  const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  setRefreshCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
      accessToken,
    },
  });
});

// ── POST /api/v1/auth/refresh ──────────────────────────────────────────────
export const refresh = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.refreshToken;
  if (!token) return next(new AppError("No refresh token.", 401));

  const stored = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, role: true, avatarUrl: true } } },
  });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { token } });
    return next(new AppError("Session expired. Please log in again.", 401));
  }

  // Rotate refresh token
  await prisma.refreshToken.delete({ where: { token } });
  const newRefresh = signRefreshToken();
  await prisma.refreshToken.create({
    data: {
      token: newRefresh,
      userId: stored.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  setRefreshCookie(res, newRefresh);

  const accessToken = signAccessToken({
    id: stored.user.id,
    email: stored.user.email,
    role: stored.user.role,
  });

  res.json({ success: true, data: { accessToken } });
});

// ── POST /api/v1/auth/logout ───────────────────────────────────────────────
export const logout = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
  }
  res.clearCookie("refreshToken", { path: "/api/v1/auth/refresh" });
  res.json({ success: true, data: null });
});

// ── GET /api/v1/auth/me ────────────────────────────────────────────────────
export const getMe = catchAsync(async (req: any, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, bio: true, school: true, country: true, phone: true, avatarUrl: true, experienceLevel: true, createdAt: true },
  });
  res.json({ success: true, data: { user } });
});