// ── registrationRoutes.ts ─────────────────────────────────────────────────
import { Router } from "express";
import { submitRegistration, getMyRegistrations } from "../controllers/registrationController";
import { authenticate } from "../middleware/auth";

const router = Router();
router.post("/submit", authenticate, submitRegistration);  // matches App.jsx exactly
router.get("/my", authenticate, getMyRegistrations);
export default router;