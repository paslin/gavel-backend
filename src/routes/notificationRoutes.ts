// ── notificationRoutes.ts ─────────────────────────────────────────────────
import { Router } from "express";
import { getNotifications, markRead } from "../controllers/notificationController";
import { authenticate } from "../middleware/auth";

const router = Router();
router.get("/", authenticate, getNotifications);
router.post("/mark-read", authenticate, markRead);
export default router;