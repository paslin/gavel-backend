import { Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../lib/AppError";
import { catchAsync } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";

// ── GET /api/v1/conferences ────────────────────────────────────────────────
export const getAllConferences = catchAsync(async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const upcoming = req.query.upcoming === "true";

  const conferences = await prisma.conference.findMany({
    where: {
      isPublished: true,
      ...(upcoming ? { endDate: { gte: new Date() } } : {}),
    },
    include: {
      admin: { select: { id: true, name: true, email: true } },
      committees: { select: { id: true, name: true, type: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: { startDate: "asc" },
    take: limit,
  });

  // Shape response to match exactly what App.jsx expects
  const shaped = conferences.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    city: c.city,
    country: c.country,
    startDate: c.startDate,
    endDate: c.endDate,
    isFree: c.isFree,
    baseFee: c.baseFee,
    bannerUrl: c.bannerUrl,
    logoUrl: c.logoUrl,
    maxDelegates: c.maxDelegates,
    isOpen: c.isOpen,
    host: { id: c.admin.id, name: c.admin.name },
    committees: c.committees,
    _count: { registrations: c._count.registrations },
  }));

  res.json({ success: true, data: { conferences: shaped } });
});

// ── GET /api/v1/conferences/:id ────────────────────────────────────────────
export const getConference = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const conference = await prisma.conference.findUnique({
    where: { id: req.params.id },
    include: {
      admin: { select: { id: true, name: true, email: true } },
      committees: true,
      _count: { select: { registrations: true } },
    },
  });

  if (!conference) return next(new AppError("Conference not found.", 404));

  res.json({ success: true, data: { conference } });
});

// ── POST /api/v1/conferences ───────────────────────────────────────────────
export const createConference = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const {
    title, description, city, country, venue,
    startDate, endDate, registrationDeadline,
    isFree, baseFee, maxDelegates,
    bannerUrl, logoUrl, website, isPublished,
    committees,
  } = req.body;

  if (!title || !startDate || !endDate)
    return next(new AppError("Title, startDate, and endDate are required.", 400));

  const conference = await prisma.conference.create({
    data: {
      title, description, city, country, venue,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
      isFree: isFree ?? true,
      baseFee: baseFee ?? 0,
      maxDelegates,
      bannerUrl, logoUrl, website,
      isPublished: isPublished ?? false,
      adminId: req.user!.id,
      committees: committees?.length
        ? { create: committees.map((c: any) => ({ name: c.name, type: c.type, agenda: c.agenda, description: c.description, spots: c.spots })) }
        : undefined,
    },
    include: {
      committees: true,
      admin: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
    },
  });

  res.status(201).json({ success: true, data: { conference } });
});

// ── PATCH /api/v1/conferences/:id ─────────────────────────────────────────
export const updateConference = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const conference = await prisma.conference.findUnique({ where: { id: req.params.id } });

  if (!conference) return next(new AppError("Conference not found.", 404));
  if (conference.adminId !== req.user!.id)
    return next(new AppError("You can only edit your own conferences.", 403));

  const updated = await prisma.conference.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json({ success: true, data: { conference: updated } });
});

// ── POST /api/v1/conferences/:id/publish ──────────────────────────────────
export const publishConference = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const conference = await prisma.conference.findUnique({ where: { id: req.params.id } });

  if (!conference) return next(new AppError("Conference not found.", 404));
  if (conference.adminId !== req.user!.id)
    return next(new AppError("You can only publish your own conferences.", 403));

  const updated = await prisma.conference.update({
    where: { id: req.params.id },
    data: { isPublished: true },
  });

  res.json({ success: true, data: { conference: updated } });
});