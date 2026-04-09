import { Router } from "express";
import {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  updateStatus,
  deleteApplication,
} from "../controllers/application.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, createApplication);
router.get("/", authMiddleware, getApplications);
router.get("/:id", authMiddleware, getApplicationById);
router.patch("/:id", authMiddleware, updateApplication);
router.patch("/:id/status", authMiddleware, updateStatus);
router.delete("/:id", authMiddleware, deleteApplication);

export default router;
