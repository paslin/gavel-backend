// ── userRoutes.ts ─────────────────────────────────────────────────────────
import { Router } from "express";
import { getUserProfile, updateMe, addAward, addPastConference } from "../controllers/userController";
import { authenticate } from "../middleware/auth";

const router = Router();
router.get("/:uid/profile", authenticate, getUserProfile);
router.patch("/me", authenticate, updateMe);
router.post("/me/awards", authenticate, addAward);
router.post("/me/past-conferences", authenticate, addPastConference);
export default router;