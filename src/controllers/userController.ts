import { Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../lib/AppError";
import { catchAsync } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";

// ── GET /api/v1/users/:uid/profile ────────────────────────────────────────
export const getUserProfile = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.uid },
    select: {
      id: true, name: true, email: true, role: true,
      bio: true, school: true, country: true, avatarUrl: true,
      awards: true,
      pastConferences: true,
    },
  });

  if (!user) return next(new AppError("User not found.", 404));

  res.json({ success: true, data: { user, awards: user.awards, pastConferences: user.pastConferences } });
});

// ── PATCH /api/v1/users/me ────────────────────────────────────────────────
export const updateMe = catchAsync(async (req: AuthRequest, res: Response) => {
const { name, bio, school, country, phone, experienceLevel, avatarUrl, instagram } = req.body;

const user = await prisma.user.update({
  where: { id: req.user!.id },
  data: {
    ...(name !== undefined && { name }),
    ...(bio !== undefined && { bio }),
    ...(school !== undefined && { school }),
    ...(country !== undefined && { country }),
    ...(phone !== undefined && { phone }),
    ...(experienceLevel !== undefined && { experienceLevel }),
    ...(avatarUrl !== undefined && { avatarUrl }),
    ...(instagram !== undefined && { instagram }),
  },
    select: { id: true, name: true, email: true, role: true, bio: true, school: true, country: true, phone: true, avatarUrl: true, experienceLevel: true, instagram: true },
  });

  res.json({ success: true, data: { user } });
});

// ── POST /api/v1/users/me/awards ──────────────────────────────────────────
export const addAward = catchAsync(async (req: AuthRequest, res: Response) => {
  const { award, conf, committee, emoji } = req.body;

  const created = await prisma.award.create({
    data: {
      userId: req.user!.id,
      award: award ?? "",
      conf,
      committee,
      emoji: emoji ?? "🏅",
    },
  });

  res.status(201).json({ success: true, data: { award: created } });
});

// ── POST /api/v1/users/me/past-conferences ────────────────────────────────
export const addPastConference = catchAsync(async (req: AuthRequest, res: Response) => {
  const { name, conf, role } = req.body;

  const created = await prisma.pastConference.create({
    data: {
      userId: req.user!.id,
      name: name ?? "",
      conf,
      role,
    },
  });

  res.status(201).json({ success: true, data: { pastConference: created } });
});