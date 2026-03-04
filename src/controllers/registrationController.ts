import { Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../lib/AppError";
import { catchAsync } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";

// ── POST /api/v1/registrations/submit ─────────────────────────────────────
// This is exactly what App.jsx calls from RegistrationPage
export const submitRegistration = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { conferenceId, committeePreferences, customFieldData } = req.body;

  if (!conferenceId)
    return next(new AppError("conferenceId is required.", 400));

  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    include: { _count: { select: { registrations: true } } },
  });

  if (!conference) return next(new AppError("Conference not found.", 404));
  if (!conference.isOpen) return next(new AppError("This conference is not accepting registrations.", 400));

  if (conference.maxDelegates && conference._count.registrations >= conference.maxDelegates)
    return next(new AppError("This conference is full.", 400));

  const registration = await prisma.registration.create({
    data: {
      userId: req.user!.id,
      conferenceId,
      committeePreferences: committeePreferences ?? [],
      customFieldData: customFieldData ?? {},
      status: "PENDING",
    },
  });

  // Push an in-app notification to the delegate
  await prisma.notification.create({
    data: {
      userId: req.user!.id,
      type: "REGISTRATION",
      icon: "🎉",
      title: `Registered for ${conference.title}!`,
      body: `Your registration is confirmed. Committee assignment will be sent soon.`,
    },
  });

  res.status(201).json({ success: true, data: { registration } });
});

// ── GET /api/v1/registrations/my ──────────────────────────────────────────
export const getMyRegistrations = catchAsync(async (req: AuthRequest, res: Response) => {
  const registrations = await prisma.registration.findMany({
    where: { userId: req.user!.id },
    include: {
      conference: {
        select: { id: true, title: true, startDate: true, endDate: true, city: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: { registrations } });
});

// ── GET /api/v1/conferences/:id/registrations  (admin) ────────────────────
export const getConferenceRegistrations = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const conference = await prisma.conference.findUnique({ where: { id: req.params.id } });
  if (!conference) return next(new AppError("Conference not found.", 404));
  if (conference.adminId !== req.user!.id)
    return next(new AppError("You can only view registrations for your own conferences.", 403));

  const registrations = await prisma.registration.findMany({
    where: { conferenceId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  res.json({ success: true, data: { registrations } });
});

// ── PATCH /api/v1/registrations/:id/status  (admin) ───────────────────────
export const updateRegistrationStatus = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { status } = req.body;
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status))
    return next(new AppError("Status must be APPROVED, REJECTED, or PENDING.", 400));

  const registration = await prisma.registration.findUnique({
    where: { id: req.params.id },
    include: { conference: true, user: true },
  });

  if (!registration) return next(new AppError("Registration not found.", 404));
  if (registration.conference.adminId !== req.user!.id)
    return next(new AppError("You can only manage registrations for your own conferences.", 403));

  const updated = await prisma.registration.update({
    where: { id: req.params.id },
    data: { status },
  });

  // Notify the delegate
  await prisma.notification.create({
    data: {
      userId: registration.userId,
      type: status === "APPROVED" ? "SUCCESS" : "WARNING",
      icon: status === "APPROVED" ? "✅" : "❌",
      title: `Registration ${status === "APPROVED" ? "Approved" : "Rejected"}`,
      body: `Your registration for ${registration.conference.title} has been ${status.toLowerCase()}.`,
    },
  });

  res.json({ success: true, data: { registration: updated } });
});