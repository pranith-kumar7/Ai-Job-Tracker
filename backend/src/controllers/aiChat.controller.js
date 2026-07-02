import { z } from "zod";
import {
  clearChat,
  getChat,
  listChats,
  regenerateLastResponse,
  sendChatMessage,
} from "../services/aiChat.service.js";
import { recordAiUsage } from "../services/aiUsage.service.js";

const chatMessageSchema = z.object({
  conversationId: z.string().trim().optional(),
  message: z.string().trim().min(1).max(8000),
});

const createUsageRecorder = (req) => (usagePayload) =>
  recordAiUsage(req.user?.id, usagePayload);

export const listChatsController = async (req, res) => {
  try {
    const conversations = await listChats(req.user.id);
    return res.json({ conversations });
  } catch {
    return res.status(500).json({ message: "AI chats could not be loaded" });
  }
};

export const getChatController = async (req, res) => {
  try {
    const conversation = await getChat(req.user.id, req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: "AI chat not found" });
    }

    return res.json({ conversation });
  } catch {
    return res.status(500).json({ message: "AI chat could not be loaded" });
  }
};

export const sendChatMessageController = async (req, res) => {
  try {
    const payload = chatMessageSchema.parse(req.body);
    const conversation = await sendChatMessage({
      userId: req.user.id,
      chatId: payload.conversationId,
      message: payload.message,
      onUsage: createUsageRecorder(req),
    });

    return res.json({ conversation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message ?? "Invalid input" });
    }

    return res.status(500).json({ message: "AI chat failed" });
  }
};

export const regenerateChatController = async (req, res) => {
  try {
    const conversation = await regenerateLastResponse({
      userId: req.user.id,
      chatId: req.params.id,
      onUsage: createUsageRecorder(req),
    });

    if (!conversation) {
      return res.status(404).json({ message: "AI chat not found" });
    }

    return res.json({ conversation });
  } catch {
    return res.status(500).json({ message: "AI response could not be regenerated" });
  }
};

export const clearChatController = async (req, res) => {
  try {
    const conversation = await clearChat(req.user.id, req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: "AI chat not found" });
    }

    return res.json({ conversation });
  } catch {
    return res.status(500).json({ message: "AI chat could not be cleared" });
  }
};
