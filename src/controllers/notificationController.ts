import { Response } from "express";
import prisma from "../lib/prisma";
import { catchAsync } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";

// ── GET /api/v1/notifications ──────────────────────────────────────────────
export const getNotifications = catchAsync(async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;

  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Shape to match what App.jsx expects: { id, icon, title, body, read, time }
  const shaped = notifications.map(n => ({
    id: n.id,
    icon: n.icon ?? "🔔",
    title: n.title,
    body: n.body,
    read: n.read,
    time: n.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    createdAt: n.createdAt,
  }));

  res.json({ success: true, data: { notifications: shaped } });
});

// ── POST /api/v1/notifications/mark-read ──────────────────────────────────
// App.jsx calls this with { ids } — if ids is empty/undefined, mark ALL read
export const markRead = catchAsync(async (req: AuthRequest, res: Response) => {
  const { ids } = req.body;

  await prisma.notification.updateMany({
    where: {
      userId: req.user!.id,
      ...(ids?.length ? { id: { in: ids } } : {}),
    },
    data: { read: true },
  });

  res.json({ success: true, data: null });
});