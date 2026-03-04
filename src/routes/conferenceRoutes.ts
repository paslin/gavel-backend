// ── conferenceRoutes.ts ────────────────────────────────────────────────────
import { Router } from "express";
import {
  getAllConferences, getConference,
  createConference, updateConference, publishConference,
} from "../controllers/conferenceController";
import { getConferenceRegistrations, updateRegistrationStatus } from "../controllers/registrationController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.get("/", getAllConferences);
router.get("/:id", getConference);
router.post("/", authenticate, createConference);          // any logged-in user can create
router.patch("/:id", authenticate, updateConference);
router.post("/:id/publish", authenticate, publishConference);
router.get("/:id/registrations", authenticate, getConferenceRegistrations);
router.patch("/:id/registrations/:regId/status", authenticate, updateRegistrationStatus);
export default router;