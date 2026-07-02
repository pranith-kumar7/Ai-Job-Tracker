import { Router } from "express";
import {
  analyzeJobAgentController,
  analyzeResumeController,
  evaluateInterviewAnswerController,
  generateCoverLettersController,
  generateInterviewPrepController,
  matchResumeController,
  optimizeResumeController,
} from "../controllers/aiCareer.controller.js";
import {
  clearChatController,
  getChatController,
  listChatsController,
  regenerateChatController,
  sendChatMessageController,
} from "../controllers/aiChat.controller.js";
import {
  parseJD,
  getSuggestions,
  streamSuggestions,
  getUsageSummary,
} from "../controllers/ai.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { aiInputGuard, aiRateLimiter } from "../middleware/aiSafety.middleware.js";
import { resumeUpload } from "../middleware/upload.middleware.js";

const router = Router();

router.use(authMiddleware);
router.use(aiRateLimiter);

router.get("/usage", getUsageSummary);
router.post("/parse", aiInputGuard, parseJD);
router.post("/suggestions", aiInputGuard, getSuggestions);
router.post("/suggestions/stream", aiInputGuard, streamSuggestions);

router.post(
  "/resume/analyze",
  resumeUpload.single("resume"),
  aiInputGuard,
  analyzeResumeController
);
router.post(
  "/resume/match",
  resumeUpload.single("resume"),
  aiInputGuard,
  matchResumeController
);
router.post(
  "/resume/optimize",
  resumeUpload.single("resume"),
  aiInputGuard,
  optimizeResumeController
);
router.post(
  "/cover-letter",
  resumeUpload.single("resume"),
  aiInputGuard,
  generateCoverLettersController
);
router.post(
  "/interview/prep",
  resumeUpload.single("resume"),
  aiInputGuard,
  generateInterviewPrepController
);
router.post(
  "/interview/evaluate",
  aiInputGuard,
  evaluateInterviewAnswerController
);
router.post(
  "/agent/analyze-job",
  resumeUpload.single("resume"),
  aiInputGuard,
  analyzeJobAgentController
);

router.get("/chat", listChatsController);
router.get("/chat/:id", getChatController);
router.post("/chat", aiInputGuard, sendChatMessageController);
router.post("/chat/:id/regenerate", regenerateChatController);
router.delete("/chat/:id/messages", clearChatController);

export default router;
