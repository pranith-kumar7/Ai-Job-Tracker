import { Router } from "express";
import { parseJD, getSuggestions, streamSuggestions } from "../controllers/ai.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/parse", authMiddleware, parseJD);
router.post("/suggestions", authMiddleware, getSuggestions);
router.post("/suggestions/stream", authMiddleware, streamSuggestions);

export default router;
